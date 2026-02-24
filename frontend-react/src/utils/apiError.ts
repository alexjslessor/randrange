type ErrorDetail = string | { msg?: string } | Array<string | { msg?: string }>;

interface ApiErrorResponse {
  detail?: ErrorDetail;
  message?: string;
  color?: string;
  error?: {
    detail?: ErrorDetail;
    color?: string;
  };
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse;
  };
  message?: string;
}

const formatApiErrorDetail = (detail: ErrorDetail | undefined): string => {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.msg === 'string') return item.msg;
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof detail === 'object') {
    if (typeof detail.msg === 'string') return detail.msg;
    return JSON.stringify(detail);
  }
  return String(detail);
};

export const getApiErrorMessage = (error: ApiError | unknown, fallback = 'Request failed'): string => {
  const apiError = error as ApiError;
  const payload = apiError?.response?.data;
  const detail = formatApiErrorDetail(
    payload?.detail ?? payload?.error?.detail ?? payload?.error,
  );
  if (detail) return detail;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof apiError?.message === 'string' && apiError.message.trim()) return apiError.message;
  return fallback;
};

export const getApiErrorColor = (error: ApiError | unknown, fallback = 'warning'): string => (
  (error as ApiError)?.response?.data?.error?.color
  || (error as ApiError)?.response?.data?.color
  || fallback
);
