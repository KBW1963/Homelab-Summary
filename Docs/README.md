# Homelab Summary

Homelab Summary is a lightweight read-only aggregation service that collects health information from your homelab, normalises it into a consistent model, and exposes it through a simple REST API for dashboards such as Homepage.

## Features

- ✅ **Service health** – Plex, Jellyfin, Sonarr, Radarr, Prowlarr, Seerr, SABnzbd
- ✅ **Storage** – TrueNAS pool status, used/free space
- ✅ **Virtualisation** – Proxmox node CPU, memory, VM/CT counts
- ✅ **Network** – external IP, Tailscale status, ping latencies, DNS resolution, interface stats
- ✅ **Tailscale nodes** – list all nodes with online/offline status
- ✅ **Update detection** – automatic version checking for all services (via official APIs)
- ✅ **Redaction** – automatically mask IPs and MACs from API responses (`REDACT_IPS=true`)
- ✅ **Collector health** – each collector reports its own health via `/collectors` (Rule 14)
- ✅ **Health transitions** – logs state changes (e.g., `HEALTHY → DEGRADED`) for operators
- ✅ **Secure** – API key authentication on all endpoints (except `/health`)
- ✅ **Extensible** – add new collectors without touching the API
- ✅ **Observable** – detailed startup banner, custom request logging, per‑collector timing
- ✅ **Clean, human‑readable labels** – actionable updates appear first, followed by informational notices. No internal jargon (e.g., `UpdateCheck:`, `Notifications:`).

### [Screenshot](https://github.com/KBW1963/Homelab-Summary/blob/main/Docs/Homepage%20Integration%20Example.png)

I built this as a mini-project to create a single-pane view of app's and services running on my self-hosted servers. I have tested it locally running via Dockge on TrueNAS as well as deploying it on a remote VPS running Dockge, Caddy and Domain records. Tailscale has also been used to test remote monitoring. [Hompage](https://gethomepage.dev) is my dashboard of choice (see screenshot above) but as stated it is a REST API and therefore can be integrated with other dashboards or even as a web page.

## <!--NOTE: this is not intended to replace other more mature app's in the self-hosted community. As stated I wanted a single-pane that provided an overview of what was happening with my app's and services.-->

## Architecture

The aggregator follows a clean, decoupled design:

Scheduler → CollectorManager → Collectors → Health Interpreter → HomelabState → Fastify API → Clients

- **Scheduler** – triggers the collection process on a fixed interval.
- **CollectorManager** – discovers and executes all collectors concurrently.
- **Collectors** – fetch and normalise data from external services.
- **Health Interpreter** – applies severity rules to turn findings into a health conclusion.
- **HomelabState** – the single source of truth, holding the latest results in memory.
- **Fastify API** – reads from the state only; never calls collectors directly.

This separation ensures:

- The API remains fast (cache reads are instant).
- Collectors don't block each other.
- Adding a new collector never requires changing the API.

For a detailed breakdown, see [`docs/architecture.md`](./docs/architecture.md).

---

## The Rules of a Collector

The project follows **rules** that guide collector design. They ensure consistency, reliability, and extensibility. The full list is in [`docs/philosophy.md`](./docs/philosophy.md).

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

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone or download the project
cd homelab-summary
npm install
```

---

## Configuration

Copy .env.example to .env and edit it with your own values:

```bash
cp .env.example .env
```

Required variables:

| Variable               | Description                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                 | Port the API listens on (default: 3333)                                                                                                          |
| `POLL_INTERVAL_MS`     | How often collectors run (default: 30000)                                                                                                        |
| `API_KEY`              | Your secret API key (used for X-API-Key header)                                                                                                  |
| `PLEX_URL`             | Full URL to Plex identity endpoint                                                                                                               |
| `JELLYFIN_URL`         | Full URL to Jellyfin health endpoint                                                                                                             |
| `SONARR_URL`           | Full URL to Sonarr health endpoint                                                                                                               |
| `SEERR_URL`            | Full URL to Overseerr/Seerr status endpoint (e.g., `http://192.168.xxx.xxx:PORT/api/v1/status`)                                                  |
| `SABNZBD_URL`          | Base URL to SABnzbd (e.g., http://192.168.xxx.xxx:PORT). Do NOT append /api or query strings here. (See note below)                              |
| `PLEX_TOKEN`           | Plex API token                                                                                                                                   |
| `JELLYFIN_TOKEN`       | Jellyfin API token                                                                                                                               |
| `SONARR_API_KEY`       | Sonarr API key                                                                                                                                   |
| `RADARR_API_KEY`       | Radarr API key                                                                                                                                   |
| `SABNZBD_API_KEY`      | SABnzbd API key                                                                                                                                  |
| `SEERR_API_KEY`        | SEERR API key                                                                                                                                    |
| `TRUENAS_HOST`         | TrueNAS base URL                                                                                                                                 |
| `TRUENAS_API_KEY`      | TrueNAS API key                                                                                                                                  |
| `PROXMOX_HOST`         | Proxmox base URL (e.g., https://192.168.xxx.xxx:8006)                                                                                            |
| `PROXMOX_API_TOKEN`    | Proxmox API token (e.g., PVEAPIToken=...)                                                                                                        |
| `NETWORK_PING_TARGETS` | Ping targets: name/host (e.g., gateway 192.168.0.1,dns 1.1.1.1)                                                                                  |
| `NETWORK_DNS_TARGETS`  | Domains to resolve (e.g., google.com,github.com)                                                                                                 |
| `NETWORK_DNS_SERVER`   | (Optional) Custom DNS server(s) (e.g., 192.168.xxx.xxx,192.168.xxx.xxx)                                                                          |
| `TAILSCALE_PATH`       | Path to the tailscale binary on the host. Default: tailscale. Only used if TAILSCALE_API_KEY and TAILSCALE_TAILNET are not set.                  |
| `REDACT_IPS`           | Redact IPs and MACs from API responses (default: false)                                                                                          |
| `TAILSCALE_API_KEY`    | Tailscale API key (optional). If set (along with TAILSCALE_TAILNET), the network collector uses the Tailscale REST API instead of the local CLI. |
| `TAILSCALE_TAILNET`    | Your Tailscale tailnet name (e.g., example.tailnet). Required if TAILSCALE_API_KEY is set.                                                       |

`⚠️ Important SABnzbd Note:
For SABNZBD_URL, provide only the base IP and port (e.g., http://192.168.xxx.xxx:PORT). Do not include /api, ?mode=queue, or apikey in this variable. The aggregator constructs the complete API request internally using your provided SABNZBD_API_KEY.`

---

## Running the Aggregator

```bash
# Development (with auto‑restart)
npm run dev

# Production (build first)
npm run build
npm start
```

---

## API Endpoints

All endpoints (except /health and /homepage) require the X-API-Key header.

| Method | Endpoint         | Description                                    |
| ------ | ---------------- | ---------------------------------------------- |
| GET    | /health          | Aggregator health check (no auth)              |
| GET    | /homepage        | Concise summary for Homepage (no auth)         |
| GET    | /status          | All services (basic)                           |
| GET    | /status/:id      | Single service (e.g., /status/plex)            |
| GET    | /status/summary  | Overall summary (legacy)                       |
| GET    | /summary         | Overall summary (preferred)                    |
| GET    | /services        | Detailed service list (with version/error)     |
| GET    | /collectors      | Poller health (last poll, success/error)       |
| GET    | /truenas         | Storage pool status, used/free                 |
| GET    | /proxmox         | Node CPU, memory, VM/CT counts                 |
| GET    | /network         | External IP, Tailscale, pings, DNS, interfaces |
| GET    | /tailscale       | Tailscale node list with online/offline status |
| GET    | /network/summary | Flattened network summary for Homepage         |

Note: If `REDACT_IPS` is enabled, the /network endpoint will return redacted IPv4, IPv6, and MAC addresses.

Example request

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3333/summary
```

---

## Homepage Integration

The aggregator provides several endpoints designed to work with Homepage's `customapi` widget.

Example services.yaml widget:

```yaml
- Homelab Status:
    icon: mdi-heart-pulse
    description: Live Infrastructure & Service Health
    widget:
      type: customapi
      url: http://192.168.xxx.xxx:3333/homepage
      headers:
        X-API-Key: "your-super-secret-key"
      mappings:
        - field: status
          label: Infrastructure
          color: adaptive
        - field: summary
          label: Summary
```

Example /homepage response

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

`NOTE:` that the X-API-Key header is used for authentication, and that /homepage is exempt from authentication.

---

## Development & Testing

### Health Interpreter Test Endpoint

**`GET /test-health`**

This endpoint is designed for development and testing purposes only. It simulates different health scenarios to validate the health interpreter logic without requiring real services to be in specific states.

**Query Parameters:**

- `scenario` – one of: `updates-only`, `warning`, `critical-service`, `infra-down`, `mixed`

**Example:**

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=warning" | jq
```

For a full description of each scenario and the expected outputs, see docs/test-health.md.

# Adding a New Collector

Collectors are the building blocks of this aggregator. Each collector fetches data from one external service and returns a normalised result.

Tip: When building the URL inside your collector, use the native URL object (new URL('/api', baseUrl)) to safely combine the base URL with the endpoint path. This prevents errors if a user accidentally includes a trailing slash in their .env configuration.

## Step 1 – Create the collector file

Create src/collectors/my-service.ts:

```typescript
import axios from "axios";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

export const serviceId = "my-service";
export const serviceName = "My Service";
export { getMyServiceStatus as fetch };

export async function getMyServiceStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  const start = Date.now();
  try {
    const url = config.MY_SERVICE_URL;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${config.MY_SERVICE_TOKEN}` },
      timeout: 10000,
    });

    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status: response.data.status || "UNKNOWN",
      lastUpdate: new Date().toISOString(),
      findings: [],
      details: { version: response.data.version },
    };

    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (err: any) {
    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status: "DOWN",
      lastUpdate: new Date().toISOString(),
      findings: [],
      error: err.message,
    };
    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: err.message,
    };
  }
}
```

## Step 2 – Add configuration

Add your new environment variables to src/config.ts and .env.example.

## Step 3 – Register in the Collector Manager

In src/collectors/services.ts, import your collector and add it to the serviceRegistry array.

### Step 4 – Add to a group (optional)

If your service belongs to a group (e.g., media servers, ARR apps), add it to the appropriate group collector.

### Step 5 – (Optional) Add a route

If you want to expose the data via the API, create a route in src/routes/ that reads from HomelabState. Routes already exist for /status, /summary, /services, and /collectors – they read from HomelabState automatically, so no new route is needed.

For a complete guide, see docs/collector-template.md.

---

# Deployment (Docker)

A Dockerfile and docker-compose.yml are provided.

```bash
# Build and run
docker-compose up --build

# Or run detached
docker-compose up -d
```

---

## VPS Deployment (Optional)

For redundancy and external access, you can deploy a second instance of the aggregator on a VPS.

1. Install Tailscale on the VPS and connect it to your tailnet.
2. Set up Caddy as a reverse proxy.
3. Deploy the aggregator using Dockge or Docker Compose.
4. Point Homepage to the VPS URL: `https://<VPS_URL>/homepage`

For full instructions, see [`docs/deployment.md`](./docs/deployment.md).

---

# Project Structure

homelab-summary/
├── .env # Your environment variables
├── .env.example # Template
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md # This file
├── docs/
│ ├── vision.md # Why the project exists
│ ├── philosophy.md # Principles & the Fourteen Rules
│ ├── architecture.md # System design (diagram, components)
│ ├── data-model.md # Core types, domain models, state
│ ├── api.md # HTTP API specification
│ ├── collector-lifecycle.md # How data flows through the system
│ ├── collector-template.md # How to add a new collector
│ ├── logging.md # Logging policy and levels
│ ├── security.md # Security principles
│ ├── test-health.md # Health interpreter test scenarios
│ └── glossary.md # Common terms and definitions
└── src/
├── index.ts # Fastify server, authentication
├── config.ts # Environment schema
├── state.ts # HomelabState (single source of truth)
├── scheduler.ts # Runs collectors on a schedule
├── collector-manager.ts # Discovers and executes collectors
├── normalizer.ts # Shared helpers (parseXML, inferStatus)
├── utils/
│ └── redact.ts # IP/MAC redaction helpers
├── collectors/
│ ├── types.ts # Collector & CollectorResult types
│ ├── plex.ts
│ ├── jellyfin.ts
│ ├── sonarr.ts
│ ├── radarr.ts
│ ├── prowlarr.ts
│ ├── seerr.ts
│ ├── sabnzbd.ts
│ ├── services.ts # Aggregates all application services
│ ├── media-servers.ts # Plex, Jellyfin
│ ├── arr-apps.ts # Sonarr, Radarr, Prowlarr
│ ├── truenas.ts
│ ├── proxmox.ts
│ └── network.ts
└── routes/
├── health.ts # GET /health
├── status.ts # GET /status, /status/:id, /status/summary
├── summary.ts # GET /summary
├── services.ts # GET /services
├── collectors.ts # GET /collectors
├── truenas.ts # GET /truenas
├── tailscale.ts # GET /tailscale
├── proxmox.ts # GET /proxmox
└── network.ts # GET /network

---

# Further Reading

- **[Architecture](./docs/architecture.md)** – detailed component descriptions and diagrams.
- **[Data Model](./docs/data-model.md)** – definitions of all types and interfaces.
- **[API Specification](./docs/api.md)** – endpoint documentation and examples.
- **[Security Principles](./docs/security.md)** – security model and best practices.
- **[Glossary](./docs/glossary.md)** – common terms and definitions.
