import axios from 'axios';

const LOGIN_PATH = '/login';
const AUTH_STORAGE_KEYS = ['auth_token', 'refresh_token'];

let isRedirectingToLogin = false;

/**
 * Removes local authentication artifacts so the app returns to an unauthenticated state.
 *
 * Behavior:
 * - Deletes all known token keys from localStorage.
 * - Safe to call repeatedly without side effects beyond key removal.
 *
 * Future improvements:
 * - Move key names into a shared auth constants module used by login/logout flows.
 * - Clear additional stores (sessionStorage/cookies) if token persistence expands.
 */
const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

/**
 * Redirects the browser to the login route after auth failure with loop protection.
 *
 * Behavior:
 * - No-ops during SSR when `window` is unavailable.
 * - Skips redirect when already on `/login`.
 * - Uses a module-level guard so concurrent 401s trigger only one redirect.
 * - Uses `window.location.assign` for a full app-state reset.
 *
 * Future improvements:
 * - Preserve the original destination for post-login return.
 * - Switch to router navigation once global auth-state reset is centralized.
 * - Add telemetry for repeated 401 redirect events.
 */
const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath.startsWith(LOGIN_PATH) || isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  window.location.assign(LOGIN_PATH);
};

/**
 * Returns an Axios instance with request/response interceptors for auth enforcement.
 * Module-level singleton pattern: one instance, interceptors attached once at module load, no React lifecycle involved.
 * Behavior:
 * - Adds `Authorization: Bearer <token>` from localStorage on every request.
 * - Removes stale Authorization headers when no token is present.
 * - On HTTP 401, clears auth storage and redirects to `/login`.
 * - Ejects interceptors on unmount to avoid leaks or duplicate handlers.
 * - Single axios instance created at module load
 * - Interceptors attached once — no per-render or per-mount overhead, no eject/re-attach cycle
 * - useAxios() is now a trivial getter — kept as a hook so all call sites remain unchanged
 * - useEffect, useMemo imports removed
 *
 * Future improvements:
 * - Attempt refresh-token exchange before forced logout when supported.
 * - Make redirect and exempt-route behavior configurable per consumer.
 * - Consolidate with a shared API client so all modules follow one policy.
 */
const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      const accessToken = localStorage.getItem('auth_token');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      } else if ('Authorization' in config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    });

    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearAuthStorage();
          redirectToLogin();
        }
        return Promise.reject(error);
      },
    );

function useAxios() {
  return axiosInstance;
}

export { useAxios };
