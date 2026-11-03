# PRD: Realtime MQTT Dashboard

## 1. Overview

A web dashboard that connects to an MQTT broker through a Python backend, lets the user choose which topics to subscribe to from the UI, and streams incoming data to the browser in realtime over WebSocket. Clean, modern, white-theme interface.

## 2. Problem

Viewing MQTT data usually means CLI tools (`mosquitto_sub`) or heavy platforms (Grafana, Node-RED). Users want a lightweight, self-hosted dashboard where adding a topic takes seconds and no code.

## 3. Target Users

- Makers and IoT engineers monitoring sensors.
- Small factories / agencies delivering monitoring to clients.
- Developers testing MQTT devices.

## 4. Goals and Non-Goals

**Goals**
- Add a broker and topics from the UI, no restart or code change.
- Live values and charts with under 1 s end-to-end latency.
- Store history and show it in charts.
- Modern, responsive, light UI.

**Non-Goals (v1)**
- Device provisioning / firmware OTA.
- Alert engine with SMS/email (v2).
- Multi-tenant billing.
- Mobile native app.

## 5. User Stories

1. As a user, I add my broker (host, port, credentials, TLS) and see connection status.
2. As a user, I add a topic (supports `+` and `#`) and immediately see messages arriving.
3. As a user, I choose how a payload is read (number, text, JSON with a path like `$.temp`).
4. As a user, I add widgets (line chart, gauge, stat card, table) and bind them to topics.
5. As a user, I arrange and resize widgets on a dashboard and it persists.
6. As a user, I view the last hour/day/week of a topic in a chart.
7. As a user, I pause the live stream and inspect raw messages.
8. As a user, I publish a message to a topic (e.g. toggle a relay).
9. As an admin, I log in securely; others cannot see my data.

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Multiple broker connections (Mosquitto, EMQX, HiveMQ Cloud) with TLS, connection test, live status | P0 |
| F2 | Topic CRUD; backend subscribes/unsubscribes at runtime | P0 |
| F3 | WebSocket live stream to the browser | P0 |
| F4 | Widgets: line chart, stat card, gauge, message table | P0 |
| F5 | Persist messages in Postgres, query history | P0 |
| F6 | Multi-user auth (signup/login, JWT) with per-user data isolation | P0 |
| F7 | Drag/resize grid layout, multiple dashboards | P1 |
| F8 | Publish/control widget (switch, button) | P0 |
| F9 | JSON path extraction and units | P1 |
| F10 | Data retention settings per topic | P1 |
| F11 | Export history as CSV | P2 |
| F12 | Threshold alerts | P2 |
| F13 | Dark mode toggle | P2 |

## 7. Non-Functional Requirements

- **Latency:** broker to browser under 500 ms typical.
- **Throughput:** 500 msg/s sustained on a 2 vCPU VM.
- **Reliability:** auto-reconnect for MQTT and WebSocket; no data loss on brief DB slowdowns (queue).
- **Security:** secrets encrypted, HTTPS/WSS, per-user data isolation.
- **Usability:** first data on screen within 2 minutes of signup.
- **Browser:** latest Chrome, Edge, Safari, Firefox; responsive down to tablet.

## 8. UX / Design Direction

- White background (`#FFFFFF`), subtle gray surfaces (`#F8FAFC`), 1px borders (`#E2E8F0`), one accent color (indigo or blue).
- Inter font, 8px spacing grid, rounded-xl cards, soft shadows.
- Layout: left sidebar (Dashboards, Topics, Brokers, Settings), top bar with connection badge.
- Live indicators: green pulse dot, value flash on update.
- Empty states with a clear "Add your first topic" action.

### Key Screens
1. Login
2. Dashboard (widget grid)
3. Topics (table + add drawer with live preview)
4. Brokers (list + test connection)
5. Topic detail (raw message log + history chart)

## 9. Success Metrics

- Time from broker add to first live value under 2 minutes.
- Dropped-message rate under 0.1% in load test.
- UI stays at 50+ fps with a 100 msg/s topic.

## 10. Risks

| Risk | Mitigation |
|---|---|
| High-rate topics freeze UI | Throttle renders, ring buffers, downsample on server |
| DB growth | Retention + Timescale compression |
| Broker credential leak | Encrypt at rest, never send to browser |
| Wildcard `#` floods system | Per-topic rate cap and warning in UI |

## 11. Decisions (resolved)

- **Users:** multi-user accounts in v1, no teams. All data is owned by a user.
- **Brokers:** Mosquitto, EMQX and HiveMQ Cloud are all supported from day one; a user can add several broker connections.
- **Control:** publish/control is in the MVP (Switch and Button widgets).
