from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from api.settings import get_settings

settings = get_settings()

# assign prefect deployments to a group
class PrefectProxyError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class PrefectClient:
    def __init__(self) -> None:
        self.base_url = settings.PREFECT_API_URL.rstrip("/")
        self.timeout = settings.PREFECT_REQUEST_TIMEOUT_SECONDS

    def _sync_request(self, method: str, url: str, payload: dict | None = None) -> Any:
        body = json.dumps(payload).encode() if payload is not None else None
        headers = {"Content-Type": "application/json"}
        request = urllib_request.Request(url=url, data=body, method=method, headers=headers)
        try:
            with urllib_request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode()
                status_code = response.status
        except urllib_error.HTTPError as exc:
            raw = exc.read().decode() if exc.fp else ""
            detail = raw
            try:
                data = json.loads(raw)
                if isinstance(data, dict):
                    detail = data.get("detail") or data.get("message") or str(data)
                else:
                    detail = str(data)
            except json.JSONDecodeError:
                pass
            raise PrefectProxyError(status_code=exc.code, detail=f"Prefect API error: {detail}") from exc
        except urllib_error.URLError as exc:
            raise PrefectProxyError(status_code=503, detail=f"Prefect API unavailable: {exc.reason}") from exc

        if status_code >= 400:
            raise PrefectProxyError(status_code=status_code, detail=f"Prefect API error: {raw}")

        try:
            return json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return {}

    async def _request(self, method: str, path: str, payload: dict | None = None) -> Any:
        url = f"{self.base_url}{path}"
        return await asyncio.to_thread(self._sync_request, method, url, payload)

    async def paginate_deployments(self, payload: dict) -> dict:
        data = await self._request("POST", "/deployments/paginate", payload=payload)
        return data if isinstance(data, dict) else {"results": [], "count": 0, "pages": 0}

    async def get_deployment(self, deployment_id: str) -> dict:
        data = await self._request("GET", f"/deployments/{deployment_id}")
        return data if isinstance(data, dict) else {}

    async def list_deployment_flow_runs(
        self,
        deployment_id: str,
        limit: int = 100,
        state_type: str | None = None,
    ) -> list[dict]:
        normalized_state_type = str(state_type or "").strip().upper()
        flow_runs_filter: dict[str, Any] = {
            "deployment_id": {
                "any_": [deployment_id],
            },
        }
        if normalized_state_type:
            flow_runs_filter["state"] = {
                "type": {
                    "any_": [normalized_state_type],
                },
            }

        data = await self._request(
            "POST",
            "/flow_runs/filter",
            payload={
                "flow_runs": flow_runs_filter,
                "sort": "EXPECTED_START_TIME_DESC",
                "limit": limit,
            },
        )
        return data if isinstance(data, list) else []

    async def create_flow_run(self, deployment_id: str, payload: dict | None = None) -> dict:
        data = await self._request(
            "POST",
            f"/deployments/{deployment_id}/create_flow_run",
            payload=payload or {},
        )
        return data if isinstance(data, dict) else {}

    # scheduler page
    async def get_scheduled_flow_runs_for_deployments(self, payload: dict) -> list[dict]:
        data = await self._request(
            "POST",
            "/deployments/get_scheduled_flow_runs",
            payload=payload,
        )
        return data if isinstance(data, list) else []

    # scheduler page
    async def filter_flow_runs(self, payload: dict) -> list[dict]:
        data = await self._request(
            "POST",
            "/flow_runs/filter",
            payload=payload,
        )
        return data if isinstance(data, list) else []

    async def count_flow_runs(self, payload: dict) -> int:
        data = await self._request(
            "POST",
            "/flow_runs/count",
            payload=payload,
        )
        if isinstance(data, bool):
            return 0
        if isinstance(data, (int, float)):
            return int(data)
        return 0

    async def flow_run_history(self, payload: dict) -> list[dict]:
        data = await self._request(
            "POST",
            "/flow_runs/history",
            payload=payload,
        )
        return data if isinstance(data, list) else []

    # scheduler page
    async def average_flow_run_lateness(self, payload: dict) -> float | None:
        data = await self._request(
            "POST",
            "/flow_runs/lateness",
            payload=payload,
        )
        if isinstance(data, (int, float)):
            return float(data)
        return None

    async def filter_logs(self, payload: dict) -> list[dict]:
        data = await self._request(
            "POST",
            "/logs/filter",
            payload=payload,
        )
        return data if isinstance(data, list) else []

    async def list_deployments(self, limit: int = 200) -> list[dict]:
        page = await self.paginate_deployments({"page": 1, "limit": limit, "sort": "NAME_ASC"})
        results = page.get("results", [])
        return results if isinstance(results, list) else []

    async def list_scheduled_deployment_ids(self, date_string: str) -> list[str]:
        try:
            start = datetime.fromisoformat(f"{date_string}T00:00:00").replace(tzinfo=UTC)
        except ValueError as exc:
            raise PrefectProxyError(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc

        end = start + timedelta(days=1) - timedelta(milliseconds=1)
        payload = {
            "flow_runs": {
                "expected_start_time": {
                    "after_": start.isoformat(),
                    "before_": end.isoformat(),
                },
                "state": {
                    "type": {
                        "any_": ["SCHEDULED"],
                    },
                },
            },
            "limit": 200,
        }
        rows = await self._request("POST", "/flow_runs/filter", payload=payload)
        if not isinstance(rows, list):
            return []

        deployment_ids = []
        for row in rows:
            if isinstance(row, dict) and row.get("deployment_id"):
                deployment_ids.append(str(row["deployment_id"]))
        return sorted(set(deployment_ids))


prefect_client = PrefectClient()
