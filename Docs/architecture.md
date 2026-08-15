# Architecture

This document describes the high‑level structure of the aggregator. It explains the components, their responsibilities, and how they interact.

## Diagram

```mermaid
graph TD
    EXT["EXTERNAL SERVICES"] --> CORE

    subgraph CORE ["AGGREGATOR CORE"]
        SCHED["SCHEDULER<br/>(Runs on a fixed interval)"]
        CM["COLLECTOR MANAGER<br/>• Discovers all collectors<br/>• Executes them concurrently<br/>• Collects results and health"]

        subgraph COLLECTORS ["COLLECTORS"]
            direction HORIZONTAL
            Plex["Plex"]
            Jellyfin["Jellyfin"]
            Sonarr["Sonarr"]
            Radarr["Radarr"]
            TrueNAS["TrueNAS"]
            Netw["Netw."]
        end

        INTERP["HEALTH INTERPRETER<br/>• Turns findings into health state<br/>• Applies severity rules<br/>• Produces summary/impact/action"]

        STATE["HOMELAB STATE<br/>(Cache)"]
        API["FASTIFY API"]

        SCHED --> CM
        CM --> COLLECTORS
        COLLECTORS --> INTERP
        INTERP --> STATE
        STATE --> API
    end

    CORE --> CLI["CLIENTS"]
```

---

## 1. System Overview

The aggregator is a read-only state aggregation service. It periodically collects infrastructure health information, normalises it into a common data model, stores the current Homelab State, and exposes that state through a REST API.

---

## 2. Core Components

### 2.1 Collectors

Collectors are standalone, read‑only functions that fetch data from a single external service and return a normalised `CollectorResult<T>`.

**Characteristics:**

- **One responsibility** – each collector targets exactly one service.
- **No dependencies** – they do not depend on other collectors.
- **Read‑only** – they never modify the external service.
- **Self‑contained** – they handle their own timeouts, retries, and error reporting.
- **Stateless** – they do not store any data between runs.
- **Capability‑aware** – each collector declares what data it provides (health, version, updates, etc.) via a `capabilities` field (Rule 13).

**Example:**

```typescript
export const plexCapabilities = {
  provides: ["health", "version"],
  requires: ["read:status"],
  dataFreshness: "30s",
};

export async function getPlexStatus(
  config: any,
): Promise<CollectorResult<PlexStatus>> {
  // fetch and normalise
}
```

---

## Collector outputs are defined in data-model.md.

### 2.2 Scheduler

The scheduler triggers the collection process. It:

- Runs all enabled collectors concurrently according to the configured polling interval.
- Calls collectorManager.runAll().
- Receives the results and updates HomelabState.
- Does not know which collectors exist – that's the Manager's job.

---

### 2.3 Collector Manager

The Collector Manager orchestrates all collectors. It:

- Discovers collectors (e.g., from a registry or file system scan).
- Executes them concurrently using Promise.allSettled.
- Wraps each collector call with timing and error handling.
- Returns an array of CollectorResult<T> (or aggregated results).
- Reports health of each collector (for /collectors endpoint).

```typescript
class CollectorManager {
  private collectors: Collector[] = [];

  register(collector: Collector) {
    this.collectors.push(collector);
  }

  async runAll(config: any): Promise<CollectorResult<any>[]> {
    const results = await Promise.allSettled(
      this.collectors.map(async (collector) => {
        const start = Date.now();
        try {
          const data = await collector.collect(config);
          return {
            collector: collector.id,
            data,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "success",
          };
        } catch (err) {
          return {
            collector: collector.id,
            data: null,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "error",
            error: err.message,
          };
        }

```

---

### 2.4 Health Interpreter

The Health Interpreter is a new layer that turns raw findings from collectors into a consistent health conclusion. It:

- Distinguishes between informational (info), warning, and critical findings.
- Applies a clear severity hierarchy:
  - critical → DOWN
  - warning → DEGRADED
  - info only → UP
- Produces a summary, impact statement, and recommendedAction.
- Ensures that informational conditions (like available updates) do not degrade the overall health status.

## This makes the aggregator "clever" without being complicated – it follows simple, documented rules.

### 2.5 Homelab State (Cache)

HomelabState is the single source of truth for the aggregator. It holds the latest results from every collector.

Characteristics:

- In‑memory – fast reads; ephemeral (rebuilt on restart).
- Immutable updates – the state is fully replaced on each scheduler run (or updated field‑by‑field).
- Type‑safe – structure defined in data-model.md.

```typescript
interface HomelabState {
  services: ServiceStatus[];
  truenas: TrueNASData | null;
  proxmox: ProxmoxData | null;
  network: NetworkData | null;
  collectorHealth: Record<string, CollectorHealth>;
}
```

---

### 2.6 Fastify API

The API is the public face of the aggregator. It:

- Exposes HTTP endpoints that read from HomelabState only.
- Enforces authentication via the X-API-Key header (except `/health` and `/homepage`).
- Returns JSON responses conforming to api.md.

Characteristics:

- Fast – all responses are cache reads; no external calls are made.
- Stateless – no session or request‑specific state.
- Observable – logs each request with duration and status code.

---

### 2.7 Configuration

All configuration is provided via environment variables (loaded from .env). The configuration schema is defined in src/config.ts and documented in README.md.

Key variables:

- PORT
- POLL_INTERVAL_MS
- API_KEY Or TOKEN
- REDACT_IPS
- Collector‑specific URLs and tokens (e.g., PLEX_URL, PROXMOX_HOST)

---

## 3. Data Flow

This is the collector lifecycle in action:

1. Scheduler starts (immediately on boot, then every POLL_INTERVAL_MS).

2. Collectors run – each collector:
   - Reads its configuration.
   - Connects to the external service.
   - Fetches and normalises data.
   - Returns a CollectorResult<T> containing findings.

3. Scheduler aggregates results – it passes the findings to the Health Interpreter.

4. Health Interpreter:

- Applies severity rules to determine overall status, severity, summary, impact, and recommendedAction.
- Updates the services field in HomelabState with the interpreted data.
- Updates collectorHealth with per‑collector health.

5. API receives a request – e.g., GET /summary or GET /health-overview.

6. API reads HomelabState and returns the appropriate JSON response.

7. Client (e.g., Homepage) displays the data.

---

## 4. Key Design Decisions

### 4.1 Decoupling of Collection and Presentation

- Collectors never know the API exists.
- The API never calls collectors directly.
- This separation allows the API to remain fast and resilient, and allows collectors to run independently.

---

### 4.2 CQRS‑Inspired Pattern

- Command – the scheduler writes to HomelabState.
- Query – the API reads from HomelabState.
- This enables different scaling strategies (e.g., increasing poll frequency without affecting API performance).

---

### 4.3 Single Source of Truth

HomelabState is the only place where data is stored. This prevents inconsistencies and makes debugging easier.

---

### 4.4 Health Interpretation Rules

The health interpreter uses a simple hierarchy:

- **critical** → `DOWN`
- **warning** → `DEGRADED`
- **info only** → `UP`
- **Informational findings** (e.g., updates) do not degrade health.

## This ensures the system is transparent and predictable.

## 5. Relationships with Other Documents

| Document               | Relationship                                             |
| ---------------------- | -------------------------------------------------------- |
| vision.md              | Defines why the aggregator exists.                       |
| philosophy.md          | Defines the principles (e.g., the Rules of a Collector). |
| data-model.md          | Defines what data is exchanged.                          |
| collector-lifecycle.md | Defines how data flows through the collector.            |
| collector-template.md  | Defines how to add a new collector.                      |
| api.md                 | Defines how the data is exposed to clients.              |
| logging.md             | Defines how the application logs events.                 |
| security.md            | Defines how the application is secured.                  |

---

## 6. Conclusion

The architecture is built around decoupling, resilience, and extensibility. Each component has a single, well‑defined responsibility, and all communication happens through HomelabState.

This design ensures that:

- Adding a new collector never requires changing the API.
- The API remains fast regardless of the number of collectors.
- The system is observable and debuggable.
- Health interpretation is consistent and rule‑based.

The architecture is stable, but it is also designed to evolve as new collectors and use cases are added.
