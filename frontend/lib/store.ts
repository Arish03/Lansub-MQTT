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
      // Auto-extract numeric metric value if not directly set
      let resolvedValue = msg.value;
      if (resolvedValue === null || resolvedValue === undefined) {
        if (typeof msg.payload === "number") {
          resolvedValue = msg.payload;
        } else if (typeof msg.payload === "object" && msg.payload !== null) {
          let p = msg.payload;
          if (typeof p.raw === "string") {
            try {
              p = JSON.parse(p.raw);
            } catch {}
          }
          if (typeof p === "object" && p !== null) {
            const v = p.value ?? p.temp ?? p.temperature ?? p.reading ?? p.val ?? p.data ?? p.metric;
            if (typeof v === "number") resolvedValue = v;
            else if (typeof v === "string" && !isNaN(Number(v))) resolvedValue = Number(v);
          }
        }
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
