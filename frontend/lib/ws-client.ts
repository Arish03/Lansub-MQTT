declare const process: any;
import { getToken } from "./api";
import { useAppStore } from "./store";

function getWsBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        const port = envUrl && envUrl.includes(":") ? envUrl.split(":").pop()?.split("/")[0]?.replace(/\D/g, "") || "7001" : "7001";
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProto}//${window.location.hostname}:${port}/ws`;
      }
    }
    if (envUrl) return envUrl;
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${window.location.hostname}:7001/ws`;
  }
  return envUrl || "ws://localhost:7001/ws";
}

class WSClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private subscribedPatterns: Set<string> = new Set();
  private isExplicitlyClosed = false;

  connect() {
    if (typeof window === "undefined") return;
    const token = getToken();
    if (!token) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const url = `${getWsBase()}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("WS connection error:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      useAppStore.getState().setWsConnected(true);
      // Resubscribe to patterns
      if (this.subscribedPatterns.size > 0) {
        this.send({
          action: "subscribe",
          topics: Array.from(this.subscribedPatterns),
        });
      }
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          useAppStore.getState().addMessage({
            topic: data.topic,
            payload: data.payload,
            value: data.value,
            ts: data.ts,
            alert: data.alert,
          });
        } else if (data.type === "broker_status") {
          useAppStore.getState().setBrokerStatus(data.broker_id, data.status);
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    this.ws.onclose = () => {
      useAppStore.getState().setWsConnected(false);
      this.stopHeartbeat();
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      this.ws?.close();
    };
  }

  subscribe(patterns: string[]) {
    patterns.forEach((p) => this.subscribedPatterns.add(p));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ action: "subscribe", topics: patterns });
    }
  }

  unsubscribe(patterns: string[]) {
    patterns.forEach((p) => this.subscribedPatterns.delete(p));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ action: "unsubscribe", topics: patterns });
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useAppStore.getState().setWsConnected(false);
  }

  private send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send({ action: "ping" });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }
}

export const wsClient = new WSClient();
