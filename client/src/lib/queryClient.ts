import { QueryClient, QueryFunction } from "@tanstack/react-query";
import axios from 'axios'; // Import axios

let currentAuthToken: string | null = null; // Biến để lưu trữ token hiện tại

export function setAuthTokenForApi(token: string | null) {
  currentAuthToken = token;
}

// Configure Axios to include the auth token in all requests
axios.interceptors.request.use((config) => {
  if (currentAuthToken) {
    config.headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

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
  // Centralized token management will be handled by a dedicated store.
  // This function will retrieve the token from the store.
  const token = localStorage.getItem('authToken'); // We'll replace this with a proper state manager later

  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const baseApi = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
  // If caller already provides absolute or leading-slash path, keep it, otherwise prepend /api/
  let path = url as string;
  if (!path.startsWith('/')) {
    path = `/api/${path}`;
  }
  const fullUrl = `${baseApi}${path}`;

  // For fetch requests, we still need to add headers manually, but axios calls will be covered by interceptor
  // This part is for the queryFn, which uses fetch. Axios is for direct calls.
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,

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
    // Build headers object - this is for fetch calls via react-query
    const headers: Record<string, string> = {};
    
    if (currentAuthToken) { // Sử dụng currentAuthToken thay vì localStorage
      headers["Authorization"] = `Bearer ${currentAuthToken}`;
    }
    
    const baseApi = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
    let path = queryKey[0] as string;
    if (!path.startsWith('/')) {
      path = `/api/${path}`;
    }
    const fullUrl = `${baseApi}${path}`;

    const res = await fetch(fullUrl, {
      headers,
  
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
