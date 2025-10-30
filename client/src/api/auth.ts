import { apiRequest } from "@/lib/queryClient";

export type SafeUser = { id: string; username: string; email: string | null };

export async function getMe(): Promise<SafeUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as SafeUser;
}

export async function login(data: { username: string; password: string }): Promise<SafeUser> {
  const res = await apiRequest("POST", "/api/auth/login", data);
  return (await res.json()) as SafeUser;
}

export async function register(data: { username: string; email?: string; password: string }): Promise<SafeUser> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  return (await res.json()) as SafeUser;
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}
