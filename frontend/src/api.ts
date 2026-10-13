const API_URL = import.meta.env.VITE_API_URL;

export interface User {
  id: string;
  email: string;
}

export interface Account {
  id: string;
  label: string;
  issuer: string;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
  createdAt: string;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? "Request failed", res.status);
  }
  return body as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  session: () => request<{ user: User }>("/api/auth/session"),
  listAccounts: () => request<{ accounts: Account[] }>("/api/accounts"),
  addAccount: (input: {
    label: string;
    issuer: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
  }) => request<{ account: Account }>("/api/accounts", { method: "POST", body: JSON.stringify(input) }),
  renameAccount: (id: string, input: { label: string; issuer: string }) =>
    request<{ account: Account }>(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteAccount: (id: string) => request<void>(`/api/accounts/${id}`, { method: "DELETE" }),
};

export { ApiError };
