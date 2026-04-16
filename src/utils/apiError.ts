import type { AxiosError } from 'axios';

type ApiErrBody = { message?: string; detail?: string; title?: string };

export function getApiErrorMessage(error: unknown, fallback = 'Сталася помилка'): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const ax = error as AxiosError<ApiErrBody>;
    const d = ax.response?.data;
    if (d && typeof d === 'object') {
      if (typeof d.message === 'string' && d.message.length > 0) return d.message;
      if (typeof d.detail === 'string' && d.detail.length > 0) return d.detail;
      if (typeof d.title === 'string' && d.title.length > 0) return d.title;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
