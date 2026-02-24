from __future__ import annotations

import hashlib
import hmac
import math
import os
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Callable

import requests
import streamlit as st

DEFAULT_AUTH_BASE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
DEFAULT_CLIENT_ID = os.getenv("AUTH_CLIENT_ID", "frontend-react")
DEFAULT_SCOPE = os.getenv("AUTH_SCOPE", "openid profile")
DEFAULT_TIMEOUT_SECONDS = float(os.getenv("AUTH_REQUEST_TIMEOUT_SECONDS", "10"))
APP_LOGIN_ENABLED_ENV = "STREAMLIT_APP_LOGIN_ENABLED"
APP_LOGIN_USERNAME_ENV = "STREAMLIT_APP_USERNAME"
APP_LOGIN_PASSWORD_ENV = "STREAMLIT_APP_PASSWORD"
APP_LOGIN_PASSWORD_HASH_ENV = "STREAMLIT_APP_PASSWORD_HASH"
MAX_ERROR_SAMPLES = 20


class AuthClientError(RuntimeError):
    """Raised when a request to the auth service fails."""


@dataclass(frozen=True)
class AuthSession:
    access_token: str
    refresh_token: str
    expires_in: int
    scope: str
    obtained_at: float
    profile: dict[str, Any]

    @property
    def expires_at(self) -> float:
        return self.obtained_at + self.expires_in

    @property
    def expires_in_seconds(self) -> int:
        return max(int(self.expires_at - time.time()), 0)


@dataclass(frozen=True)
class StressConfig:
    base_url: str
    timeout_seconds: float
    scenario: str
    total_requests: int
    concurrency: int
    access_token: str | None
    username: str | None
    password: str | None
    scope: str


def _is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _app_login_settings() -> dict[str, Any]:
    return {
        "enabled": _is_truthy(os.getenv(APP_LOGIN_ENABLED_ENV)),
        "username": (os.getenv(APP_LOGIN_USERNAME_ENV) or "").strip(),
        "password": os.getenv(APP_LOGIN_PASSWORD_ENV) or "",
        "password_hash": (os.getenv(APP_LOGIN_PASSWORD_HASH_ENV) or "").strip().lower(),
    }


def _verify_app_login_credentials(
    expected_username: str,
    expected_password: str,
    expected_password_hash: str,
    submitted_username: str,
    submitted_password: str,
) -> bool:
    if not hmac.compare_digest(submitted_username, expected_username):
        return False
    if expected_password_hash:
        submitted_hash = hashlib.sha256(submitted_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(submitted_hash, expected_password_hash)
    return hmac.compare_digest(submitted_password, expected_password)


def render_app_login_gate() -> None:
    settings = _app_login_settings()
    if not settings["enabled"]:
        st.session_state.pop("app_access_authenticated", None)
        st.session_state.pop("app_access_username", None)
        return

    expected_username = str(settings["username"])
    expected_password = str(settings["password"])
    expected_password_hash = str(settings["password_hash"])
    has_password = bool(expected_password or expected_password_hash)
    if not expected_username or not has_password:
        st.error(
            "App login is enabled but credentials are missing. "
            f"Set `{APP_LOGIN_USERNAME_ENV}` and either `{APP_LOGIN_PASSWORD_ENV}` "
            f"or `{APP_LOGIN_PASSWORD_HASH_ENV}`."
        )
        st.stop()

    if st.session_state.get("app_access_authenticated"):
        return

    st.title("Protected App Login")
    st.caption("Sign in to access this Streamlit dashboard.")
    with st.form("app_access_login_form"):
        submitted_username = st.text_input("Username")
        submitted_password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login", type="primary")

    if submitted:
        if _verify_app_login_credentials(
            expected_username=expected_username,
            expected_password=expected_password,
            expected_password_hash=expected_password_hash,
            submitted_username=submitted_username,
            submitted_password=submitted_password,
        ):
            st.session_state["app_access_authenticated"] = True
            st.session_state["app_access_username"] = submitted_username
            st.rerun()
        st.error("Invalid username or password")
    st.stop()


def render_app_login_status() -> None:
    settings = _app_login_settings()
    if not settings["enabled"] or not st.session_state.get("app_access_authenticated"):
        return

    app_username = st.session_state.get("app_access_username", "user")
    st.sidebar.header("App Access")
    st.sidebar.caption(f"Signed in as `{app_username}`")
    if st.sidebar.button("App logout", use_container_width=True):
        st.session_state.pop("app_access_authenticated", None)
        st.session_state.pop("app_access_username", None)
        st.session_state.pop("auth_session", None)
        st.session_state.pop("dashboard_data", None)
        st.session_state.pop("stress_results", None)
        st.rerun()


def normalize_base_url(base_url: str) -> str:
    return base_url.strip().rstrip("/")


def _headers(access_token: str | None = None) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _response_body(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text


def _response_error_message(response: requests.Response) -> str:
    body = _response_body(response)
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("message") or body.get("error")
        if detail:
            return str(detail)
    if isinstance(body, str) and body.strip():
        return body.strip()
    return f"HTTP {response.status_code}"


def _request(
    method: str,
    url: str,
    *,
    timeout_seconds: float,
    access_token: str | None = None,
    data: dict[str, Any] | None = None,
) -> requests.Response:
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=_headers(access_token),
            data=data,
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        raise AuthClientError(f"Request failed: {exc}") from exc
    return response


def _request_json(
    method: str,
    url: str,
    *,
    timeout_seconds: float,
    access_token: str | None = None,
    data: dict[str, Any] | None = None,
) -> Any:
    response = _request(
        method,
        url,
        timeout_seconds=timeout_seconds,
        access_token=access_token,
        data=data,
    )
    if response.status_code >= 400:
        raise AuthClientError(_response_error_message(response))
    payload = _response_body(response)
    return payload


def login(
    base_url: str,
    username: str,
    password: str,
    scope: str,
    timeout_seconds: float,
) -> AuthSession:
    payload = {
        "grant_type": "password",
        "username": username,
        "password": password,
        "scope": scope,
        "provider": "local_password",
    }
    token_payload = _request_json(
        "POST",
        f"{base_url}/login",
        timeout_seconds=timeout_seconds,
        data=payload,
    )
    if not isinstance(token_payload, dict):
        raise AuthClientError("Unexpected /login response format")

    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    if not isinstance(access_token, str) or not access_token:
        raise AuthClientError("Missing access_token in /login response")
    if not isinstance(refresh_token, str) or not refresh_token:
        raise AuthClientError("Missing refresh_token in /login response")

    profile = fetch_me(base_url, access_token, timeout_seconds)
    expires_in = int(token_payload.get("expires_in", 0) or 0)
    if expires_in <= 0:
        expires_in = 3600

    return AuthSession(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        scope=str(token_payload.get("scope") or scope),
        obtained_at=time.time(),
        profile=profile,
    )


def refresh_session(
    base_url: str,
    refresh_token: str,
    client_id: str,
    timeout_seconds: float,
) -> AuthSession:
    token_payload = _request_json(
        "POST",
        f"{base_url}/refresh",
        timeout_seconds=timeout_seconds,
        data={
            "refresh_token": refresh_token,
            "client_id": client_id,
        },
    )
    if not isinstance(token_payload, dict):
        raise AuthClientError("Unexpected /refresh response format")

    access_token = token_payload.get("access_token")
    next_refresh_token = token_payload.get("refresh_token")
    if not isinstance(access_token, str) or not access_token:
        raise AuthClientError("Missing access_token in /refresh response")
    if not isinstance(next_refresh_token, str) or not next_refresh_token:
        raise AuthClientError("Missing refresh_token in /refresh response")

    profile = fetch_me(base_url, access_token, timeout_seconds)
    expires_in = int(token_payload.get("expires_in", 0) or 0)
    if expires_in <= 0:
        expires_in = 3600

    return AuthSession(
        access_token=access_token,
        refresh_token=next_refresh_token,
        expires_in=expires_in,
        scope=str(token_payload.get("scope") or DEFAULT_SCOPE),
        obtained_at=time.time(),
        profile=profile,
    )


def fetch_me(base_url: str, access_token: str, timeout_seconds: float) -> dict[str, Any]:
    payload = _request_json(
        "GET",
        f"{base_url}/users/me",
        timeout_seconds=timeout_seconds,
        access_token=access_token,
    )
    if not isinstance(payload, dict):
        raise AuthClientError("Unexpected /users/me response format")
    return payload


def fetch_dashboard_data(
    base_url: str,
    access_token: str,
    timeout_seconds: float,
) -> dict[str, list[dict[str, Any]]]:
    endpoints = {
        "users": "/admin/users",
        "groups": "/admin/groups",
        "permissions": "/admin/permissions",
        "realms": "/admin/realms",
    }
    output: dict[str, list[dict[str, Any]]] = {}
    for key, path in endpoints.items():
        payload = _request_json(
            "GET",
            f"{base_url}{path}",
            timeout_seconds=timeout_seconds,
            access_token=access_token,
        )
        if isinstance(payload, list):
            output[key] = [item for item in payload if isinstance(item, dict)]
        else:
            output[key] = []
    return output


def _run_scenario_once(config: StressConfig) -> tuple[int | str, str]:
    if config.scenario == "Login only":
        response = _request(
            "POST",
            f"{config.base_url}/login",
            timeout_seconds=config.timeout_seconds,
            data={
                "grant_type": "password",
                "username": config.username or "",
                "password": config.password or "",
                "scope": config.scope,
                "provider": "local_password",
            },
        )
        return response.status_code, _response_error_message(response)

    token = config.access_token or ""
    if config.scenario == "GET /users/me":
        response = _request(
            "GET",
            f"{config.base_url}/users/me",
            timeout_seconds=config.timeout_seconds,
            access_token=token,
        )
        return response.status_code, _response_error_message(response)

    if config.scenario == "GET /admin/users":
        response = _request(
            "GET",
            f"{config.base_url}/admin/users",
            timeout_seconds=config.timeout_seconds,
            access_token=token,
        )
        return response.status_code, _response_error_message(response)

    if config.scenario == "GET /admin/groups":
        response = _request(
            "GET",
            f"{config.base_url}/admin/groups",
            timeout_seconds=config.timeout_seconds,
            access_token=token,
        )
        return response.status_code, _response_error_message(response)

    if config.scenario == "Dashboard read bundle":
        for path in ("/admin/users", "/admin/groups", "/admin/permissions", "/admin/realms"):
            response = _request(
                "GET",
                f"{config.base_url}{path}",
                timeout_seconds=config.timeout_seconds,
                access_token=token,
            )
            if response.status_code >= 400:
                return response.status_code, f"{path}: {_response_error_message(response)}"
        return 200, "OK"

    return "CONFIG", "Unsupported scenario"


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    sorted_values = sorted(values)
    rank = (len(sorted_values) - 1) * (p / 100)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return sorted_values[low]
    weight = rank - low
    return sorted_values[low] * (1 - weight) + sorted_values[high] * weight


def run_stress_test(
    config: StressConfig,
    on_progress: Callable[[int, int], None] | None = None,
) -> dict[str, Any]:
    if config.total_requests < 1:
        raise ValueError("total_requests must be >= 1")
    if config.concurrency < 1:
        raise ValueError("concurrency must be >= 1")
    if config.scenario == "Login only" and (not config.username or not config.password):
        raise ValueError("username/password are required for login scenario")
    if config.scenario != "Login only" and not config.access_token:
        raise ValueError("an access token is required for this scenario")

    latency_ms: list[float] = []
    status_counts: Counter[str] = Counter()
    error_samples: list[dict[str, Any]] = []

    started = time.perf_counter()

    def worker(_: int) -> dict[str, Any]:
        single_start = time.perf_counter()
        try:
            status_code, detail = _run_scenario_once(config)
            ok = isinstance(status_code, int) and 200 <= status_code < 300
            status = str(status_code)
            message = detail
        except AuthClientError as exc:
            ok = False
            status = "NETWORK_ERROR"
            message = str(exc)
        except Exception as exc:  # pragma: no cover - defensive fallback
            ok = False
            status = "EXCEPTION"
            message = str(exc)
        elapsed_ms = (time.perf_counter() - single_start) * 1000
        return {
            "ok": ok,
            "status": status,
            "message": message,
            "latency_ms": elapsed_ms,
        }

    max_workers = min(config.concurrency, config.total_requests)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(worker, idx) for idx in range(config.total_requests)]
        for completed, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            latency_ms.append(result["latency_ms"])
            status_counts[result["status"]] += 1
            if not result["ok"] and len(error_samples) < MAX_ERROR_SAMPLES:
                error_samples.append(
                    {
                        "status": result["status"],
                        "message": result["message"][:300],
                        "latency_ms": round(result["latency_ms"], 2),
                    }
                )
            if on_progress:
                on_progress(completed, config.total_requests)

    duration_seconds = time.perf_counter() - started
    success_count = sum(
        count for status, count in status_counts.items() if status.isdigit() and 200 <= int(status) < 300
    )
    failure_count = config.total_requests - success_count

    return {
        "scenario": config.scenario,
        "duration_seconds": duration_seconds,
        "throughput_rps": config.total_requests / duration_seconds if duration_seconds > 0 else 0.0,
        "total_requests": config.total_requests,
        "success_count": success_count,
        "failure_count": failure_count,
        "status_counts": dict(sorted(status_counts.items(), key=lambda item: item[0])),
        "latency": {
            "min_ms": min(latency_ms) if latency_ms else 0.0,
            "p50_ms": percentile(latency_ms, 50),
            "p90_ms": percentile(latency_ms, 90),
            "p95_ms": percentile(latency_ms, 95),
            "p99_ms": percentile(latency_ms, 99),
            "max_ms": max(latency_ms) if latency_ms else 0.0,
            "avg_ms": sum(latency_ms) / len(latency_ms) if latency_ms else 0.0,
        },
        "error_samples": error_samples,
    }


def _to_session_dict(session: AuthSession) -> dict[str, Any]:
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "scope": session.scope,
        "obtained_at": session.obtained_at,
        "profile": session.profile,
    }


def _from_session_dict(value: dict[str, Any] | None) -> AuthSession | None:
    if not isinstance(value, dict):
        return None
    try:
        return AuthSession(
            access_token=str(value["access_token"]),
            refresh_token=str(value["refresh_token"]),
            expires_in=int(value.get("expires_in", 0)),
            scope=str(value.get("scope", "")),
            obtained_at=float(value.get("obtained_at", 0.0)),
            profile=dict(value.get("profile", {})),
        )
    except (KeyError, TypeError, ValueError):
        return None


def render_auth_sidebar() -> tuple[str, float, str, str, str]:
    st.sidebar.header("Connection")
    base_url_input = st.sidebar.text_input("Auth API base URL", value=DEFAULT_AUTH_BASE_URL)
    timeout_seconds = st.sidebar.number_input(
        "Request timeout (seconds)",
        min_value=1.0,
        max_value=120.0,
        value=max(DEFAULT_TIMEOUT_SECONDS, 1.0),
        step=1.0,
    )
    client_id = st.sidebar.text_input("OAuth client_id", value=DEFAULT_CLIENT_ID)
    scope = st.sidebar.text_input("Login scope", value=DEFAULT_SCOPE)
    username = st.sidebar.text_input("Username", value=st.session_state.get("login_username", ""))
    password = st.sidebar.text_input("Password", type="password", value="")
    st.session_state["login_username"] = username

    base_url = normalize_base_url(base_url_input)

    session = _from_session_dict(st.session_state.get("auth_session"))
    login_clicked = st.sidebar.button("Sign in", type="primary", use_container_width=True)
    if login_clicked:
        try:
            session = login(base_url, username, password, scope, timeout_seconds)
            st.session_state["auth_session"] = _to_session_dict(session)
            st.sidebar.success("Authenticated successfully")
        except (AuthClientError, ValueError) as exc:
            st.sidebar.error(f"Login failed: {exc}")

    if session:
        st.sidebar.caption(f"Logged in as `{session.profile.get('username', 'unknown')}`")
        st.sidebar.caption(f"Token expires in `{session.expires_in_seconds}s`")

        col_refresh, col_logout = st.sidebar.columns(2)
        if col_refresh.button("Refresh token", use_container_width=True):
            try:
                refreshed = refresh_session(base_url, session.refresh_token, client_id, timeout_seconds)
                st.session_state["auth_session"] = _to_session_dict(refreshed)
                session = refreshed
                st.sidebar.success("Token refreshed")
            except AuthClientError as exc:
                st.sidebar.error(f"Refresh failed: {exc}")

        if col_logout.button("Logout", use_container_width=True):
            st.session_state.pop("auth_session", None)
            st.session_state.pop("dashboard_data", None)
            st.session_state.pop("stress_results", None)
            session = None
            st.sidebar.info("Logged out")

    return base_url, float(timeout_seconds), client_id, scope, username


def render_dashboard_tab(base_url: str, timeout_seconds: float, session: AuthSession | None) -> None:
    st.subheader("User Management Snapshot")
    st.caption("Reads the same auth admin endpoints used by your dashboard.")

    if not session:
        st.info("Authenticate first to query `/admin/*` endpoints.")
        return

    if st.button("Load dashboard data", type="primary"):
        try:
            st.session_state["dashboard_data"] = fetch_dashboard_data(
                base_url=base_url,
                access_token=session.access_token,
                timeout_seconds=timeout_seconds,
            )
        except AuthClientError as exc:
            st.error(f"Failed to load dashboard data: {exc}")

    dashboard_data = st.session_state.get("dashboard_data")
    if not isinstance(dashboard_data, dict):
        return

    users = dashboard_data.get("users", [])
    groups = dashboard_data.get("groups", [])
    permissions = dashboard_data.get("permissions", [])
    realms = dashboard_data.get("realms", [])

    metric_cols = st.columns(4)
    metric_cols[0].metric("Users", len(users))
    metric_cols[1].metric("Groups", len(groups))
    metric_cols[2].metric("Permissions", len(permissions))
    metric_cols[3].metric("Realms", len(realms))

    st.markdown("`/admin/users`")
    st.dataframe(users, use_container_width=True, hide_index=True)
    st.markdown("`/admin/groups`")
    st.dataframe(groups, use_container_width=True, hide_index=True)
    st.markdown("`/admin/permissions`")
    st.dataframe(permissions, use_container_width=True, hide_index=True)
    st.markdown("`/admin/realms`")
    st.dataframe(realms, use_container_width=True, hide_index=True)


def render_stress_tab(
    base_url: str,
    timeout_seconds: float,
    scope: str,
    default_username: str,
    session: AuthSession | None,
) -> None:
    st.subheader("Live Stress Test")
    st.caption("Run concurrent requests against auth and dashboard endpoints.")

    scenario = st.selectbox(
        "Scenario",
        options=[
            "Login only",
            "GET /users/me",
            "GET /admin/users",
            "GET /admin/groups",
            "Dashboard read bundle",
        ],
    )

    col_a, col_b, col_c = st.columns(3)
    total_requests = int(
        col_a.number_input(
            "Total requests",
            min_value=1,
            max_value=10000,
            value=200,
            step=10,
        )
    )
    concurrency = int(
        col_b.number_input(
            "Concurrency",
            min_value=1,
            max_value=500,
            value=20,
            step=1,
        )
    )
    scenario_timeout = float(
        col_c.number_input(
            "Per-request timeout (seconds)",
            min_value=1.0,
            max_value=120.0,
            value=timeout_seconds,
            step=1.0,
        )
    )

    login_username = default_username
    login_password = ""
    if scenario == "Login only":
        login_col_a, login_col_b = st.columns(2)
        login_username = login_col_a.text_input("Scenario username", value=default_username)
        login_password = login_col_b.text_input("Scenario password", type="password")

    run_clicked = st.button("Run stress test", type="primary")
    if run_clicked:
        config = StressConfig(
            base_url=base_url,
            timeout_seconds=scenario_timeout,
            scenario=scenario,
            total_requests=total_requests,
            concurrency=concurrency,
            access_token=session.access_token if session else None,
            username=login_username,
            password=login_password,
            scope=scope,
        )
        progress = st.progress(0.0)
        progress_note = st.empty()

        def on_progress(done: int, total: int) -> None:
            progress.progress(done / total)
            progress_note.caption(f"Completed {done}/{total} requests")

        try:
            result = run_stress_test(config, on_progress=on_progress)
            st.session_state["stress_results"] = result
            progress_note.caption("Stress test complete")
        except ValueError as exc:
            st.error(f"Invalid stress test config: {exc}")
        except Exception as exc:  # pragma: no cover - UI safety
            st.error(f"Stress test failed: {exc}")

    result = st.session_state.get("stress_results")
    if not isinstance(result, dict):
        return

    st.markdown(f"### Result: `{result.get('scenario', '')}`")
    metric_cols = st.columns(4)
    metric_cols[0].metric("Total", int(result.get("total_requests", 0)))
    metric_cols[1].metric("Success", int(result.get("success_count", 0)))
    metric_cols[2].metric("Failed", int(result.get("failure_count", 0)))
    metric_cols[3].metric("Throughput (req/s)", f"{float(result.get('throughput_rps', 0.0)):.2f}")

    st.caption(f"Duration: {float(result.get('duration_seconds', 0.0)):.2f}s")

    latency = result.get("latency", {})
    latency_rows = [
        {"metric": "min", "ms": round(float(latency.get("min_ms", 0.0)), 2)},
        {"metric": "p50", "ms": round(float(latency.get("p50_ms", 0.0)), 2)},
        {"metric": "p90", "ms": round(float(latency.get("p90_ms", 0.0)), 2)},
        {"metric": "p95", "ms": round(float(latency.get("p95_ms", 0.0)), 2)},
        {"metric": "p99", "ms": round(float(latency.get("p99_ms", 0.0)), 2)},
        {"metric": "max", "ms": round(float(latency.get("max_ms", 0.0)), 2)},
        {"metric": "avg", "ms": round(float(latency.get("avg_ms", 0.0)), 2)},
    ]
    st.markdown("Latency (ms)")
    st.table(latency_rows)

    status_counts = result.get("status_counts", {})
    status_rows = [{"status": key, "count": value} for key, value in status_counts.items()]
    st.markdown("Status counts")
    st.dataframe(status_rows, use_container_width=True, hide_index=True)

    error_samples = result.get("error_samples", [])
    if error_samples:
        st.markdown("Failure samples")
        st.dataframe(error_samples, use_container_width=True, hide_index=True)


def main() -> None:
    st.set_page_config(page_title="Auth Dashboard Stress Tester", layout="wide")
    render_app_login_gate()
    render_app_login_status()
    st.title("Auth Dashboard Stress Tester")
    st.caption(
        "Authenticate with your `arch-auth` service, inspect admin dashboard payloads, "
        "and run live concurrent stress scenarios."
    )

    base_url, timeout_seconds, _client_id, scope, username = render_auth_sidebar()
    session = _from_session_dict(st.session_state.get("auth_session"))
    if session:
        try:
            latest_profile = fetch_me(base_url, session.access_token, timeout_seconds)
            if latest_profile != session.profile:
                refreshed = AuthSession(
                    access_token=session.access_token,
                    refresh_token=session.refresh_token,
                    expires_in=session.expires_in,
                    scope=session.scope,
                    obtained_at=session.obtained_at,
                    profile=latest_profile,
                )
                st.session_state["auth_session"] = _to_session_dict(refreshed)
                session = refreshed
        except AuthClientError:
            # Keep current session data; explicit calls will report auth errors.
            pass

    if session:
        st.success(
            f"Authenticated as `{session.profile.get('username', 'unknown')}` "
            f"(superuser={bool(session.profile.get('is_superuser'))})"
        )
    else:
        st.info("Sign in from the sidebar to access dashboard and authenticated stress scenarios.")

    tab_dashboard, tab_stress = st.tabs(["Dashboard", "Stress Test"])
    with tab_dashboard:
        render_dashboard_tab(base_url, timeout_seconds, session)
    with tab_stress:
        render_stress_tab(base_url, timeout_seconds, scope, username, session)


if __name__ == "__main__":
    main()
