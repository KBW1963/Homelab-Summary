# Vision

Homelab Summary provides a unified, read-only view of a self-hosted infrastructure by collecting information from multiple systems, normalising it into a common model, and exposing that model through a stable API.

---

## The Problem

Self‑hosters run many services:

- Media servers (Plex, Jellyfin)
- Storage (TrueNAS)
- Virtualisation (Proxmox)
- Containers (Docker, Kubernetes)
- Networking (Tailscale, AdGuard)
- Automation (Home Assistant, Node‑RED)

Each service has its own:

- API
- Authentication
- Data format
- Health indicators

Monitoring them individually is time‑consuming and inconsistent.

---

## The Promise

> **"One API to monitor your entire homelab."**

The Homelab Summary:

- **Collects** health data from all your services.
- **Normalises** it into a consistent model.
- **Caches** it for fast, resilient access.
- **Exposes** it via a clean REST API.

Clients (dashboards, scripts, automation) can query a single endpoint and receive unified status information.

---

## Who It's For

- Homelab enthusiasts who run multiple services.
- Self‑hosters who want a unified view of their infrastructure.
- Anyone who wants to build dashboards without integrating dozens of APIs.
- Operators who need automation-friendly health endpoints.

---

## What It Is Not

- **Not a replacement** for monitoring, logging, or observability platforms.
- **Not a management tool** – it never modifies external systems.
- **Not comprehensive** – it exposes what's useful, not every metric.

It is designed to be consumed by other tools (Homepage, Grafana, Home Assistant, scripts) and to complement existing monitoring stacks.

---

## Guiding Principles

- **Read‑only** – never changes the state of other systems.
- **Secure** – authentication required, secrets in `.env`.
- **Decoupled** – collectors, state, and API are separate.
- **Extensible** – adding a new service does not require changing the API.
- **Self‑observable** – reports its own collector health.
- **Graceful** – degrades when upstream services fail.

These principles are defined in more detail in `philosophy.md`.

---

## The Architecture

The aggregator follows a clean separation of concerns:

Scheduler → Collector Manager → Collectors → Health Interpreter → HomelabState → API → Clients

- **Scheduler** – triggers collection on a fixed interval.
- **Collector Manager** – runs all collectors concurrently.
- **Collectors** – fetch and normalise data from external services.
- **HomelabState** – stores the latest results in memory.
- **API** – reads from the state and serves clients.

This design ensures:

- Fast API responses (cache reads are instant).
- Resilience (collector failures don't affect the API).
- Extensibility (adding a collector never requires API changes).

See `architecture.md` for full details.

---

## The Future

The aggregator is designed to grow with your homelab.

Planned additions include:

- More collectors (Docker, Kuma, WUD, Backups, Media streams).
- Optional persistent storage (SQLite) for historical trends.
- Web UI (optional, lightweight).

But the core principles will remain unchanged:

- **Read‑only**
- **Decoupled**
- **Extensible**
- **Self‑observable**

---

## Conclusion

The Homelab Summary is a lightweight, secure, and extensible tool that gives you a unified view of your infrastructure health. It is built for self‑hosters who want simplicity, reliability, and control.

**One API to monitor your entire homelab.**
