# Project Plan: Realtime MQTT Dashboard

Companion docs: `PRD.md` (what), `MVP.md` (first release), `ARCHITECTURE.md` (how).

## Decisions

| Topic | Decision |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind + shadcn/ui, white theme |
| Backend | Python + FastAPI + aiomqtt |
| Database | PostgreSQL (TimescaleDB later) |
| Broker | Mosquitto to start |
| Realtime | Backend subscribes to MQTT, pushes to browser over WebSocket |
| Config | Brokers and topics managed from the dashboard UI |
| Users | Multi-user accounts, per-user data isolation |
| Brokers | Mosquitto, EMQX and HiveMQ Cloud, several connections per user |
| Control | Publish (Switch/Button widgets) in MVP |

## Timeline

### Phase 0: Setup (2 days)
- Monorepo: `frontend/`, `backend/`, `docker-compose.yml`, `.env.example`
- Postgres + Alembic migrations, FastAPI skeleton, CI lint/test

### Phase 1: Backend Core (4 days)
- Auth, broker and topic CRUD
- MQTT manager with runtime subscribe/unsubscribe and reconnect
- WebSocket hub, ingest queue, batch writes

### Phase 2: Frontend MVP (5 days)
- App shell, login, design tokens
- Topics page, live message table
- Stat card and line chart widgets, history endpoint

### Phase 3: Hardening (2 days)
- Load test, error states, reconnection tests
- README, Docker production build, deployment on VM

**Time-boxed MVP: about 4 hours of focused build (see MVP.md build order).** The phases above describe the full sequence; for the 4-hour version do only the MVP.md steps.

### Phase 4: V1 (next 3-4 weeks)
- Drag/resize layout, multiple dashboards, gauge widget
- Publish/control widget, JSON path UI, retention settings
- CSV export

### Phase 5: V2
- Alerts (email/webhook), dark mode, TimescaleDB, teams/roles, Redis for multi-instance

## Repo Layout

```
mqtt-dashboard/
  docker-compose.yml
  .env.example
  backend/    (FastAPI)
  frontend/   (Next.js)
  docs/       (PRD, MVP, ARCHITECTURE, PLAN)
```

## Environment Variables

```
DATABASE_URL=postgresql+asyncpg://app:app@db:5432/mqtt
JWT_SECRET=change-me
FERNET_KEY=change-me
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
MQTT_DEFAULT_HOST=mosquitto
MQTT_DEFAULT_PORT=1883
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Risks and Mitigations

- **UI overload from fast topics:** throttle rendering, ring buffers.
- **Scope creep:** hold the line on MVP.md; log new ideas in a V1 list.
- **DB growth:** retention from day one.

## Next Actions

1. Open questions are resolved (PRD section 11).
2. Scaffold the repo and Docker Compose.
3. Build Phase 1 steps 1 to 4 end to end with a CLI publisher before touching the UI.
