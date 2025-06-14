import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token from localStorage if available
  const authToken = localStorage.getItem('authToken');
  
  // Build headers with auth token if available
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  const baseApi = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
  // If caller already provides absolute or leading-slash path, keep it, otherwise prepend /api/
  let path = url as string;
  if (!path.startsWith('/')) {
    path = `/api/${path}`;
  }
  const fullUrl = `${baseApi}${path}`;

  const res = await fetch(fullUrl, {
    method,
    headers,
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
    // Get auth token from localStorage if available
    const authToken = localStorage.getItem('authToken');
    
    // Build headers object
    const headers: Record<string, string> = {};
    
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    const baseApi = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
    let path = queryKey[0] as string;
    if (!path.startsWith('/')) {
      path = `/api/${path}`;
    }
    const fullUrl = `${baseApi}${path}`;

    const res = await fetch(fullUrl, {
      headers,
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
