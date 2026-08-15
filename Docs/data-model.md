# Data Model

This document defines the core data structures used throughout the aggregator. Every collector, the scheduler, the cache, and the API must adhere to these definitions.

---

## 1. Core Types

### 1.1 HealthStatus

```typescript
type HealthStatus = "UP" | "DEGRADED" | "DOWN" | "UNKNOWN";
```

| Value    | Meaning                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------- |
| UP       | The service is fully operational and responding correctly.                                      |
| DEGRADED | The service is running but has warnings (e.g., an update is available, a component is failing). |
| DOWN     | The service is unreachable, returned an error, or is not functioning.                           |
| UNKNOWN  | The collector could not determine the status (e.g., no response, invalid format).               |

---

### 1.2 Finding

```typescript
interface Finding {
  category:
    | "health"
    | "update"
    | "connectivity"
    | "configuration"
    | "performance"
    | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  source?: string;
}
```

| Field    | Type                          | Description                                                              |
| -------- | ----------------------------- | ------------------------------------------------------------------------ |
| category | string                        | The aspect of the service affected (e.g., health, update, connectivity). |
| severity | 'info', 'warning', 'critical' | How severe the finding is. See severity rules below.                     |
| message  | string                        | Human‑readable description of the finding.                               |
| source   | string                        | Optional component (e.g., UpdateCheck, Notifications).                   |

Severity Rules

| Severity | Effect on Overall Health        | Example                                      |
| -------- | ------------------------------- | -------------------------------------------- |
| info     | No effect – service remains UP. | Update available.                            |
| warning  | Service becomes DEGRADED.       | Health check failing, configuration issue.   |
| critical | Service becomes DOWN.           | Service unreachable, infrastructure failure. |

When multiple findings exist, the highest severity wins:

- critical beats everything → DOWN
- warning beats info → DEGRADED
- info only → UP

### Message Formatting & Prioritisation

When multiple findings exist for a service, they are displayed in the following order:

1. Updates – most actionable (appear first).
2. Notifications – informational (appear second).
3. Other findings – appear last.

All messages are stripped of internal source names (e.g., UpdateCheck:, Notifications:) to ensure they are human‑readable and dashboard‑friendly.

---

### 1.3 ServiceStatus

```typescript
interface ServiceStatus {
  id: string;
  name: string;
  status: HealthStatus;
  lastUpdate: string; // ISO 8601 timestamp
  findings: Finding[]; // Collection of observations
  issue?: string | null; // Shortcut to the first finding message
  details?: Record<string, any>; // Additional info (version, warnings, etc.)
  error?: string; // Error message if status is not UP
}
```

Feilds:

| Field      | Type                | Required | Description                                                       |
| ---------- | ------------------- | -------- | ----------------------------------------------------------------- |
| id         | string              | Yes      | Unique identifier for the service (e.g., 'plex').                 |
| name       | string              | Yes      | Human-readable name (e.g., 'Starmedia Plex').                     |
| status     | HealthStatus        | Yes      | Current health status.                                            |
| lastUpdate | string              | Yes      | ISO 8601 timestamp of when the status was collected.              |
| findings   | Finding[]           | Yes      | Collection of observations from the collector (see 1.2 Finding).  |
| issue      | string or null      | No       | Shortcut to the first finding message (for quick display).        |
| details    | Record<string, any> | No       | Optional additional data (e.g., version, active streams, issues). |
| error      | string              | No       | Error message if the collector failed or the service is DOWN.     |

Example:

```json
{
  "id": "sonarr",
  "name": "Sonarr",
  "status": "UP",
  "lastUpdate": "2026-08-12T10:00:00.000Z",
  "findings": [
    {
      "category": "update",
      "severity": "info",
      "message": "New update available: v4.0.19.3001"
    },
    {
      "category": "health",
      "severity": "info",
      "message": "All notifications unavailable"
    }
  ],
  "issue": "New update available: v4.0.19.3001",
  "details": {
    "issues": [
      {
        "source": "UpdateCheck",
        "type": "warning",
        "message": "New update is available: v4.0.19.3001"
      }
    ]
  }
}
```

Note: findings contains the raw observations. The issue field is a convenience field that holds the first finding's message, making it easy to display in clients like Homepage without iterating over the array.

---

### 1.4 CollectorResult

```typescript
type CollectorResult = ServiceStatus | ServiceStatus[] | any;
```

A collector may return:

- A single ServiceStatus (e.g., Plex, Jellyfin, Sonarr).
- An array of ServiceStatus (e.g., the services collector that aggregates all three).
- A custom structure (e.g., TrueNAS returns { pools: [...] }, Proxmox returns { nodes: [...] }).

In all cases, the result must be normalised and well‑defined in this document.

---

### 1.5 CollectorError

```typescript
interface CollectorError {
  code: string;
  message: string;
  retryable: boolean;
}
```

| Field     | Type    | Description                                                                   |
| --------- | ------- | ----------------------------------------------------------------------------- |
| code      | string  | Machine-readable error code (e.g., 'ECONNREFUSED', 'TIMEOUT', 'AUTH_FAILED'). |
| message   | string  | Human-readable error description.                                             |
| retryable | boolean | Whether the error is likely temporary and should be retried.                  |

Example:

```json
{
  "code": "ECONNREFUSED",
  "message": "Connection refused to 192.168.0.20:8006",
  "retryable": true
}
```

---

### 1.5 CollectorHealth

The collectorHealth field in HomelabState is populated by the scheduler and exposed via /collectors. It provides per‑collector health, last run time, duration, error count, and last error message.

```typescript
interface CollectorHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastRun: string; // ISO 8601 timestamp
  duration: number; // milliseconds
  errors: number; // total error count since last reset
  lastError: string | null;
}
```

| Field     | Type        | Description                                                  |
| --------- | ----------- | ------------------------------------------------------------ |
| name      | string      | Collector identifier (e.g., 'proxmox').                      |
| status    | 'healthy'   | Collector is working without errors.                         |
|           | 'degraded'  | Collector is working but has errors (e.g., partial success). |
|           | 'unhealthy' | Collector is failing consistently.                           |
| lastRun   | string      | ISO 8601 timestamp of the last execution.                    |
| duration  | number      | Duration of the last run in milliseconds.                    |
| errors    | number      | Cumulative error count.                                      |
| lastError | string      | Error message from the last failure, or null if none.        |

Note: The scheduler logs health transitions (e.g., HEALTHY → DEGRADED) to the console when a collector's status changes. This provides real‑time
operational feedback. The /collectors endpoint always returns the latest health snapshot, not historical transitions.

---

### 2. Collector‑Specific Data Models

## 2.1 Plex

Endpoint: /status/plex
Format: ServiceStatus

```json
{
  "id": "plex",
  "name": "Starmedia Plex",
  "status": "UP",
  "lastUpdate": "2026-08-02T10:00:00.000Z",
  "details": {
    "version": "1.43.3.10828",
    "machineId": "a5cc...",
    "apiVersion": "1.2.2"
  }
}
```

---

## 2.2 Jellyfin

Endpoint: /status/jellyfin
Format: ServiceStatus

```json
{
  "id": "jellyfin",
  "name": "N100 Jellyfin",
  "status": "UP",
  "lastUpdate": "2026-08-02T10:00:00.000Z"
}
```

## 2.3 Sonarr

Endpoint: /status/sonarr
Format: ServiceStatus

```json
{
  "id": "sonarr",
  "name": "Sonarr",
  "status": "UP",
  "lastUpdate": "...",
  "findings": [
    { "category": "update", "severity": "info", "message": "New update available: v4.0.19.3001" },
    { "category": "health", "severity": "info", "message": "All notifications unavailable" }
  ],
  "issue": "New update available: v4.0.19.3001",
  "details": { "issues": [...] }
}
```

---

## 2.4 Radarr

Endpoint: /status/radarr
Format: ServiceStatus

```json
{
  "id": "radarr",
  "name": "Radarr",
  "status": "UP",
  "lastUpdate": "...",
  "findings": [
    { "category": "update", "severity": "info", "message": "New update available: v6.4.1.10545 (current: v6.4.0.10523)" }
  ],
  "issue": "New update available: v6.4.1.10545 (current: v6.4.0.10523)",
  "details": { "issues": [...] }
}
```

---

## 2.5 Prowlarr

Endpoint: /status/prowlarr
Format: ServiceStatus

```json
{
  "id": "prowlarr",
  "name": "Prowlarr",
  "status": "UP",
  "lastUpdate": "...",
  "findings": [
    { "category": "update", "severity": "info", "message": "New update available: v2.6.1.5509 (current: v2.5.2.5491)" }
  ],
  "issue": "New update available: v2.6.1.5509 (current: v2.5.2.5491)",
  "details": { "issues": [...] }
}
```

---

## 2.6 Seerr

Endpoint: /status/seerr
Format: ServiceStatus

```json
{
  "id": "seerr",
  "name": "Seerr",
  "status": "UP",
  "lastUpdate": "...",
  "findings": [
    {
      "category": "update",
      "severity": "info",
      "message": "New update available: 3.4.1 (current: 3.3.0)"
    }
  ],
  "issue": "New update available: 3.4.1 (current: 3.3.0)"
}
```

---

## 2.7 SABnzbd

Endpoint: /status/sabnzbd
Format: ServiceStatus

```json
{
  "id": "sabnzbd",
  "name": "SABnzbd",
  "status": "UP",
  "lastUpdate": "...",
  "findings": [
    {
      "category": "update",
      "severity": "info",
      "message": "New update available: 5.1.0 (current: 5.0.4)"
    }
  ],
  "issue": "New update available: 5.1.0 (current: 5.0.4)"
}
```

---

## 2.8 Services (Aggregated)

Endpoint: /status
Format: ServiceStatus[]

## An array of all service statuses.

## 2.9 TrueNAS

Endpoint: /truenas
Format: { pools: TrueNASPool[] }

```typescript
interface TrueNASPool {
  name: string;
  status: string;
  used: string;
  free: string;
  health: string;
  label: string; // formatted for Homepage display
}
```

Example:

```json
{
  "pools": [
    {
      "name": "tank",
      "status": "ONLINE",
      "used": "24.3 TB",
      "free": "4.7 TB",
      "health": "HEALTHY",
      "label": "ONLINE (Used: 24.3 TB, Free: 4.7 TB)"
    }
  ]
}
```

---

## 2.10 Proxmox

Endpoint: /proxmox
Format: { nodes: ProxmoxNode[] }

```typescript
interface ProxmoxNode {
  name: string;
  status: "online" | "offline";
  cpu: number; // 0–1 (percentage)
  memoryUsed: string; // human-readable (e.g., '7 GB')
  memoryTotal: string; // human-readable (e.g., '15 GB')
  vms: number; // count of running VMs
  containers: number; // count of running containers
}
```

Example:

```json
{
  "nodes": [
    {
      "name": "n100",
      "status": "online",
      "cpu": 0.17,
      "memoryUsed": "7 GB",
      "memoryTotal": "15 GB",
      "vms": 0,
      "containers": 4,
      "label": "ONLINE | CPU: 17% | RAM: 7 GB / 15 GB | VMs: 0 | CTs: 4"
    }
  ]
}
```

## 2.11 Network

Endpoint: /network
Format: NetworkMetrics (as defined in collectors/network.ts)

```typescript
interface NetworkMetrics {
  externalIP: string | null;
  tailscale: {
    connected: boolean;
    total: number;
    online: number;
    nodes: { name: string; ip: string; online: boolean }[];
  };
  pings: Record<
    string,
    { host: string; reachable: boolean; latency: number | null }
  >;
  dns: Record<string, { domain: string; ips: string[]; error?: string }>;
  interfaces: {
    name: string;
    ip4: string[];
    ip6: string[];
    mac: string;
    speed: number | null;
    rx_bytes: number;
    tx_bytes: number;
    up: boolean;
  }[];
}
```

---

### 2.12 Tailscale

Endpoint: /tailscale
Format: { connected: boolean; online: number; total: number; nodes: TailscaleNode[] }

```typescript
interface TailscaleNode {
  name: string;
  status: string; // "🟢 Online" or "🔴 Offline"
}
Example:

json
{
  "connected": true,
  "online": 8,
  "total": 21,
  "nodes": [
    { "name": "apple-tv", "status": "🟢 Online" },
    { "name": "debian", "status": "🔴 Offline" }
  ]
}
```

---

## 3. State Cache Structure

```typescript
interface HomelabState {
  services: ServiceStatus[];
  truenas: { pools: TrueNASPool[] } | null;
  proxmox: { nodes: ProxmoxNode[] } | null;
  network: NetworkMetrics | null;
  collectorHealth: Record<string, CollectorHealth>;
}
```

## This is the single source of truth for the aggregator. All API endpoints read from this cache.

## 4. API Response Standards

- All endpoints (except /health and /homepage) require authentication.
- Success – status code 200 with the requested data.
- Error – status code 4xx or 5xx with a JSON object:

```json
{ "error": "Unauthorized: invalid or missing API key" }
```

- Missing data – if a collector has not run yet, the endpoint returns:

```json
{ "error": "No data yet" }
```

## 5. Conclusion

This data model ensures that:

- All collectors return consistent, predictable data.
- The cache and API have a well‑defined contract.
- Future collectors can be added without guesswork.
- Documentation and code remain in sync.

Any change to this model must be reflected in the code and all collectors.
