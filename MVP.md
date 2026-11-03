# MVP: Realtime MQTT Dashboard (updated)

**Goal:** A working app where multiple users sign in, connect to Mosquitto, EMQX and HiveMQ Cloud, add topics in the UI, watch live data and history in a clean white dashboard, and publish messages to control devices.

## Decisions Locked In

| Question | Decision | Impact |
|---|---|---|
| Users | **Multi-user** (signup/login, no teams) | `user_id` on brokers, topics, dashboards, widgets; every query filtered by owner; WS clients only receive their own topics |
| Brokers | **All three: Mosquitto, EMQX, HiveMQ Cloud** | Multiple broker connections per user, one MQTT client per broker; TLS (8883) + username/password required for HiveMQ Cloud |
| Control | **Publish in MVP** | `POST /publish` + Switch and Button widgets |

## In Scope

1. Signup / login (email + password, JWT), per-user data isolation.
2. Broker CRUD: add several brokers, TLS toggle, test connection, live status badge per broker.
3. Topic CRUD per broker: wildcards, QoS, payload format (number / text / JSON path).
4. Live stream via WebSocket, scoped to the logged-in user.
5. Widgets: Stat card, Line chart, Live message table, **Switch/Button (publish)**.
6. One dashboard per user with simple auto grid (no drag/resize).
7. Store messages in PostgreSQL; history chart (1h / 24h / 7d).
8. Docker Compose: Mosquitto + Postgres + backend + frontend (EMQX and HiveMQ Cloud are added as broker entries in the UI; EMQX can be an extra compose service).

## Out of Scope (after MVP)

Drag/resize layout, multiple dashboards, alerts, CSV export, dark mode, teams/roles, Timescale, password reset email.

## Broker Notes

| Broker | Typical settings |
|---|---|
| Mosquitto | `host:1883`, optional user/pass |
| EMQX | `host:1883` (or 8883 TLS), user/pass via built-in auth |
| HiveMQ Cloud | `xxxx.s1.eu.hivemq.cloud:8883`, TLS **on**, user/pass required |

Publish control widget: sends `{topic, payload, qos, retain}` through the backend to the chosen broker; the backend checks the topic belongs to that user.

## Definition of Done

- `docker compose up` starts everything; two different users see only their own data.
- Adding topic `test/#` and running `mosquitto_pub -t test/temp -m 25` shows the value live within 1 s.
- Same flow works on EMQX and HiveMQ Cloud.
- A Switch widget publishes `ON`/`OFF` and the message is visible on the broker.
- Refresh keeps topics, widgets, history. Broker restart: auto reconnect and resubscribe.

## Build Order (time-boxed, about 4 hours)

| Step | Time | Deliverable |
|---|---|---|
| 1 | 30 min | Repo, Docker Compose, Postgres models, FastAPI skeleton, auth (signup/login/JWT) |
| 2 | 40 min | Broker and topic CRUD with `user_id` ownership |
| 3 | 50 min | MQTT manager: one client per broker, TLS, dynamic subscribe, reconnect |
| 4 | 30 min | WS hub (per-user fan-out) + batch DB writer + `POST /publish` |
| 5 | 40 min | Next.js shell, white theme, login, Brokers and Topics pages |
| 6 | 50 min | Live table, stat card, line chart, switch widget, history endpoint |

If time runs short, cut in this order: history range options, line chart styling, signup polish. Do **not** cut user isolation or publish.

## Test Plan

- Unit: wildcard matcher, JSON path extractor, ownership checks.
- Integration: publish via script, assert WS receives and DB stores; second user cannot read the first user's topics.
- Manual: connect all three brokers, toggle a switch, restart a broker.
