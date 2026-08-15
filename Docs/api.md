# API Documentation

This document describes the HTTP API exposed by the Homelab Summary aggregator.

---

## Base URL

http://<host>:<port>

Default port: `3333`

---

## Authentication

All endpoints (except `/health` and `/homepage`) require authentication via the `X-API-Key` header.

**Example:**

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3333/status
```

If the key is missing or invalid, the API returns:

```json
{ "error": "Unauthorized: invalid or missing API key" }
```

Status code: 401

# Endpoints

### 1. Health Check (Liveness)

**`GET /health`**

Basic liveness check for the aggregator itself (returns {"status": "ok"}). Used by orchestration tools (e.g., Docker healthchecks).

Response:

```json
{ "status": "ok" }
```

Status codes:

- 200 – always (if the server is running)

---

### 2. Homepage Summary

**`GET /homepage**

A lightweight endpoint designed specifically for Homepage dashboards. Returns a concise summary of the entire homelab state.

Authentication: This endpoint is exempt from the `X-API-Key` requirement.

**`Response:`**

```json
{
  "status": "HEALTHY",
  "severity": "info",
  "summary": "7/7 services healthy | 2 notification(s) | 3 update(s) available | See Homelab Services for details.",
  "updatesAvailable": 3,
  "notifications": 2,
  "infrastructureHealthy": true,
  "services": {
    "total": 7,
    "up": 7,
    "degraded": 0,
    "down": 0
  }
}
```

Fields:

| Field                   | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `status`                | Overall health conclusion (UP, DEGRADED, DOWN).       |
| `severity`              | Urgency (info, warning, critical).                    |
| `summary`               | Short human‑readable summary.                         |
| `updatesAvailable`      | Number of services with updates available.            |
| `notifications`         | Number of informational notifications.                |
| `infrastructureHealthy` | true if infrastructure (TrueNAS, Proxmox) is healthy. |
| `services`              | Breakdown of service health counts.                   |
| `services.total`        | Total number of monitored services.                   |
| `services.up`           | Number of services with status UP.                    |
| `services.degraded`     | Number of services with status DEGRADED.              |
| `services.down`         | Number of services with status DOWN.                  |

Status codes:

- 200 – success

Example request:

```bash
curl http://localhost:3333/homepage
```

---

### 3. All Services (Basic)

**`GET /status`**

Returns an array of all monitored services with basic status information.

Response: ServiceStatus[] (defined in data-model.md)

Example:

```json
[
  {
    "id": "plex",
    "name": "Starmedia Plex",
    "status": "UP",
    "lastUpdate": "2026-08-12T10:00:00.000Z"
  },
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
      }
    ],
    "issue": "New update available: v4.0.19.3001"
  }
]
```

Status codes:

- 200 – success

---

### 4. Single Service

**`GET /status/:id`**

Returns the status of a specific service.

Path parameters:

`id` – the service identifier (e.g., plex, jellyfin, sonarr, radarr)

Response: ServiceStatus

Example:

```json
{
  "id": "plex",
  "name": "Starmedia Plex",
  "status": "UP",
  "lastUpdate": "2026-08-02T10:00:00.000Z",
  "details": { "version": "1.43.3.10828" }
}
```

Status codes:

- 200 – success
- 404 – service not found

---

5. Summary (Detailed Services)
   **`GET /summary`**

Returns an aggregated overview of all services, including interpreted health fields.

Response:

```json
{
  "overall": "UP",
  "severity": "info",
  "summary": "All services healthy.",
  "impact": "No issues detected.",
  "recommendedAction": "No action required.",
  "total": 7,
  "up": 7,
  "down": 0,
  "degraded": 0,
  "lastUpdate": "2026-08-12T10:00:00.000Z",
  "services": [
    { "name": "Starmedia Plex", "status": "UP", "label": "UP" },
    { "name": "N100 Jellyfin", "status": "UP", "label": "UP" },
    { "name": "Sonarr", "status": "UP", "label": "UP — New update available: v4.0.19.3001 (current: v4.0.18.2978)" },
    { "name": "Radarr", "status": "UP", "label": "UP — New update available: v6.4.1.10545 (current: v6.4.0.10523)" },
    { "name": "Prowlarr", "status": "UP", "label": "UP — New update available: v2.6.1.5509 (current: v2.5.2.5491)" },
    { "name": "Seerr", "status": "UP", "label": "UP — New update available: 3.4.1 (current: 3.3.0)" },
    { "name": "SABnzbd", "status": "UP", "label": "UP — New update available: 5.1.0 (current: 5.0.4)" }
  ],
  "infrastructure": {
    "truenas": { "pools": [...] },
    "proxmox": { "nodes": [...] },
    "network": { ... }
  }
}
```

Fields:

| Field             | Description                                              |
| ----------------- | -------------------------------------------------------- |
| overall           | Overall health conclusion (UP, DEGRADED, DOWN, UNKNOWN). |
| severity          | Urgency (info, warning, critical).                       |
| summary           | Short human‑readable summary.                            |
| impact            | What the state means for the user.                       |
| recommendedAction | What the user should do.                                 |
| services          | Array of service summary objects.                        |
| infrastructure    | Raw infrastructure data (TrueNAS, Proxmox, Network).     |

Note: Labels are prioritised: updates appear first, followed by informational notifications. Internal source names (e.g., `UpdateCheck:`, `Notifications:`) are stripped for readability.

Status codes:

- 200 – success

---

### 6. TrueNAS

**`GET /truenas`**

Returns TrueNAS pool status.

Response: { pools: TrueNASPool[] }

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

Status codes:

- 200 – success
- 200 with { error: "No data yet" } – if the collector has not run yet

---

### 7. Proxmox

**`GET /proxmox`**

Returns Proxmox node status.

Response: { nodes: ProxmoxNode[] }

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

Status codes:

- 200 – success
- 200 with { error: "No data yet" } – if the collector has not run yet

---

### 8. Network

**`GET /network`**

Returns network metrics.

Response: NetworkMetrics (defined in data-model.md)

Example:

```json
{
  "externalIP": "86.4.190.85",
  "tailscale": { "connected": true, "total": 21, "online": 7, "nodes": [...] },
  "pings": { "gateway": { "host": "192.168.0.1", "reachable": true, "latency": 0.9 } },
  "dns": { "google.com": { "domain": "google.com", "ips": [...] } },
  "interfaces": [...]
}
```

Status codes:

- 200 – success
- 200 with { error: "No data yet" } – if the collector has not run yet

`Note:` If REDACT_IPS is set to true in the aggregator's configuration, all IPv4, IPv6, and MAC addresses will be replaced with placeholders (xxx.xxx.xxx.xxx, xxxx:xxxx:..., xx:xx:xx:xx:xx:xx) in the response body.

---

### 9. Network Summary

**GET /network/summary**

Flattened network summary for dashboard widgets.
Response:

```json
{
  "externalIP": "86.4.190.85",
  "tailscaleStatus": "Connected (8/21 nodes)",
  "internetDisplay": "Online (17ms)",
  "dnsStatus": "Operational"
}
```

Fields:

| Field           | Description                                               |
| --------------- | --------------------------------------------------------- |
| externalIP      | Public IP address (or "N/A").                             |
| tailscaleStatus | Tailscale connection state and node counts.               |
| internetDisplay | Internet reachability with latency.                       |
| dnsStatus       | DNS resolution status ("Operational", "Degraded", "N/A"). |

Status codes:

- 200 – success
- 200 with { error: "No data yet" } – if the collector has not run yet

---

### 10. Collector Health

**`GET /collectors`**

Returns the health status of each collector in a simplified array format, with checkmarks for healthy collectors.

**Response:**

```json
{
  "collectors": [
    { "name": "Services", "status": "✓ healthy" },
    { "name": "Truenas", "status": "✓ healthy" },
    { "name": "Proxmox", "status": "✓ healthy" },
    { "name": "Network", "status": "✓ healthy" }
  ]
}
```

Status codes:

- 200 – success

---

### 11. Tailscale Nodes

**`GET /tailscale`**

Returns a list of Tailscale nodes with their connection status.

**Response:**

```json
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

| Field     | Description                                     |
| --------- | ----------------------------------------------- |
| connected | Whether Tailscale is connected (true/false).    |
| online    | Number of nodes currently online.               |
| total     | Total number of nodes in the Tailscale network. |
| nodes     | Array of nodes with name and status fields.     |

Status codes:

- 200 – success
- 200 with { error: "No data yet" } – if the collector has not run yet

---

### 12. Test Health (Development)

**`GET /test-health`**

This endpoint is for **development and testing only**. It simulates different health scenarios to validate the health interpreter logic.

**Query Parameters:**

- `scenario` – one of: `updates-only`, `warning`, `critical-service`, `infra-down`, `mixed`

**Response:**

```json
{
  "scenario": "Service health warning (warning)",
  "expected": {
    "status": "DEGRADED",
    "severity": "warning",
    "summary": "Some services have warnings.",
    "impact": "Services are running but may have reduced functionality.",
    "recommendedAction": "Review warnings and take corrective action."
  },
  "simulatedState": {
    "infrastructure": "HEALTHY",
    "infrastructureErrors": [],
    "servicesStatus": "DEGRADED",
    "overallStatus": "DEGRADED"
  },
  "interpretedHealth": { ... },
  "findingsCount": { "info": 0, "warnings": 1, "critical": 0 },
  "rawFindings": [ ... ]
}
```

Example:

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=warning" | jq
```

For a full description of each scenario and the expected outputs, see `test-health.md`.

Note: This endpoint is intended for dashboard consumption only. For full details, use /health-overview or /summary.

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Common status codes:

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| 200  | Success (even if data is missing, we still return 200 with { error: "No data yet" }) |
| 401  | Missing or invalid X-API-Key                                                         |
| 404  | Resource not found (e.g., /status/unknown)                                           |
| 500  | Internal server error (unexpected)                                                   |

Example Curl Commands

```bash
# Health check
curl http://localhost:3333/health

# Homepage summary (no auth)
curl http://localhost:3333/homepage

# All services
curl -H "X-API-Key: your-key" http://localhost:3333/status

# Summary
curl -H "X-API-Key: your-key" http://localhost:3333/summary

# TrueNAS
curl -H "X-API-Key: your-key" http://localhost:3333/truenas

# Proxmox
curl -H "X-API-Key: your-key" http://localhost:3333/proxmox

# Network
curl -H "X-API-Key: your-key" http://localhost:3333/network

# Tailscale nodes
curl -H "X-API-Key: your-key" http://localhost:3333/tailscale

# Collector health
curl -H "X-API-Key: your-key" http://localhost:3333/collectors
```

## Versioning

The API does not currently use versioning in the URL. If breaking changes are required, a `/v1/` prefix will be introduced.

## Rate Limiting

No rate limiting is currently enforced. If the API is exposed publicly, consider adding a reverse proxy (e.g., Nginx) with rate limiting.
