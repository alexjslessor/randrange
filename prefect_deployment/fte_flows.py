from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable
from urllib.parse import urlsplit

import httpx
from prefect import flow, get_run_logger
from sqlalchemy import bindparam, text as sql_text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


DEFAULT_METADATA_DB_URL = "postgresql+asyncpg://metadata:metadata@localhost:5432/metadata"
DEFAULT_PREFECT_API_URL = "http://localhost:4200/api"



def _parse_prefect_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    # Prefect returns RFC3339/ISO strings. Handle Z suffix for Python's fromisoformat.
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _safe_positive_decimal(value: Any) -> Decimal | None:
    decimal_value = _to_decimal(value)
    if decimal_value is None:
        return None
    if decimal_value <= 0:
        return None
    return decimal_value


def _safe_nonnegative_decimal(value: Any) -> Decimal:
    decimal_value = _to_decimal(value)
    if decimal_value is None or decimal_value < 0:
        return Decimal("0")
    return decimal_value


@dataclass(frozen=True)
class LogMetricExtractor:
    """
    Defines how to extract a numeric metric from Prefect logs.

    Expandability: add more extractors to `LOG_METRIC_EXTRACTORS` (and optionally new `query`
    strings) to pull additional metrics without changing the aggregation flow's structure.
    """

    key: str
    query: str
    pattern: re.Pattern[str]

    def extract(self, message: str) -> Decimal | None:
        match = self.pattern.search(message or "")
        if not match:
            return None
        return _safe_positive_decimal(match.group("value"))


LOG_METRIC_EXTRACTORS: list[LogMetricExtractor] = [
    LogMetricExtractor(
        key="fte_items",
        query="fte_items=",
        pattern=re.compile(r"(?:^|\\b)fte_items\\s*=\\s*(?P<value>\\d+(?:\\.\\d+)?)\\b"),
    ),
]


async def _prefect_post(
    client: httpx.AsyncClient,
    path: str,
    payload: dict[str, Any],
) -> Any:
    response = await client.post(path, json=payload)
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail: str
        try:
            data = response.json()
            detail = data.get("detail") if isinstance(data, dict) else str(data)
        except Exception:
            detail = response.text
        raise RuntimeError(f"Prefect API error {response.status_code}: {detail}") from exc
    return response.json()


def _create_metadata_engine(metadata_db_url: str) -> AsyncEngine:
    return create_async_engine(metadata_db_url, pool_pre_ping=True)


def _normalize_async_db_url(db_url: str) -> str:
    normalized = db_url.strip()
    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    return normalized


def _resolve_metadata_db_url(metadata_db_url: str | None) -> str:
    candidate = (
        metadata_db_url
        or os.getenv("METADATA_DATABASE_URL")
        or DEFAULT_METADATA_DB_URL
    )
    if not candidate.strip():
        candidate = DEFAULT_METADATA_DB_URL
    return _normalize_async_db_url(candidate)


def _resolve_prefect_api_url(prefect_api_url: str | None) -> str:
    candidate = prefect_api_url or os.getenv("PREFECT_API_URL") or DEFAULT_PREFECT_API_URL
    return candidate.rstrip("/")


def _describe_db_target(metadata_db_url: str) -> str:
    parsed = urlsplit(metadata_db_url)
    host = parsed.hostname or "unknown-host"
    port = parsed.port or 5432
    database = parsed.path.lstrip("/") or "unknown-db"
    return f"{host}:{port}/{database}"


async def _load_active_deployment_fte_configs(engine: AsyncEngine) -> dict[str, dict[str, Any]]:
    """
    Returns a mapping of deployment_id -> config values.

    Only includes rows where `deployment_fte.is_active = true`.
    """
    query = sql_text(
        """
        SELECT
          deployment_id,
          avg_human_minutes_per_case,
          avg_cases_per_run,
          analyst_hourly_cost,
          fte_hours_per_year
        FROM deployment_fte
        WHERE is_active = true
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        rows = result.mappings().all()

    configs: dict[str, dict[str, Any]] = {}
    for row in rows:
        deployment_id = str(row.get("deployment_id") or "").strip()
        if not deployment_id:
            continue
        configs[deployment_id] = dict(row)
    return configs


async def _load_existing_snapshot_flow_run_ids(
    engine: AsyncEngine,
    flow_run_ids: list[str],
) -> set[str]:
    if not flow_run_ids:
        return set()

    stmt = sql_text(
        """
        SELECT flow_run_id
        FROM deployment_fte_snapshot
        WHERE flow_run_id IN :flow_run_ids
        """
    ).bindparams(bindparam("flow_run_ids", expanding=True))

    async with engine.connect() as conn:
        result = await conn.execute(stmt, {"flow_run_ids": flow_run_ids})
        rows = result.fetchall()

    return {str(row[0]) for row in rows if row and row[0]}


async def _insert_snapshot_rows(
    engine: AsyncEngine,
    rows: list[dict[str, Any]],
    *,
    overwrite_existing: bool = False,
    dry_run: bool = False,
) -> int:
    if not rows:
        return 0
    if dry_run:
        return len(rows)

    if overwrite_existing:
        stmt = sql_text(
            """
            INSERT INTO deployment_fte_snapshot (
              flow_run_id,
              deployment_id,
              flow_run_start_time,
              flow_run_end_time,
              flow_run_state_type,
              bot_run_time_seconds,
              fte_items,
              fte_items_source,
              avg_human_minutes_per_case,
              avg_cases_per_run,
              analyst_hourly_cost,
              fte_hours_per_year,
              human_minutes,
              hours_saved,
              fte_saved,
              est_cost_avoided,
              extra_metadata
            )
            VALUES (
              :flow_run_id,
              :deployment_id,
              :flow_run_start_time,
              :flow_run_end_time,
              :flow_run_state_type,
              :bot_run_time_seconds,
              :fte_items,
              :fte_items_source,
              :avg_human_minutes_per_case,
              :avg_cases_per_run,
              :analyst_hourly_cost,
              :fte_hours_per_year,
              :human_minutes,
              :hours_saved,
              :fte_saved,
              :est_cost_avoided,
              CAST(:extra_metadata AS jsonb)
            )
            ON CONFLICT (flow_run_id) DO UPDATE SET
              deployment_id = EXCLUDED.deployment_id,
              flow_run_start_time = EXCLUDED.flow_run_start_time,
              flow_run_end_time = EXCLUDED.flow_run_end_time,
              flow_run_state_type = EXCLUDED.flow_run_state_type,
              bot_run_time_seconds = EXCLUDED.bot_run_time_seconds,
              fte_items = EXCLUDED.fte_items,
              fte_items_source = EXCLUDED.fte_items_source,
              avg_human_minutes_per_case = EXCLUDED.avg_human_minutes_per_case,
              avg_cases_per_run = EXCLUDED.avg_cases_per_run,
              analyst_hourly_cost = EXCLUDED.analyst_hourly_cost,
              fte_hours_per_year = EXCLUDED.fte_hours_per_year,
              human_minutes = EXCLUDED.human_minutes,
              hours_saved = EXCLUDED.hours_saved,
              fte_saved = EXCLUDED.fte_saved,
              est_cost_avoided = EXCLUDED.est_cost_avoided,
              extra_metadata = EXCLUDED.extra_metadata
            """
        )
    else:
        stmt = sql_text(
            """
            INSERT INTO deployment_fte_snapshot (
              flow_run_id,
              deployment_id,
              flow_run_start_time,
              flow_run_end_time,
              flow_run_state_type,
              bot_run_time_seconds,
              fte_items,
              fte_items_source,
              avg_human_minutes_per_case,
              avg_cases_per_run,
              analyst_hourly_cost,
              fte_hours_per_year,
              human_minutes,
              hours_saved,
              fte_saved,
              est_cost_avoided,
              extra_metadata
            )
            VALUES (
              :flow_run_id,
              :deployment_id,
              :flow_run_start_time,
              :flow_run_end_time,
              :flow_run_state_type,
              :bot_run_time_seconds,
              :fte_items,
              :fte_items_source,
              :avg_human_minutes_per_case,
              :avg_cases_per_run,
              :analyst_hourly_cost,
              :fte_hours_per_year,
              :human_minutes,
              :hours_saved,
              :fte_saved,
              :est_cost_avoided,
              CAST(:extra_metadata AS jsonb)
            )
            ON CONFLICT (flow_run_id) DO NOTHING
            """
        )

    async with engine.begin() as conn:
        await conn.execute(stmt, rows)

    return len(rows)


def _chunked(values: list[str], chunk_size: int) -> Iterable[list[str]]:
    for i in range(0, len(values), chunk_size):
        yield values[i : i + chunk_size]


async def _fetch_completed_flow_runs(
    client: httpx.AsyncClient,
    deployment_ids: list[str],
    *,
    window_start: datetime | None,
    window_end: datetime | None,
    page_limit: int = 200,
) -> list[dict[str, Any]]:
    offset = 0
    all_runs: list[dict[str, Any]] = []

    while True:
        flow_run_filters: dict[str, Any] = {
            "deployment_id": {"any_": deployment_ids},
            "state": {"type": {"any_": ["COMPLETED"]}},
        }
        if window_start is not None and window_end is not None:
            flow_run_filters["end_time"] = {
                "after_": window_start.isoformat(),
                "before_": window_end.isoformat(),
            }

        payload = {
            "flow_runs": flow_run_filters,
            "limit": page_limit,
            "offset": offset,
            "sort": "END_TIME_DESC",
        }
        data = await _prefect_post(client, "/flow_runs/filter", payload)
        rows = data if isinstance(data, list) else []
        if not rows:
            break

        all_runs.extend([row for row in rows if isinstance(row, dict)])
        if len(rows) < page_limit:
            break
        offset += page_limit

    return all_runs


async def _extract_log_metrics(
    client: httpx.AsyncClient,
    flow_run_ids: list[str],
    extractors: list[LogMetricExtractor],
    *,
    chunk_size: int = 200,
) -> tuple[dict[str, dict[str, Decimal]], dict[str, dict[str, Any]]]:
    """
    Returns:
        - metrics_by_flow_run_id: {flow_run_id: {metric_key: metric_value}}
        - audit_by_flow_run_id: {flow_run_id: {metric_key: {...audit...}}}
    """
    extractors_by_query: dict[str, list[LogMetricExtractor]] = {}
    for extractor in extractors:
        extractors_by_query.setdefault(extractor.query, []).append(extractor)

    metrics_by_flow_run_id: dict[str, dict[str, Decimal]] = {}
    audit_by_flow_run_id: dict[str, dict[str, Any]] = {}

    for query, grouped_extractors in extractors_by_query.items():
        for chunk in _chunked(flow_run_ids, chunk_size):
            payload = {
                "logs": {
                    "flow_run_id": {"any_": chunk},
                    "text": {"query": query},
                },
                "sort": "TIMESTAMP_DESC",
                "limit": 200,
                "offset": 0,
            }
            data = await _prefect_post(client, "/logs/filter", payload)
            logs = data if isinstance(data, list) else []

            for item in logs:
                if not isinstance(item, dict):
                    continue
                flow_run_id = str(item.get("flow_run_id") or "").strip()
                if not flow_run_id:
                    continue
                message = str(item.get("message") or "")
                for extractor in grouped_extractors:
                    if extractor.key in metrics_by_flow_run_id.get(flow_run_id, {}):
                        continue
                    value = extractor.extract(message)
                    if value is None:
                        continue
                    metrics_by_flow_run_id.setdefault(flow_run_id, {})[extractor.key] = value
                    audit_by_flow_run_id.setdefault(flow_run_id, {})[extractor.key] = {
                        "source": "LOG",
                        "log_id": item.get("id"),
                        "log_timestamp": item.get("timestamp"),
                        "log_query": query,
                    }

    return metrics_by_flow_run_id, audit_by_flow_run_id


def _build_snapshot_row(
    *,
    flow_run: dict[str, Any],
    config: dict[str, Any],
    log_metrics: dict[str, Decimal] | None,
    log_audit: dict[str, Any] | None,
) -> dict[str, Any] | None:
    flow_run_id = str(flow_run.get("id") or "").strip()
    deployment_id = str(flow_run.get("deployment_id") or "").strip()
    if not flow_run_id or not deployment_id:
        return None

    avg_human_minutes_per_case = _safe_positive_decimal(config.get("avg_human_minutes_per_case"))
    analyst_hourly_cost = _safe_nonnegative_decimal(config.get("analyst_hourly_cost"))
    fte_hours_per_year = int(config.get("fte_hours_per_year") or 2080)
    avg_cases_per_run = _safe_positive_decimal(config.get("avg_cases_per_run"))
    if avg_human_minutes_per_case is None:
        return None
    if fte_hours_per_year <= 0:
        return None

    bot_run_time_seconds = _safe_nonnegative_decimal(
        flow_run.get("total_run_time") if flow_run.get("total_run_time") is not None else flow_run.get("estimated_run_time")
    )

    extracted_fte_items = (log_metrics or {}).get("fte_items")
    if extracted_fte_items is not None:
        fte_items = extracted_fte_items
        fte_items_source = "LOG"
    elif avg_cases_per_run is not None:
        fte_items = avg_cases_per_run
        fte_items_source = "CONFIG"
    else:
        fte_items = Decimal("1")
        fte_items_source = "DEFAULT"

    human_minutes = (fte_items * avg_human_minutes_per_case).quantize(Decimal("0.01"))
    bot_minutes = (bot_run_time_seconds / Decimal("60")).quantize(Decimal("0.0001"))
    minutes_saved = human_minutes - bot_minutes
    hours_saved = (minutes_saved / Decimal("60")).quantize(Decimal("0.0001"))
    fte_saved = (hours_saved / Decimal(str(fte_hours_per_year))).quantize(Decimal("0.000001"))
    est_cost_avoided = (hours_saved * analyst_hourly_cost).quantize(Decimal("0.01"))

    start_time = _parse_prefect_datetime(flow_run.get("start_time"))
    end_time = _parse_prefect_datetime(flow_run.get("end_time"))

    audit_payload: dict[str, Any] = {
        "sources": {
            "fte_items": (log_audit or {}).get("fte_items") or {"source": fte_items_source},
        },
        "calculation_version": 1,
    }
    return {
        "flow_run_id": flow_run_id,
        "deployment_id": deployment_id,
        "flow_run_start_time": start_time,
        "flow_run_end_time": end_time,
        "flow_run_state_type": flow_run.get("state_type"),
        "bot_run_time_seconds": bot_run_time_seconds,
        "fte_items": fte_items,
        "fte_items_source": fte_items_source,
        "avg_human_minutes_per_case": avg_human_minutes_per_case,
        "avg_cases_per_run": avg_cases_per_run,
        "analyst_hourly_cost": analyst_hourly_cost,
        "fte_hours_per_year": fte_hours_per_year,
        "human_minutes": human_minutes,
        "hours_saved": hours_saved,
        "fte_saved": fte_saved,
        "est_cost_avoided": est_cost_avoided,
        "extra_metadata": json.dumps(audit_payload),
    }


@flow(name="fte_snapshot_aggregate", log_prints=True)
async def fte_snapshot_aggregate(
    lookback_hours: int = 24 * 7,
    *,
    prefect_api_url: str | None = None,
    metadata_db_url: str | None = None,
    overwrite_existing: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Populate `deployment_fte_snapshot` with 1 row per Prefect flow run (1:1 on `flow_run_id`).

    Business logic
    --------------
    For each COMPLETED flow run within the lookback window:
        1) Try to read `fte_items` from Prefect logs (e.g. `logger.info("fte_items=33")`).
        2) If not found, fall back to the user-provided `deployment_fte.avg_cases_per_run`.
        3) If that is null, default to 1.

    The snapshot stores the *assumptions used* (avg_human_minutes_per_case, analyst_hourly_cost,
    fte_hours_per_year, avg_cases_per_run) alongside the measured bot runtime, so historical
    FTE results do not change when configs are edited later.
    """
    logger = get_run_logger()

    if lookback_hours <= 0:
        raise ValueError("lookback_hours must be > 0")

    resolved_metadata_db_url = _resolve_metadata_db_url(metadata_db_url)
    resolved_prefect_api_url = _resolve_prefect_api_url(prefect_api_url)
    logger.info(
        "FTE snapshot targets: metadata_db=%s prefect_api=%s",
        _describe_db_target(resolved_metadata_db_url),
        resolved_prefect_api_url,
    )

    engine = _create_metadata_engine(resolved_metadata_db_url)

    window_end = datetime.now(UTC)
    window_start = window_end - timedelta(hours=lookback_hours)
    logger.info("FTE snapshot lookback window: %s -> %s", window_start.isoformat(), window_end.isoformat())

    try:
        configs_by_deployment_id = await _load_active_deployment_fte_configs(engine)
        deployment_ids = sorted(configs_by_deployment_id.keys())
        if not deployment_ids:
            logger.info("No active deployment_fte configs found; nothing to snapshot.")
            return {"inserted": 0, "skipped_existing": 0, "skipped_missing_config": 0}

        async with httpx.AsyncClient(base_url=resolved_prefect_api_url, timeout=30.0) as client:
            runs = await _fetch_completed_flow_runs(
                client,
                deployment_ids,
                window_start=window_start,
                window_end=window_end,
            )

            flow_run_ids = [
                str(item.get("id"))
                for item in runs
                if isinstance(item, dict) and item.get("id")
            ]
            if not flow_run_ids:
                logger.info("No completed flow runs found in window.")
                return {"inserted": 0, "skipped_existing": 0, "skipped_missing_config": 0}

            existing_ids = await _load_existing_snapshot_flow_run_ids(engine, flow_run_ids)
            missing_runs = [
                run for run in runs if str(run.get("id")) not in existing_ids
            ]
            skipped_existing = len(runs) - len(missing_runs)
            if not missing_runs:
                logger.info("All %s flow runs already have snapshot rows.", len(runs))
                return {"inserted": 0, "skipped_existing": skipped_existing, "skipped_missing_config": 0}

            missing_flow_run_ids = [str(run.get("id")) for run in missing_runs if run.get("id")]
            metrics_by_flow_run_id, audit_by_flow_run_id = await _extract_log_metrics(
                client,
                missing_flow_run_ids,
                LOG_METRIC_EXTRACTORS,
            )

            snapshot_rows: list[dict[str, Any]] = []
            skipped_missing_config = 0
            for run in missing_runs:
                deployment_id = str(run.get("deployment_id") or "").strip()
                config = configs_by_deployment_id.get(deployment_id)
                if config is None:
                    skipped_missing_config += 1
                    continue
                flow_run_id = str(run.get("id") or "")
                row = _build_snapshot_row(
                    flow_run=run,
                    config=config,
                    log_metrics=metrics_by_flow_run_id.get(flow_run_id),
                    log_audit=audit_by_flow_run_id.get(flow_run_id),
                )
                if row is None:
                    skipped_missing_config += 1
                    continue
                snapshot_rows.append(row)

            inserted = await _insert_snapshot_rows(
                engine,
                snapshot_rows,
                overwrite_existing=overwrite_existing,
                dry_run=dry_run,
            )

            logger.info(
                "FTE snapshot rows prepared=%s inserted=%s skipped_existing=%s skipped_missing_config=%s",
                len(snapshot_rows),
                inserted,
                skipped_existing,
                skipped_missing_config,
            )
            return {
                "inserted": inserted,
                "skipped_existing": skipped_existing,
                "skipped_missing_config": skipped_missing_config,
            }
    finally:
        await engine.dispose()


if __name__ == '__main__':
    import asyncio
    asyncio.run(fte_snapshot_aggregate())
