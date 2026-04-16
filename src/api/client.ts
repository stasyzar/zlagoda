import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function transformKeys(obj: unknown, transform: (key: string) => string): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, transform));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        transform(key),
        transformKeys(value, transform),
      ])
    );
  }
  return obj;
}

// Автоматично додає токен + конвертує snake_case → camelCase для запитів
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data) {
    config.data = transformKeys(config.data, snakeToCamel);
  }
  return config;
});

// Конвертує camelCase → snake_case для відповідей; якщо 401 — виходимо
apiClient.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = transformKeys(res.data, camelToSnake);
    }
    return res;
  },
  (err) => {
    const url = String(err.config?.url ?? '');
    const isLoginFailure =
      err.response?.status === 401 && (url.includes('/auth/login') || url.endsWith('auth/login'));
    if (err.response?.status === 401 && !isLoginFailure) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
