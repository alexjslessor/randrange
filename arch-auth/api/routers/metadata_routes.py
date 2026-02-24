from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.deps import (
    Principal,
    get_current_principal,
)
from api.auth.prefect_client import PrefectProxyError, prefect_client

from api.models import (
    FlowRunNote,
    FlowRunNoteUpsertRequest,
    FlowRunNoteView,
    DeploymentFte,
    DeploymentFteSnapshot,
    DeploymentFteUpsertRequest,
    DeploymentFteSummaryRow,
    DeploymentFteView,
)
from api.auth.service import resource_permission_service

DEPLOYMENT_READ_PERMISSION_CODES = {"deployment:read", "deployment:run"}
DEPLOYMENT_RUN_PERMISSION_CODES = {"deployment:run"}
from api.db import get_db, get_metadata_db
from api.settings import get_settings

settings = get_settings()
router = APIRouter()
prefect_router = APIRouter()
metadata_router = APIRouter()



def _raise_prefect_error(exc: PrefectProxyError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


_FTE_SUMMARY_WINDOWS = {"today", "week", "month", "year", "all"}


def _resolve_fte_summary_window(window: str) -> tuple[datetime | None, datetime | None]:
    normalized = (window or "").strip().lower()
    if normalized not in _FTE_SUMMARY_WINDOWS:
        raise ValueError("Invalid summary window")

    if normalized == "all":
        return None, None

    now = datetime.now(UTC)
    if normalized == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now

    if normalized == "week":
        start = (now - timedelta(days=now.weekday())).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return start, now

    if normalized == "month":
        start = now.replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return start, now

    if normalized == "year":
        start = now.replace(
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return start, now

    raise ValueError("Unsupported summary window")


def _safe_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


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


def _require_fte_admin(principal: Principal) -> None:
    if principal.is_superuser:
        return
    if principal.is_group_admin:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin privileges required",
    )


async def _ensure_deployment_access(
    deployment_id: str,
    principal: Principal,
    db: AsyncSession,
    for_run: bool = False,
) -> None:
    if principal.is_superuser:
        return

    if for_run:
        allowed_ids = await _get_runnable_deployment_ids(db, principal)
    else:
        allowed_ids = await _get_readable_deployment_ids(db, principal)
    if deployment_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="deployment_not_found",
        )


async def _resolve_flow_run_for_principal(
    flow_run_id: str,
    principal: Principal,
    db: AsyncSession,
) -> dict:
    try:
        flow_run_uuid = UUID(flow_run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid flow run id",
        ) from exc

    payload = {
        "flow_runs": {
            "id": {
                "any_": [str(flow_run_uuid)],
            },
        },
        "sort": "ID_DESC",
        "limit": 1,
    }
    if not principal.is_superuser:
        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="flow_run_not_found",
            )
        payload["deployments"] = {
            "id": {
                "any_": sorted(allowed_ids),
            },
        }

    try:
        rows = await prefect_client.filter_flow_runs(payload)
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="flow_run_not_found",
        )

    flow_run = rows[0] if isinstance(rows[0], dict) else None
    if flow_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="flow_run_not_found",
        )
    return flow_run



@metadata_router.get(
    "/metadata/deployments/{deployment_id}/fte",
    response_model=DeploymentFteView | None,
)
async def read_deployment_fte(
    deployment_id: str,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    metadata_db: AsyncSession = Depends(get_metadata_db),
):
    await _ensure_deployment_access(deployment_id, principal, db)
    try:
        deployment_uuid = UUID(deployment_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid deployment id",
        ) from exc

    result = await metadata_db.execute(
        select(DeploymentFte)
        .where(DeploymentFte.deployment_id == deployment_uuid)
        .limit(1)
    )
    return result.scalar_one_or_none()


@metadata_router.put(
    "/metadata/deployments/{deployment_id}/fte",
    response_model=DeploymentFteView,
)
async def upsert_deployment_fte(
    deployment_id: str,
    payload: DeploymentFteUpsertRequest,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    metadata_db: AsyncSession = Depends(get_metadata_db),
):
    await _ensure_deployment_access(deployment_id, principal, db)
    _require_fte_admin(principal)
    try:
        deployment_uuid = UUID(deployment_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid deployment id",
        ) from exc

    upsert_stmt = (
        pg_insert(DeploymentFte)
        .values(
            deployment_id=deployment_uuid,
            avg_human_minutes_per_case=payload.avg_human_minutes_per_case,
            avg_cases_per_run=payload.avg_cases_per_run,
            analyst_hourly_cost=payload.analyst_hourly_cost,
            fte_hours_per_year=payload.fte_hours_per_year,
            confidence_level=payload.confidence_level,
            description=payload.description,
            notes=payload.notes,
            is_active=payload.is_active,
            extra_metadata=payload.extra_metadata,
        )
        .on_conflict_do_update(
            index_elements=[DeploymentFte.deployment_id],
            set_={
                "avg_human_minutes_per_case": payload.avg_human_minutes_per_case,
                "avg_cases_per_run": payload.avg_cases_per_run,
                "analyst_hourly_cost": payload.analyst_hourly_cost,
                "fte_hours_per_year": payload.fte_hours_per_year,
                "confidence_level": payload.confidence_level,
                "description": payload.description,
                "notes": payload.notes,
                "is_active": payload.is_active,
                "extra_metadata": payload.extra_metadata,
                "updated_at": func.now(),
            },
        )
    )
    await metadata_db.execute(upsert_stmt)
    await metadata_db.commit()

    result = await metadata_db.execute(
        select(DeploymentFte)
        .where(DeploymentFte.deployment_id == deployment_uuid)
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load saved deployment FTE configuration",
        )
    return row


@metadata_router.get(
    "/metadata/fte/summary",
    response_model=list[DeploymentFteSummaryRow],
)
async def list_deployment_fte_summary(
    window: str = Query(
        default="month",
        description="today|week|month|year|all",
    ),
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    metadata_db: AsyncSession = Depends(get_metadata_db),
):
    try:
        window_start, window_end = _resolve_fte_summary_window(window)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid window. Use today, week, month, year, or all.",
        ) from exc

    allowed_ids: set[str] | None = None
    if not principal.is_superuser:
        allowed_ids = await _get_readable_deployment_ids(db, principal)
        if not allowed_ids:
            return []

    result = await metadata_db.execute(
        select(DeploymentFte)
        .where(DeploymentFte.is_active.is_(True))
    )
    fte_rows = result.scalars().all()

    fte_by_deployment_id: dict[str, DeploymentFte] = {}
    for row in fte_rows:
        deployment_id = str(row.deployment_id)
        if allowed_ids is not None and deployment_id not in allowed_ids:
            continue
        fte_by_deployment_id[deployment_id] = row

    deployment_ids = sorted(fte_by_deployment_id.keys())
    if not deployment_ids:
        return []

    deployment_uuid_by_id: dict[str, UUID] = {
        deployment_id: fte_by_deployment_id[deployment_id].deployment_id
        for deployment_id in deployment_ids
    }

    deployment_name_by_id: dict[str, str] = {}
    try:
        page = 1
        while True:
            data = await prefect_client.paginate_deployments(
                {
                    "page": page,
                    "limit": 200,
                    "sort": "NAME_ASC",
                    "deployments": {
                        "id": {"any_": deployment_ids},
                    },
                }
            )
            results = data.get("results", []) if isinstance(data, dict) else []
            if isinstance(results, list):
                for item in results:
                    if not isinstance(item, dict):
                        continue
                    deployment_id = item.get("id")
                    if not deployment_id:
                        continue
                    deployment_name_by_id[str(deployment_id)] = (
                        item.get("name")
                        or str(deployment_id)
                    )

            pages = data.get("pages") if isinstance(data, dict) else None
            if not isinstance(pages, int) or page >= pages:
                break
            page += 1
    except PrefectProxyError as exc:
        _raise_prefect_error(exc)

    snapshot_stmt = (
        select(
            DeploymentFteSnapshot.deployment_id.label("deployment_id"),
            func.count().label("runs_completed"),
            func.sum(DeploymentFteSnapshot.bot_run_time_seconds).label("bot_run_time_seconds"),
            func.sum(DeploymentFteSnapshot.human_minutes).label("human_minutes"),
            func.sum(DeploymentFteSnapshot.hours_saved).label("hours_saved"),
            func.sum(DeploymentFteSnapshot.fte_saved).label("fte_saved"),
            func.sum(DeploymentFteSnapshot.est_cost_avoided).label("est_cost_avoided"),
        )
        .where(
            DeploymentFteSnapshot.deployment_id.in_(
                [deployment_uuid_by_id[deployment_id] for deployment_id in deployment_ids]
            )
        )
        .where(DeploymentFteSnapshot.flow_run_state_type == "COMPLETED")
    )
    if window_start is not None and window_end is not None:
        snapshot_stmt = snapshot_stmt.where(
            DeploymentFteSnapshot.flow_run_end_time >= window_start
        ).where(
            DeploymentFteSnapshot.flow_run_end_time <= window_end
        )
    snapshot_stmt = snapshot_stmt.group_by(DeploymentFteSnapshot.deployment_id)

    snapshot_result = await metadata_db.execute(snapshot_stmt)
    snapshot_aggs = snapshot_result.mappings().all()
    snapshot_by_deployment_id: dict[str, dict] = {
        str(item.get("deployment_id")): dict(item)
        for item in snapshot_aggs
        if item.get("deployment_id")
    }

    summary: list[DeploymentFteSummaryRow] = []
    for deployment_id in deployment_ids:
        row = fte_by_deployment_id.get(deployment_id)
        if row is None:
            continue

        agg = snapshot_by_deployment_id.get(deployment_id) or {}

        runs_completed = int(agg.get("runs_completed") or 0)
        bot_total_minutes = (_safe_float(agg.get("bot_run_time_seconds")) or 0.0) / 60.0
        human_total_minutes = _safe_float(agg.get("human_minutes")) or 0.0

        if runs_completed > 0:
            human_time_per_run_minutes = human_total_minutes / runs_completed
        else:
            avg_human_minutes_per_case = _safe_float(row.avg_human_minutes_per_case) or 0.0
            avg_cases_per_run = _safe_float(row.avg_cases_per_run) or 1.0
            human_time_per_run_minutes = avg_human_minutes_per_case * avg_cases_per_run

        avg_bot_time_minutes = (
            bot_total_minutes / runs_completed
            if runs_completed > 0
            else None
        )

        total_hours_saved = _safe_float(agg.get("hours_saved"))
        if total_hours_saved is None:
            total_hours_saved = 0.0 if runs_completed == 0 else None

        fte_saved = _safe_float(agg.get("fte_saved"))
        if fte_saved is None:
            fte_saved = 0.0 if runs_completed == 0 else None

        est_cost_avoided = _safe_float(agg.get("est_cost_avoided"))
        if est_cost_avoided is None:
            est_cost_avoided = 0.0 if runs_completed == 0 else None

        summary.append(
            DeploymentFteSummaryRow(
                deployment_id=deployment_id,
                deployment_name=deployment_name_by_id.get(deployment_id) or deployment_id,
                runs_completed=runs_completed,
                human_time_per_run_minutes=human_time_per_run_minutes,
                avg_bot_time_minutes=avg_bot_time_minutes,
                total_hours_saved=total_hours_saved,
                fte_saved=fte_saved,
                est_cost_avoided=est_cost_avoided,
            )
        )

    summary.sort(
        key=lambda item: (
            item.total_hours_saved is None,
            -(item.total_hours_saved or 0.0),
        )
    )
    return summary


@metadata_router.get(
    "/metadata/flow_runs/{flow_run_id}/note",
    response_model=FlowRunNoteView | None,
)
async def read_flow_run_note(
    flow_run_id: str,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    metadata_db: AsyncSession = Depends(get_metadata_db),
):
    flow_run = await _resolve_flow_run_for_principal(flow_run_id, principal, db)
    resolved_flow_run_id = flow_run.get("id") or flow_run_id
    try:
        flow_run_uuid = UUID(str(resolved_flow_run_id))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid flow run id",
        ) from exc

    result = await metadata_db.execute(
        select(FlowRunNote)
        .where(FlowRunNote.flow_run_id == flow_run_uuid)
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row


@metadata_router.put(
    "/metadata/flow_runs/{flow_run_id}/note",
    response_model=FlowRunNoteView,
)
async def upsert_flow_run_note(
    flow_run_id: str,
    payload: FlowRunNoteUpsertRequest,
    principal: Principal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    metadata_db: AsyncSession = Depends(get_metadata_db),
):
    flow_run = await _resolve_flow_run_for_principal(
        flow_run_id, 
        principal, 
        db,
    )
    resolved_flow_run_id = flow_run.get("id") or flow_run_id
    deployment_id = flow_run.get("deployment_id")
    if not deployment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flow run is missing deployment id",
        )

    try:
        flow_run_uuid = UUID(str(resolved_flow_run_id))
        deployment_uuid = UUID(str(deployment_id))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid flow run or deployment id",
        ) from exc

    note_text = payload.note_text.strip()
    upsert_stmt = (
        pg_insert(FlowRunNote)
        .values(
            flow_run_id=flow_run_uuid,
            deployment_id=deployment_uuid,
            note_text=note_text,
            updated_by_user_id=principal.user_id,
            updated_by_username=principal.username,
        )
        .on_conflict_do_update(
            index_elements=[FlowRunNote.flow_run_id],
            set_={
                "deployment_id": deployment_uuid,
                "note_text": note_text,
                "updated_by_user_id": principal.user_id,
                "updated_by_username": principal.username,
                "updated_at": func.now(),
            },
        )
    )
    await metadata_db.execute(upsert_stmt)
    await metadata_db.commit()

    result = await metadata_db.execute(
        select(FlowRunNote)
        .where(FlowRunNote.flow_run_id == flow_run_uuid)
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load saved flow run note",
        )
    return row
