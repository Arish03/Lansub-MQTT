declare const process: any;

export function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        const port = envUrl && envUrl.includes(":") ? envUrl.split(":").pop()?.replace(/\D/g, "") || "7001" : "7001";
        return `${window.location.protocol}//${window.location.hostname}:${port}`;
      }
    }
    if (envUrl) return envUrl;
    return `${window.location.protocol}//${window.location.hostname}:7001`;
  }
  return envUrl || "http://localhost:7001";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || "Request failed");
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: any) => request<{ access_token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => request<{ access_token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request<any>("/api/auth/me"),

  // Brokers
  getBrokers: () => request<any[]>("/api/brokers"),
  createBroker: (data: any) => request<any>("/api/brokers", { method: "POST", body: JSON.stringify(data) }),
  updateBroker: (id: string, data: any) => request<any>(`/api/brokers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBroker: (id: string) => request<void>(`/api/brokers/${id}`, { method: "DELETE" }),
  testBroker: (data: any) => request<{ success: boolean; message: string }>("/api/brokers/test", { method: "POST", body: JSON.stringify(data) }),

  // Topics
  getTopics: () => request<any[]>("/api/topics"),
  createTopic: (data: any) => request<any>("/api/topics", { method: "POST", body: JSON.stringify(data) }),
  updateTopic: (id: string, data: any) => request<any>(`/api/topics/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTopic: (id: string) => request<void>(`/api/topics/${id}`, { method: "DELETE" }),
  getTopicHistory: (topicId: string, range = "1h", limit = 300) =>
    request<any[]>(`/api/topics/${topicId}/history?range=${range}&limit=${limit}`),
  exportTopicHistoryCsv: async (topicId: string, range = "24h") => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}/api/topics/${topicId}/export-csv?range=${range}`, { headers });
    if (!res.ok) throw new Error("Failed to export CSV");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topic_export_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Dashboards & Widgets
  getDashboard: () => request<any>("/api/dashboards"),
  createWidget: (data: any) => request<any>("/api/dashboards/widgets", { method: "POST", body: JSON.stringify(data) }),
  updateWidget: (id: string, data: any) => request<any>(`/api/dashboards/widgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWidget: (id: string) => request<void>(`/api/dashboards/widgets/${id}`, { method: "DELETE" }),

  // Publish
  publish: (data: { broker_id: string; topic: string; payload: any; qos?: number; retain?: boolean }) =>
    request<{ success: boolean; message: string }>("/api/publish", { method: "POST", body: JSON.stringify(data) }),
};
