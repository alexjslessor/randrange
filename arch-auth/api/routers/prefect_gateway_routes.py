from __future__ import annotations
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.deps import (
    Principal,
    get_current_principal,
    require_superuser_or_group_admin,
)
from api.auth.prefect_client import PrefectProxyError, prefect_client
from api.models import PrefectDeploymentView
from api.auth.service import resource_permission_service
from api.db import get_db
from api.settings import get_settings

DEPLOYMENT_READ_PERMISSION_CODES = {"deployment:read", "deployment:run"}
DEPLOYMENT_RUN_PERMISSION_CODES = {"deployment:run"}

settings = get_settings()
router = APIRouter()


DynamicPrefectResponseList = list[dict[str, Any]]
DynamicPrefectResponseDict = dict[str, Any]

def _raise_prefect_error(exc: PrefectProxyError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


def _empty_paginated_deployments(payload: dict) -> dict:
    page = payload.get("page", 1)
    limit = payload.get("limit", 0)
    return {"results": [], "count": 0, "pages": 0, "page": page, "limit": limit}

async def _get_readable_deployment_ids(db: AsyncSession, principal: Principal) -> set[str]:
    return await resource_permission_service.get_allowed_deployment_ids(
        db,
        kc_user_sub=principal.user_id,
        kc_group_ids=principal.groups,
        required_permission_codes=DEPLOYMENT_READ_PERMISSION_CODES,
    )


async def _get_runnable_deployment_ids(db: AsyncSession, principal: Principal) -> set[str]:
    return await resource_permission_service.get_allowed_deployment_ids(
        db,
        kc_user_sub=principal.user_id,
        kc_group_ids=principal.groups,
        required_permission_codes=DEPLOYMENT_RUN_PERMISSION_CODES,
    )


def _apply_deployment_scope(payload: dict, allowed_ids: set[str]) -> dict:
    scoped_payload = dict(payload)
    deployments_filter = scoped_payload.get("deployments")
    if not isinstance(deployments_filter, dict):
        deployments_filter = {}
    else:
        deployments_filter = dict(deployments_filter)

    id_filter = deployments_filter.get("id")
    requested_ids: set[str] | None = None
    if isinstance(id_filter, dict):
        any_ids = id_filter.get("any_")
        if isinstance(any_ids, list):
            requested_ids = {str(item) for item in any_ids if isinstance(item, (str, int))}

    effective_ids = allowed_ids if requested_ids is None else allowed_ids.intersection(requested_ids)
    deployments_filter["id"] = {"any_": sorted(effective_ids)}
    scoped_payload["deployments"] = deployments_filter
    return scoped_payload

# scheduler page
def _scope_requested_deployment_ids(payload: dict, allowed_ids: set[str]) -> list[str]:
    requested = payload.get("deployment_ids")
    if not isinstance(requested, list):
        return []

    requested_ids = {
        str(item)
        for item in requested
        if isinstance(item, (str, int))
    }
    return sorted(allowed_ids.intersection(requested_ids))


def _extract_requested_deployment_ids(payload: dict) -> set[str]:
    requested = payload.get("deployment_ids")
    if not isinstance(requested, list):
        return set()

    return {
        str(item)
        for item in requested
        if isinstance(item, (str, int))
    }


def _extract_requested_log_flow_run_ids(payload: dict) -> set[str]:
    logs_filter = payload.get("logs")
    if not isinstance(logs_filter, dict):
        return set()

    flow_run_id_filter = logs_filter.get("flow_run_id")
    if not isinstance(flow_run_id_filter, dict):
        return set()

    any_ids = flow_run_id_filter.get("any_")
    if not isinstance(any_ids, list):
        return set()

    return {
        str(item).strip()
        for item in any_ids
        if isinstance(item, (str, int)) and str(item).strip()
    }


def _apply_log_flow_run_scope(payload: dict, flow_run_ids: set[str]) -> dict:
    scoped_payload = dict(payload)
    logs_filter = scoped_payload.get("logs")
    if not isinstance(logs_filter, dict):
        logs_filter = {}
    else:
        logs_filter = dict(logs_filter)

    logs_filter["flow_run_id"] = {"any_": sorted(flow_run_ids)}
    scoped_payload["logs"] = logs_filter
    return scoped_payload


async def _resolve_allowed_log_flow_run_ids(
    payload: dict,
    allowed_deployment_ids: set[str],
) -> set[str]:

    requested_flow_run_ids = _extract_requested_log_flow_run_ids(payload)
    if not requested_flow_run_ids:
        return set()

    rows = await prefect_client.filter_flow_runs(
        {
            "flow_runs": {
                "id": {"any_": sorted(requested_flow_run_ids)},
                "deployment_id": {"any_": sorted(allowed_deployment_ids)},
            },
            "limit": max(200, len(requested_flow_run_ids)),
        }
    )
    return {
        str(row.get("id"))
        for row in rows
        if isinstance(row, dict) and row.get("id")
    }


@router.post(
    "/deployments/paginate",
    response_model=DynamicPrefectResponseDict,
)
async def paginate_deployments(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    try:
        if principal.is_superuser:
            return await prefect_client.paginate_deployments(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return _empty_paginated_deployments(payload)

        scoped_payload = _apply_deployment_scope(payload, allowed_ids)
        id_filter = scoped_payload.get("deployments", {}).get("id", {}).get("any_", [])
        if not id_filter:
            return _empty_paginated_deployments(payload)
        return await prefect_client.paginate_deployments(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.get(
    "/deployments/scheduled-ids",
    response_model=list[str],
)
async def list_scheduled_deployment_ids(
    date: str = Query(..., description="YYYY-MM-DD"),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    try:
        deployment_ids = await prefect_client.list_scheduled_deployment_ids(date)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)

    if principal.is_superuser:
        return deployment_ids

    allowed_ids = await _get_readable_deployment_ids(db, principal)
    return [
        deployment_id for deployment_id in deployment_ids if deployment_id in allowed_ids
    ]


@router.post(
    "/deployments/runnable-ids",
    response_model=list[str],
)
async def list_runnable_deployment_ids(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    requested_ids = _extract_requested_deployment_ids(payload)
    if principal.is_superuser:
        return sorted(requested_ids)

    allowed_ids = await _get_runnable_deployment_ids(db, principal)
    if not requested_ids:
        return sorted(allowed_ids)
    return sorted(allowed_ids.intersection(requested_ids))


@router.get(
    "/deployments/{deployment_id}",
    response_model=DynamicPrefectResponseDict,
)
async def read_deployment(
    deployment_id: str,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    """Returns things like:
    - Deployment name
    - Tags
    - Work queue

    Args:
        deployment_id (str): _description_
        principal (Principal, optional): _description_. Defaults to Depends(get_current_principal).
        db (AsyncSession, optional): _description_. Defaults to Depends(get_db).

    Raises:
        HTTPException: error

    Returns:
        (dict): deployment metadata
    """
    if not principal.is_superuser:
        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if deployment_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="deployment_not_found")
    try:
        return await prefect_client.get_deployment(deployment_id)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.get(
    "/deployments/{deployment_id}/runs",
    response_model=DynamicPrefectResponseList,
)
async def list_deployment_runs(
    deployment_id: str,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
):
    if not principal.is_superuser:
        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if deployment_id not in allowed_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="deployment_not_found")
    try:
        return await prefect_client.list_deployment_flow_runs(
            deployment_id=deployment_id,
            limit=limit,
        )
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)



@router.post(
    "/deployments/{deployment_id}/create_flow_run",
    response_model=DynamicPrefectResponseDict,
)
async def create_deployment_flow_run(
    deployment_id: str,
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    if not principal.is_superuser:
        allowed_ids = await _get_runnable_deployment_ids(db, principal)
        if deployment_id not in allowed_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="deployment_not_found")

    try:
        return await prefect_client.create_flow_run(deployment_id, payload=payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/deployments/get_scheduled_flow_runs",
    response_model=DynamicPrefectResponseList,
)
async def get_scheduled_flow_runs_for_deployments(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    try:
        if principal.is_superuser:
            return await prefect_client.get_scheduled_flow_runs_for_deployments(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return []

        scoped_payload = dict(payload)
        scoped_ids = _scope_requested_deployment_ids(payload, allowed_ids)
        if not scoped_ids:
            return []

        scoped_payload["deployment_ids"] = scoped_ids
        return await prefect_client.get_scheduled_flow_runs_for_deployments(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/flow_runs/filter",
    response_model=DynamicPrefectResponseList,
)
async def filter_flow_runs(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    """
    - Exact start_time
    - end_time
    - total_run_time
    - state

    Filter by:
        - deployment_id
        - state = COMPLETED
        - time window

    Args:
        payload (dict, optional): _description_. Defaults to Body(default_factory=dict).
        principal (Principal, optional): _description_. Defaults to Depends(get_current_principal).
        db (AsyncSession, optional): _description_. Defaults to Depends(get_db).

    Returns:
        _type_: _description_
    """
    try:
        if principal.is_superuser:
            return await prefect_client.filter_flow_runs(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return []

        scoped_payload = _apply_deployment_scope(payload, allowed_ids)
        id_filter = scoped_payload.get("deployments", {}).get("id", {}).get("any_", [])
        if not id_filter:
            return []
        return await prefect_client.filter_flow_runs(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/flow_runs/count",
    response_model=int,
)
async def count_flow_runs(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    """
    Proxy Prefect's `POST /api/flow_runs/count`.

    Returns an integer count of flow runs matching the provided filters.

    FTE usage
    ---------
    Use this endpoint to quickly answer "how many runs completed in a time window?"
    without fetching all run records. Combined with your per-deployment FTE assumptions
    (stored in `deployment_fte`), you can estimate human time replaced:

    - `runs_completed` = result from this endpoint (filter to `state.type = COMPLETED`)
    - `human_time_per_run_minutes` = `avg_human_minutes_per_case * avg_cases_per_run`
    - `human_hours` = `runs_completed * human_time_per_run_minutes / 60`

    Pair the result with `POST /flow_runs/history` (sum of run time) to estimate bot
    runtime for the same window, then compute:

    - `hours_saved` = `human_hours - bot_hours`
    - `fte_saved` = `hours_saved / fte_hours_per_year`
    - `est_cost_avoided` = `hours_saved * analyst_hourly_cost`

    Notes
    -----
    - Non-superusers are automatically scoped to deployments they can read.
    - This endpoint only returns counts; use `/flow_runs/filter` if you need per-run detail.
    """
    try:
        if principal.is_superuser:
            return await prefect_client.count_flow_runs(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return 0

        scoped_payload = _apply_deployment_scope(payload, allowed_ids)
        id_filter = scoped_payload.get("deployments", {}).get("id", {}).get("any_", [])
        if not id_filter:
            return 0

        return await prefect_client.count_flow_runs(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/flow_runs/history",
    response_model=DynamicPrefectResponseList,
)
async def flow_run_history(
    payload: dict = Body(...),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    """
    Proxy Prefect's `POST /api/flow_runs/history`.

    Returns aggregated flow-run history buckets across a time range and interval.
    Each bucket contains per-state counts and `sum_estimated_run_time`.

    FTE usage
    ---------
    This endpoint is useful for computing bot runtime without pulling every run:

    1) Filter to the deployments and time window you care about.
    2) In the response, find the `states[]` entries where `state_type == "COMPLETED"`.
    3) Sum `sum_estimated_run_time` across buckets to get bot seconds for the window.

    Then combine that bot runtime with:
    - run counts from `POST /flow_runs/count` (or `count_runs` in history), and
    - your per-deployment FTE assumptions (`avg_human_minutes_per_case`, `avg_cases_per_run`,
        `analyst_hourly_cost`, `fte_hours_per_year`)

    to compute `total_hours_saved`, `fte_saved`, and `est_cost_avoided`.

    Notes
    -----
    - Prefect returns *estimated* run time aggregates here; if you need actual per-run
        `total_run_time`, use `/flow_runs/filter` and sum `total_run_time`.
    - Non-superusers are automatically scoped to deployments they can read.
    """
    try:
        if principal.is_superuser:
            return await prefect_client.flow_run_history(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return []

        scoped_payload = _apply_deployment_scope(payload, allowed_ids)
        id_filter = scoped_payload.get("deployments", {}).get("id", {}).get("any_", [])
        if not id_filter:
            return []

        return await prefect_client.flow_run_history(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/flow_runs/lateness",
    response_model=float | None,
)
async def average_flow_run_lateness(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    try:
        if principal.is_superuser:
            return await prefect_client.average_flow_run_lateness(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return None

        scoped_payload = _apply_deployment_scope(payload, allowed_ids)
        id_filter = scoped_payload.get("deployments", {}).get("id", {}).get("any_", [])
        if not id_filter:
            return None

        return await prefect_client.average_flow_run_lateness(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.post(
    "/logs/filter",
    response_model=DynamicPrefectResponseList,
)
async def filter_logs(
    payload: dict = Body(default_factory=dict),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
):
    try:
        if principal.is_superuser:
            return await prefect_client.filter_logs(payload)

        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return []

        scoped_flow_run_ids = await _resolve_allowed_log_flow_run_ids(
            payload, 
            allowed_ids,
        )
        if not scoped_flow_run_ids:
            return []

        scoped_payload = _apply_log_flow_run_scope(
            payload, 
            scoped_flow_run_ids,
        )
        return await prefect_client.filter_logs(scoped_payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)


@router.get(
    "/admin/prefect/deployments",
    response_model=list[PrefectDeploymentView],
)
async def list_prefect_deployments(
    _: Principal = Depends(require_superuser_or_group_admin),
    limit: int = Query(default=200, ge=1, le=200),
):
    try:
        rows = await prefect_client.list_deployments(limit=limit)
    except PrefectProxyError as e:
        _raise_prefect_error(e)

    payload = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("id"):
            continue
        payload.append(
            {
                "id": str(row.get("id")),
                "name": row.get("name"),
                "flow_id": row.get("flow_id"),
                "tags": row.get("tags") if isinstance(row.get("tags"), list) else [],
            }
        )
    return payload
