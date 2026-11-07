const TOKEN_KEY = "lumen_token";

export type Account = {
  user: { id: number; email: string; name: string };
  restaurant: {
    id: number;
    name: string;
    city: string;
    tables: number;
    cameras: number;
    avgCheck: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    amount: number;
    brand: string | null;
    last4: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    active: boolean;
  } | null;
  invoices: {
    id: number;
    number: string;
    plan: string;
    amount: number;
    status: string;
    brand: string | null;
    last4: string | null;
    createdAt: string;
  }[];
  team: { id: number; name: string; role: string; section: string }[];
  gateway: "stripe" | "lumen";
};

export type AuthResponse = Account & { token: string };

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type HouseCamera = {
  id: number;
  name: string;
  brand: string;
  host: string;
  port: number;
  username: string;
  channel: number;
  rtspUrl: string;
  snapshotUrl: string;
  tables: string;
  status: string;
  lastError: string | null;
  hasPassword: boolean;
  createdAt: string;
};

export async function apiFrame(path: string) {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(data.error || "No camera frame", res.status);
  }
  return res.blob();
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(opts.headers);
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`/api${path}`, { ...opts, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new ApiError(data.error || "Request failed", res.status);
  return data;
}
