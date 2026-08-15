# Philosophy

This guide outlines a set of principles that shape every design decision.

---

## 1. Read‑only by design

The service never changes the state of another system.

It may query APIs, but it never performs actions such as:

- restarting containers
- starting or stopping VMs
- deleting snapshots
- updating software
- acknowledging alerts

Every integration uses the minimum permissions required to read status information.

---

## 2. Security first

Every decision should default to the safest option.

That means:

- least‑privilege API tokens
- HTTPS support (via reverse proxy)
- authentication required for all endpoints (except `/health` and `/homepage`)
- secrets stored in `.env`, never in code
- no credentials exposed through the API
- input validation on all parameters
- no arbitrary command execution
- **redaction** – sensitive information (IPs, MACs) can be automatically redacted from API responses via the `REDACT_IPS` configuration flag.

---

## 3. Decoupled architecture

The system is split into three distinct layers:

1. **Collection** – the `Scheduler` and `CollectorManager` run collectors on a fixed interval.
2. **State** – `HomelabState` holds the latest results in memory.
3. **Presentation** – the Fastify API reads from the state and serves clients.

Collectors never know the API exists. The API never calls collectors directly. All communication happens through `HomelabState`.

This decoupling ensures:

- The API remains fast (cache reads are instant).
- A slow collector never blocks the API.
- Adding a new collector never requires changing the API.

---

## 4. API‑first

The Homepage widget is a client, not the product.

Anything that can make an HTTP request should be able to consume the API:

- Homepage
- Grafana
- Home Assistant
- custom mobile apps
- shell scripts
- automation tools

All data is exposed as JSON over HTTP. Authentication is via the `X-API-Key` header.

---

## 5. Normalise data

Every upstream API is different.

Our job is to make them consistent.

For example:

Proxmox → CPU: 0.23
Docker → CPUPercent: 23
TrueNAS → cpu_usage: 23.1

becomes:

```json
{ "cpu": 23 }
```

---

## 6. Health vs. Information

Homelab Summary distinguishes between **operational health** and **informational conditions**.

- **Operational health** – is the service working correctly? This is determined by **warnings** and **critical** findings.
- **Informational conditions** – are there updates available? Is there a recommended action? These are **informational** findings.

### Why this distinction matters

A service with an available update is **not broken**. It should not be flagged as `DEGRADED` or `DOWN`. It is simply informing the operator that maintenance is available.

Conversely, a service with a failing health check is **not fully operational**. It should be flagged as `DEGRADED`.

### Severity Hierarchy

The aggregator uses a strict hierarchy to combine findings:

CRITICAL → Service is DOWN
WARNING → Service is DEGRADED
INFO → Service is UP (if no higher severity exists)

When multiple findings exist, the **highest severity** determines the overall state:

| Findings Present | Overall Status | Severity   |
| ---------------- | -------------- | ---------- |
| Info only        | `UP`           | `info`     |
| Warning + Info   | `DEGRADED`     | `warning`  |
| Critical + Any   | `DOWN`         | `critical` |

### Examples

| Observation          | Category       | Severity   | Effect                      |
| -------------------- | -------------- | ---------- | --------------------------- |
| New update available | `update`       | `info`     | No effect on health.        |
| Health check failing | `health`       | `warning`  | Service becomes `DEGRADED`. |
| Connection refused   | `connectivity` | `critical` | Service becomes `DOWN`.     |

### Impact on the Product

This principle ensures that the Homelab Summary provides **accurate, actionable conclusions**, not just a mirror of raw statuses. It prevents false alarms (e.g., "Update available" does not mean "Homelab is broken") and gives operators confidence that **warnings** and **critical** findings genuinely require attention.

---

## 7. Cache intelligently

The service polls upstream systems on a schedule and caches the results in HomelabState.

Clients only ever read the cache.

Benefits include:

- lower API load
- faster responses
- resilience if an upstream service is temporarily unavailable
- predictable performance

---

## 8. Opinionated, not comprehensive

We're not trying to expose every field from every API.

Instead, we expose what is useful for answering questions like:

- Is my homelab healthy?
- Is anything offline?
- Are updates available?
- Is storage healthy?
- Are backups succeeding?
- Is media streaming working?

## If someone needs every metric from Proxmox, they should query the Proxmox API directly.

---

## 9. Extensible

Adding a new collector should require:

1. Creating one file in src/collectors/
2. Registering it in the CollectorManager
3. Adding configuration variables to .env

Nothing else.

If adding support for a new service requires changes throughout the project, we've designed it poorly.

---

## 10. Graceful degradation

In a homelab, it's common for one service to be offline temporarily. If, for example, Jellyfin is down or the TrueNAS API is unreachable, the entire API shouldn't fail.

Instead:

- The collector returns an error status.
- HomelabState retains the last successful data.
- The API returns stale data with an indication of the error.
- The /collectors endpoint shows the health of each collector.

Example response from /collectors:

```json
{
  "collectors": {
    "truenas": {
      "name": "truenas",
      "status": "degraded",
      "lastRun": "2026-08-02T10:00:00.000Z",
      "duration": 512,
      "errors": 1,
      "lastError": "Connection timeout"
    },
    "plex": {
      "name": "plex",
      "status": "healthy",
      "lastRun": "2026-08-02T10:00:02.000Z",
      "duration": 245,
      "errors": 0,
      "lastError": null
    }
  }
}
```

## Consumers can distinguish between "the aggregator is broken" and "one upstream dependency is temporarily unavailable."

## 11. The Collector Manager

Collectors are not invoked directly by routes. Instead, a CollectorManager:

- Discovers all registered collectors.
- Executes them concurrently using Promise.allSettled.
- Wraps each result in a CollectorResult<T> (with metadata).
- Reports health of each collector.

The Scheduler simply calls collectorManager.runAll(). It never knows which collectors exist.

---

## 12. Collector Development Standard

Every collector should follow the same structure, lifecycle, and coding standards.

A collector should only answer three questions:

1. Can I connect?
2. What is the current state?
3. How do I translate it into the common model?

It should never:

- modify the remote system
- know about Homepage or any client
- call another collector
- format UI output
- store historical data

---

### Collector Interface

Every collector implements the same pattern:

```typescript
export async function getMyServiceStatus(
  config: any,
): Promise<CollectorResult<MyData>> {
  const start = Date.now();
  try {
    // 1. Fetch data from the external API
    // 2. Normalise it
    // 3. Return CollectorResult
  } catch (err) {
    // Return error result
  }
}
```

---

### Collector Template

Each collector is a single file in src/collectors/:

```
src/collectors/
├── plex.ts
├── jellyfin.ts
├── radarr.ts
├── sonarr.ts
├── prowlarr.ts
├── sabnzbd.ts
├── seerr.ts
├── truenas.ts
├── proxmox.ts
├── network.ts
└── services.ts   (aggregates the all application services)
```

No subfolders, no separate client.ts or mapper.ts – keep it simple.

### Collector Checklist

Before a collector is accepted, it should meet a simple checklist:

✅ Read-only
✅ Uses least-privilege credentials
✅ Has sensible timeouts
✅ Handles API failures gracefully
✅ Returns partial results when appropriate
✅ Maps data to the common schema
✅ Documents required API permissions
✅ Documents any known limitations

---

## 13. The defining Rules of a Collector

1. A collector has one responsibility.
2. A collector is read‑only.
3. A collector never modifies an external system.
4. A collector never exposes an API endpoint.
5. A collector returns normalised data.
6. A collector must fail gracefully.
7. A collector must respect timeouts.
8. A collector must never block other collectors.
9. A collector must document its required permissions.
10. A collector must be independently testable.
11. A collector must not depend on another collector.
12. A collector must be replaceable without changing the API.
13. A collector must declare its capabilities.
14. A collector must report its own health.

These rules are the foundation of the project's architecture.

---

## 14. Configuration Convention

All configuration is driven by environment variables (.env).

No collector invents its own configuration style.

Example:

```
PLEX_URL=http://192.168.0.226:32400/identity
PLEX_TOKEN=your-token
```

Collectors read configuration from the config object passed to their collect function.

---

## 15. The Aggregator is a Tool, Not a Platform

It does one thing well: collect and normalise infrastructure health data.

It does not replace monitoring, logging, or observability platforms. It is designed to be consumed by them.

---

## 16. Convenience over Complexity

The API is designed to be general‑purpose, but where a specific client (like Homepage) benefits from a simplified response, we provide a dedicated endpoint (e.g., `/homepage`). This keeps the core API clean while making integration trivial for common use cases. Such endpoints may be exempt from authentication when they are public‑facing and contain no sensitive data.

---

## 17. Health Interpreter

The Health Interpreter is a dedicated layer that applies a consistent set of rules to turn raw findings into an overall health conclusion. It:

- Separates **informational** (`info`) conditions from **warnings** and **critical** issues.
- Applies a strict severity hierarchy:
  - `critical` → `DOWN`
  - `warning` → `DEGRADED`
  - `info` only → `UP`
  - Produces a **summary**, **impact** statement, and **recommended action** for operators.

This layer ensures that the aggregator does not simply mirror raw statuses, but instead provides **actionable conclusions**. It also makes the system transparent – an operator can always trace a conclusion back to the underlying findings.

## Testing the Interpreter

A dedicated test endpoint (`/test-health`) allows developers to simulate different health scenarios and verify the interpreter's behaviour without manipulating real services. This is essential for regression testing and onboarding new contributors.

## See [`test-health.md`](./test-health.md) for details.

## 18. User‑Friendly Messaging

The aggregator strips internal source names (e.g., UpdateCheck, NotificationStatusCheck) from service labels, replacing them with clean, human‑readable text.

- Updates appear first – they are the most actionable.
- Notifications appear second – they are informational.

This ensures that dashboards remain intuitive and free of technical jargon, while still conveying the full context of each finding.

Example label format:

UP — New update available: v4.0.19.3001 | All notifications unavailable

This makes the aggregator suitable for both technical operators and novice users.
