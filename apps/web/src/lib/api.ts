const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface UserMe {
  id: string;
  email: string;
  creditBalance: number;
}

export interface GenerationTask {
  id: string;
  type: string;
  status: string;
  prompt?: string | null;
  resultUrl?: string | null;
  resultText?: string | null;
  error?: string | null;
  params?: Record<string, string> | null;
  createdAt: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  coverUrl?: string | null;
  _count: { tasks: number };
  tasks: { resultUrl: string | null }[];
}

export interface CreditLedgerTask {
  type: string;
  status: string;
  prompt?: string | null;
}

export interface CreditLedgerItem {
  id: string;
  amount: number;
  reason: string;
  taskId?: string | null;
  createdAt: string;
  task?: CreditLedgerTask;
}

export interface CreditLedgerResponse {
  items: CreditLedgerItem[];
  nextCursor: string | null;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('amos_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { message?: string | string[] }).message;
    const message =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw.join(', ')
          : res.statusText;
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('amos_token');
      throw new Error('未登录或登录已过期，正在重新登录…请稍后重试');
    }
    throw new Error(message || '请求失败');
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return request<{ accessToken: string; user: UserMe }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<UserMe>('/users/me');
}

export async function listCreditLedger(options?: { limit?: number; cursor?: string }) {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);
  const q = params.toString();
  return request<CreditLedgerResponse>(`/users/me/credits/ledger${q ? `?${q}` : ''}`);
}

export async function createTask(body: {
  type: string;
  prompt?: string;
  style?: string;
  aspectRatio?: string;
  projectId?: string;
}) {
  return request<GenerationTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createTaskWithUpload(formData: FormData) {
  return request<GenerationTask>('/tasks/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getTask(id: string) {
  return request<GenerationTask>(`/tasks/${id}`);
}

export async function listTasks(projectId?: string) {
  const q = projectId ? `?projectId=${projectId}` : '';
  return request<GenerationTask[]>(`/tasks${q}`);
}

export async function listProjects() {
  return request<ProjectItem[]>('/projects');
}

export async function createProject(name: string) {
  return request<ProjectItem>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * 将历史 MinIO 直链转为 API 代理地址（MinIO 桶未公开读时浏览器会 403）。
 */
export function resolveAssetUrl(url: string): string {
  try {
    const u = new URL(url);
    const key = u.pathname.replace(/^\/?amos-assets\//, '').replace(/^\//, '');
    if (key && (u.port === '9000' || u.pathname.includes('/amos-assets/'))) {
      return `${API_URL}/assets/${key}`;
    }
  } catch {
    /* 非 URL 则原样返回 */
  }
  return url;
}

export { API_URL };
