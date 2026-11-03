# Architecture: Realtime MQTT Dashboard

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui | Modern UI, light theme out of the box |
| Charts | uPlot (high-rate) or Recharts (simple) | uPlot handles thousands of points smoothly |
| Client state | Zustand + TanStack Query | Zustand for live stream, Query for REST config |
| Backend | Python 3.12, FastAPI, Uvicorn | Native async, WebSocket support |
| MQTT client | `aiomqtt` (asyncio wrapper over paho) | Fits FastAPI's event loop |
| Broker | Mosquitto (MVP) -> EMQX (scale) | Mosquitto is simple; EMQX adds clustering/auth |
| Database | **PostgreSQL** (+ **TimescaleDB** extension later) | See section 4 |
| ORM / migrations | SQLAlchemy 2 (async) + Alembic | Standard, typed |
| Auth | JWT (access + refresh), argon2 password hashing | Simple, stateless |
| Deploy | Docker Compose (nginx/Caddy reverse proxy) | One-command setup |

## 2. System Diagram

```
 IoT devices ──publish──▶ MQTT Broker (Mosquitto)
                               │ subscribe (dynamic topics)
                               ▼
                    ┌──────────────────────┐
                    │  FastAPI backend      │
                    │  ├ MQTT Manager       │  subscribe/unsubscribe at runtime
                    │  ├ Ingest Queue       │  asyncio.Queue, batched writes
                    │  ├ WS Hub             │  fan-out by topic "rooms"
                    │  └ REST API           │  brokers, topics, widgets, history
                    └───────┬──────────┬────┘
                   WebSocket│          │SQL
                            ▼          ▼
                  Next.js dashboard   PostgreSQL
```

## 3. Data Flow

1. User opens **Settings -> Topics**, adds `factory/+/temperature` (wildcards allowed).
2. Frontend `POST /api/topics`; backend saves it and tells the MQTT Manager to `subscribe()`.
3. Broker delivers a message -> MQTT Manager parses it (JSON or raw) -> pushes to:
   - **Ingest Queue** -> batch insert into `messages` every ~500 ms or 200 rows.
   - **WS Hub** -> sends to every WebSocket client watching a matching topic.
4. Browser receives `{topic, payload, ts}` over `/ws`, updates Zustand store, widgets re-render (throttled to ~10 fps).
5. Widget history (charts on page load) comes from `GET /api/topics/{id}/history?from=&to=&bucket=`.

## 4. Database Recommendation

**Use PostgreSQL.**

| | SQLite | MongoDB | PostgreSQL |
|---|---|---|---|
| Concurrent writes (MQTT ingest + API) | Weak (single writer) | Good | Great |
| Time-series queries (avg per minute) | Manual | Aggregation pipeline, clunky | SQL + `time_bucket` with Timescale |
| Flexible payloads | JSON1 (limited) | Native | `JSONB` (indexed, fast) |
| Relational config (users, widgets, dashboards) | OK | Awkward | Natural |
| Retention / compression | Manual | TTL index | Timescale policies |
| Ops effort | None | Medium | Medium |

Reasoning: you need relational data (users, dashboards, widgets) **and** high-volume time-series with flexible JSON payloads. Postgres does both with one engine. Start with plain Postgres plus a `(topic_id, ts DESC)` index; convert `messages` to a Timescale hypertable when volume grows. SQLite is fine only for a throwaway prototype. MongoDB adds a second paradigm without a clear win here.

### Schema (core)

```sql
users(id, email, password_hash, created_at)   -- multi-user; brokers/topics/dashboards/widgets all carry user_id

brokers(id, user_id, name, host, port, username, password_enc, tls, client_id, enabled)

topics(id, user_id, broker_id, pattern, label, qos, payload_format, -- json|text|number
       value_path,           -- e.g. "$.temp" for JSON extraction
       unit, retain_days, enabled, created_at)

messages(id, topic_id, topic, ts timestamptz, payload jsonb, value double precision)
  -- INDEX (topic_id, ts DESC); hypertable on ts when using Timescale

dashboards(id, user_id, name, layout jsonb)
widgets(id, dashboard_id, type, topic_id, config jsonb, position jsonb)
  -- type: line | gauge | stat | table | switch | map
```

## 5. API Surface

REST (prefix `/api`, JWT):

- `POST /auth/login`, `POST /auth/refresh`
- `GET/POST/PATCH/DELETE /brokers`
- `GET/POST/PATCH/DELETE /topics` (changes trigger live subscribe/unsubscribe)
- `GET /topics/{id}/history`
- `GET/POST/PATCH/DELETE /dashboards`, `/widgets`
- `POST /publish` (send a message to a topic, for switches/controls)
- `GET /health`

WebSocket `/ws?token=...`:

```jsonc
// client -> server
{"action":"subscribe","topics":["factory/+/temperature"]}
{"action":"unsubscribe","topics":["..."]}
// server -> client
{"type":"message","topic":"factory/a/temperature","payload":{"temp":24.1},"value":24.1,"ts":"2026-10-23T10:00:00Z"}
{"type":"status","broker":"connected"}
```

## 6. Backend Structure

```
backend/
  app/
    main.py            # FastAPI app, lifespan starts MQTT manager
    config.py          # pydantic-settings, env vars
    db.py              # async engine/session
    models/            # SQLAlchemy models
    schemas/           # Pydantic models
    api/               # routers: auth, brokers, topics, dashboards, history
    mqtt/manager.py    # connect, reconnect w/ backoff, dynamic subscribe
    mqtt/matcher.py    # MQTT wildcard (+ / #) matching
    ws/hub.py          # client registry, per-topic fan-out
    services/ingest.py # queue + batch writer
  alembic/
  tests/
  Dockerfile
```

## 7. Frontend Structure

```
frontend/
  app/
    (auth)/login
    dashboard/[id]/page.tsx    # widget grid
    settings/brokers
    settings/topics            # configure subscriptions here
  components/
    widgets/ (LineChart, Gauge, StatCard, TopicTable, Switch)
    layout/ (Sidebar, Topbar, ConnectionBadge)
  lib/
    ws-client.ts     # auto-reconnect, resubscribe, heartbeat
    store.ts         # Zustand: latest value + ring buffer per topic
    api.ts
```

## 8. Key Design Decisions

- **One MQTT client per broker connection** (Mosquitto, EMQX, HiveMQ Cloud), each with its own TLS settings, reconnect loop and status. Topics are routed to the client of their broker.
- **Multi-user isolation:** every query filters by `user_id`; the WS hub only delivers a message to clients whose user owns the matching topic.
- **Publish path:** `POST /publish` verifies the user owns the broker/topic, then publishes through that broker's client.

- **Backend is the only MQTT client.** Browsers never touch the broker; this keeps credentials server-side and allows history, auth, and throttling.
- **Ring buffer per topic in the browser** (e.g. last 500 points) so memory stays bounded.
- **Batch DB writes**; never insert per message.
- **Throttle UI renders** (requestAnimationFrame or 100 ms) so a 100 msg/s topic does not freeze the page.
- **Reconnect everywhere:** MQTT (exponential backoff), WebSocket (resubscribe on reconnect).
- **Retention:** nightly job deletes messages older than `retain_days`; Timescale policy replaces it later.

## 9. Security

- Broker passwords encrypted at rest (Fernet key from env).
- JWT in httpOnly cookie, CORS locked to frontend origin, WSS/HTTPS behind reverse proxy.
- Per-user authorization on topics and dashboards.
- Rate-limit `/publish` and login.

## 10. Scaling Path

1. Single instance: Mosquitto + FastAPI + Postgres (handles roughly thousands of msg/s).
2. Add TimescaleDB, compression, retention.
3. Multiple API instances: use Redis pub/sub to share WS fan-out; one shared MQTT subscription via MQTT shared subscriptions (`$share/group/topic`).
4. Swap Mosquitto for EMQX cluster.
