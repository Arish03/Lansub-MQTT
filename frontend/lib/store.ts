import { create } from "zustand";

export interface LiveMessage {
  id?: string;
  topic: string;
  payload: any;
  value: number | null;
  ts: string;
  alert?: "high" | "low" | null;
}

export interface TopicState {
  latestPayload: any;
  latestValue: number | null;
  latestTs: string;
  latestAlert?: "high" | "low" | null;
  ringBuffer: Array<{ ts: string; value: number | null }>;
}

interface AppStore {
  wsConnected: boolean;
  messages: LiveMessage[];
  topicData: Record<string, TopicState>;
  brokerStatuses: Record<string, string>;
  activeAlerts: Record<string, "high" | "low">;

  setWsConnected: (connected: boolean) => void;
  setBrokerStatus: (brokerId: string, status: string) => void;
  addMessage: (msg: LiveMessage) => void;
  seedHistory: (topicPatternOrName: string, history: Array<{ ts: string; value: number | null }>) => void;
  reset: () => void;
}

export function topicMatches(pattern: string, topic: string): boolean {
  if (!pattern || !topic) return false;
  if (pattern === topic || pattern === "#") return true;

  const patternParts = pattern.split("/");
  const topicParts = topic.split("/");

  let i = 0;
  const pLen = patternParts.length;
  const tLen = topicParts.length;

  while (i < pLen && i < tLen) {
    const p = patternParts[i];
    const t = topicParts[i];

    if (p === "#") return true;
    if (p === "+") {
      i++;
      continue;
    }
    if (p !== t) return false;
    i++;
  }

  if (i === pLen - 1 && patternParts[i] === "#") {
    return true;
  }

  return i === pLen && i === tLen;
}

const MAX_RING_BUFFER = 300;
const MAX_LIVE_TABLE = 100;

export const useAppStore = create<AppStore>((set) => ({
  wsConnected: false,
  messages: [],
  topicData: {},
  brokerStatuses: {},
  activeAlerts: {},

  setWsConnected: (connected) => set({ wsConnected: connected }),

  setBrokerStatus: (brokerId, status) =>
    set((state) => ({
      brokerStatuses: { ...state.brokerStatuses, [brokerId]: status },
    })),

  addMessage: (msg) =>
    set((state) => {
      // Auto-extract numeric metric value - handles nested/double-encoded raw payloads
      function deepExtract(raw: any): number | null {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === "number" && !isNaN(raw)) return raw;
        if (typeof raw === "string") {
          const n = Number(raw);
          if (!isNaN(n)) return n;
          try { return deepExtract(JSON.parse(raw)); } catch { return null; }
        }
        if (typeof raw === "object") {
          if ("raw" in raw) { const r = deepExtract(raw.raw); if (r !== null) return r; }
          for (const k of ["value", "temp", "temperature", "reading", "val", "data", "metric", "humidity", "pressure", "current", "voltage", "level", "speed"]) {
            if (k in raw && raw[k] !== null && raw[k] !== undefined) {
              const v = typeof raw[k] === "number" ? raw[k] : Number(raw[k]);
              if (!isNaN(v)) return v;
            }
          }
          for (const v of Object.values(raw as Record<string, any>)) {
            if (typeof v === "number" && !isNaN(v)) return v;
            if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
          }
        }
        return null;
      }

      let resolvedValue = msg.value;
      if (resolvedValue === null || resolvedValue === undefined) {
        resolvedValue = deepExtract(msg.payload);
      }

      const enrichedMsg = { ...msg, value: resolvedValue !== undefined ? resolvedValue : null };

      // 1. Append to global messages list
      const newMessages = [enrichedMsg, ...state.messages.slice(0, MAX_LIVE_TABLE - 1)];

      // 2. Identify all topic entries to update: the exact topic + any wildcard patterns
      const newTopicData = { ...state.topicData };
      const newActiveAlerts = { ...state.activeAlerts };
      const keysToUpdate = new Set<string>([msg.topic]);

      if (msg.alert) {
        newActiveAlerts[msg.topic] = msg.alert;
      } else if (newActiveAlerts[msg.topic]) {
        delete newActiveAlerts[msg.topic];
      }

      for (const existingKey of Object.keys(state.topicData)) {
        if (topicMatches(existingKey, msg.topic)) {
          keysToUpdate.add(existingKey);
        }
      }

      for (const key of Array.from(keysToUpdate)) {
        const existing = newTopicData[key] || {
          latestPayload: null,
          latestValue: null,
          latestTs: "",
          ringBuffer: [],
        };

        const updatedBuffer = [
          ...existing.ringBuffer,
          { ts: msg.ts, value: resolvedValue },
        ];
        if (updatedBuffer.length > MAX_RING_BUFFER) {
          updatedBuffer.splice(0, updatedBuffer.length - MAX_RING_BUFFER);
        }

        newTopicData[key] = {
          latestPayload: msg.payload,
          latestValue: resolvedValue !== undefined ? resolvedValue : null,
          latestTs: msg.ts,
          latestAlert: msg.alert || null,
          ringBuffer: updatedBuffer,
        };
      }

      return {
        messages: newMessages,
        topicData: newTopicData,
        activeAlerts: newActiveAlerts,
      };
    }),

  seedHistory: (topicName, history) =>
    set((state) => {
      const existing = state.topicData[topicName] || {
        latestPayload: null,
        latestValue: null,
        latestTs: "",
        ringBuffer: [],
      };
      return {
        topicData: {
          ...state.topicData,
          [topicName]: {
            ...existing,
            ringBuffer: history.slice(-MAX_RING_BUFFER),
            latestValue: history.length ? history[history.length - 1].value : null,
            latestTs: history.length ? history[history.length - 1].ts : "",
          },
        },
      };
    }),

  reset: () => set({ messages: [], topicData: {}, brokerStatuses: {} }),
}));
