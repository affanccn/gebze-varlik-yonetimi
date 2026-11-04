import { ApiException, type ApiErrorResponse } from '../types/api';

function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )XSRF-TOKEN=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface ApiRequestOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // SPA CSRF Koruması: GET ve HEAD dışındaki tüm isteklerde XSRF-TOKEN gönderilir
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set('X-XSRF-TOKEN', csrf);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const data: ApiErrorResponse & Record<string, unknown> = await response
    .json()
    .catch(() => ({} as ApiErrorResponse));

  if (!response.ok) {
    const isLoginRequest = url.includes('/api/auth/login');
    const errorCode = data?.code;
    const errorMessage = data?.error || data?.message || `İstek başarısız oldu (HTTP ${response.status})`;

    if (response.status === 401) {
      // Login isteğinde 401 oturum süresi dolması sayılmaz (hata mesajı formda gösterilir)
      if (!isLoginRequest && !options.skipAuthRedirect) {
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: { message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapınız.' },
          })
        );
      }
    } else if (response.status === 403) {
      if (errorCode === 'PASSWORD_CHANGE_REQUIRED') {
        window.dispatchEvent(new CustomEvent('auth:password-change-required'));
      }
    }

    throw new ApiException(response.status, errorMessage, errorCode, data);
  }

  return data as unknown as T;
}

