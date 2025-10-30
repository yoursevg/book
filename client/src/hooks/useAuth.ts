import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getMe, login as loginApi, register as registerApi, logout as logoutApi, type SafeUser } from "@/api/auth";

export function useMeQuery() {
  // We can either use getQueryFn({ on401: "returnNull" }) or call getMe()
  return useQuery<SafeUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string }) => loginApi(data),
    onSuccess: (user) => {
      qc.setQueryData(["/api/auth/me"], user);
    },
  });
}

export function useRegisterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; email?: string; password: string }) => registerApi(data),
    onSuccess: (user) => {
      qc.setQueryData(["/api/auth/me"], user);
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      // Optionally invalidate other queries that depend on auth
    },
  });
}
