#!/usr/bin/env bash
set -euo pipefail

PROFILE_NAME="${PROFILE_NAME:-local}"
WORK_POOL_NAME="${WORK_POOL_NAME:-local-pool}"
WORK_POOL_TYPE="${WORK_POOL_TYPE:-process}"
PREFECT_API_URL_VALUE="${PREFECT_API_URL_VALUE:-http://127.0.0.1:4200/api}"

if ! command -v prefect >/dev/null 2>&1; then
  echo "prefect CLI is not on PATH. Activate your venv first."
  exit 1
fi

if ! prefect profile inspect "${PROFILE_NAME}" >/dev/null 2>&1; then
  prefect profile create "${PROFILE_NAME}"
fi

prefect profile use "${PROFILE_NAME}"

# Ignore if keys are already unset.
prefect config unset PREFECT_API_KEY >/dev/null 2>&1 || true
prefect config unset PREFECT_API_AUTH_STRING >/dev/null 2>&1 || true
prefect config set PREFECT_API_URL="${PREFECT_API_URL_VALUE}"

# Guardrail: Prefect websocket event protocol can break if CLI/server versions diverge.
if command -v docker >/dev/null 2>&1 && docker compose ps prefect-server >/dev/null 2>&1; then
  LOCAL_VERSION="$(prefect version | awk -F': *' '/^Version:/ {print $2}')"
  SERVER_VERSION="$(docker compose exec -T prefect-server prefect version | awk -F': *' '/^Version:/ {print $2}')"
  LOCAL_MM="$(echo "${LOCAL_VERSION}" | awk -F. '{print $1 "." $2}')"
  SERVER_MM="$(echo "${SERVER_VERSION}" | awk -F. '{print $1 "." $2}')"

  if [[ -n "${LOCAL_MM}" && -n "${SERVER_MM}" && "${LOCAL_MM}" != "${SERVER_MM}" ]]; then
    echo "Version mismatch detected:"
    echo "  local prefect:  ${LOCAL_VERSION}"
    echo "  server prefect: ${SERVER_VERSION}"
    echo "Please align client/server major.minor versions before starting the worker."
    exit 1
  fi
fi

prefect work-pool inspect "${WORK_POOL_NAME}" >/dev/null 2>&1 || \
  prefect work-pool create "${WORK_POOL_NAME}" --type "${WORK_POOL_TYPE}"

prefect worker start -p "${WORK_POOL_NAME}"
