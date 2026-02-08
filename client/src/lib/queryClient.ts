import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
    if (!res.ok) {
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            toast({
                title: "Требуется авторизация",
                description: data.message || "Необходимо авторизоваться для выполнения этого действия",
                variant: "destructive",
            });
            throw new Error(`401: Unauthorized`);
        }

        const data = await res.json().catch(() => null);
        const msg =
            (data && typeof data === "object" && (data as any).message) ||
            (data && typeof data === "object" && (data as any).error) ||
            res.statusText;
        throw new Error(`${res.status}: ${msg}`);
    }
}

export async function apiRequest(
    method: string,
    url: string,
    data?: unknown | undefined,
): Promise<Response> {
    const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
    ({ on401: unauthorizedBehavior }) =>
        async ({ queryKey }) => {
            const res = await fetch(queryKey.join("/") as string, {
                credentials: "include",
            });

            if (unauthorizedBehavior === "returnNull" && res.status === 401) {
                return null;
            }

            await throwIfResNotOk(res);
            return await res.json();
        };

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});