// Cliente API para el navegador (Client-Side)
// No usar en Server Actions - usar auth-helpers.ts para server actions

import { API_URL } from "./config";

export async function apiClient<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("access_token")
    : null;

  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  // Si es 401, redirigir a login
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  }

  // Parsear JSON si hay body
  const data = response.headers.get("content-length") !== "0"
    ? await response.json()
    : null;

  if (!response.ok) {
    throw { response: { data, status: response.status } };
  }

  return { data };
}

// Métodos helper
apiClient.get = <T = any>(endpoint: string) => apiClient<T>(endpoint, { method: "GET" });
apiClient.post = <T = any>(endpoint: string, body?: any) =>
  apiClient<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined });
apiClient.patch = <T = any>(endpoint: string, body?: any) =>
  apiClient<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
apiClient.delete = <T = any>(endpoint: string) => apiClient<T>(endpoint, { method: "DELETE" });
