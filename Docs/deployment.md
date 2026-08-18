# Deployment

This document describes how to deploy the Homelab Summary aggregator using Docker. Containerisation makes the application portable, easy to run in any environment, and simplifies dependency management.

📌 What's covered

- Prerequisites
- Configuration (environment variables)
- Building the Docker image
- Running with Docker Compose
- Running with Docker (without Compose)
- Healthcheck
- Tailscale integration
- Troubleshooting
- Updating
- Logging

Hopefully, this gives you a complete, production‑ready deployment guide.

---

## Prerequisites

- **Docker** – version 20.10 or later
- **Docker Compose** – version 2.0 or later (optional, recommended)
- **Git** – to clone the repository (or you can download the source)

---

### Deploying on a VPS

1. Install Tailscale on the VPS.
2. Install Caddy and configure reverse proxy rules.
3. Deploy the aggregator using Docker Compose.
4. Set environment variables to use Tailscale IPs or domains.
5. Expose the `/homepage` endpoint publicly (no auth required).

---

## Configuration

All configuration is provided via environment variables. You can either:

- Create a `.env` file and pass it to the container.
- Pass environment variables directly in the `docker run` command.
- Use a `docker-compose.yml` file with an `env_file` or explicit `environment` section.

### Required Environment Variables

| Variable            | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `API_KEY`           | Your secret API key (used for `X-API-Key` header).                                                          |
| `PLEX_URL`          | Full URL to Plex identity endpoint.                                                                         |
| `JELLYFIN_URL`      | Full URL to Jellyfin health endpoint.                                                                       |
| `SONARR_URL`        | Full URL to Sonarr health endpoint.                                                                         |
| `RADARR_URL`        | Full URL to Radarr health endpoint.                                                                         |
| `PROWLARR_URL`      | Full URL to Prowlarr health endpoint.                                                                       |
| `SEERR_URL`         | Full URL to Seerr health endpoint.                                                                          |
| `SABNZBD_URL`       | Full URL to Base URL to SABnzbd (e.g., `http://<host>:<port>`). Do **not** include `/api` or query strings. |
| `PLEX_TOKEN`        | Plex API token.                                                                                             |
| `JELLYFIN_TOKEN`    | Jellyfin API token.                                                                                         |
| `SONARR_API_KEY`    | Sonarr API key.                                                                                             |
| `RADARR_API_KEY`    | Radarr API key.                                                                                             |
| `PROWLARR_API_KEY`  | Prowlarr API key.                                                                                           |
| `SEERR_API_KEY`     | Seerr API key.                                                                                              |
| `SABNZBD_API_KEY`   | SABnzbd API key.                                                                                            |
| `TRUENAS_HOST`      | TrueNAS base URL.                                                                                           |
| `TRUENAS_API_KEY`   | TrueNAS API key.                                                                                            |
| `PROXMOX_HOST`      | Proxmox base URL (e.g., `https://<host>:<port>`).                                                           |
| `PROXMOX_API_TOKEN` | Proxmox API token (e.g., `PVEAPIToken=...`).                                                                |

[!Important:] For `SABNZBD_URL`, provide only the base IP and port (e.g., `http://<host>:<port>`). Do **not** include `/api`, `?mode=queue`, or `apikey` in this variable. The aggregator constructs the complete API request internally using your provided `SABNZBD_API_KEY`.

### Optional Environment Variables

| Variable               | Default                                                                                                                                          | Description                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `PORT`                 | `3333`                                                                                                                                           | Port the API listens on.                      |
| `POLL_INTERVAL_MS`     | `30000`                                                                                                                                          | How often collectors run (milliseconds).      |
| `LOG_LEVEL`            | `info`                                                                                                                                           | Log level (`debug`, `info`, `warn`, `error`). |
| `REDACT_IPS`           | `false`                                                                                                                                          | Redact IPs and MACs from API responses.       |
| `NETWORK_PING_TARGETS` | `gateway\|192.168.0.1,dns\|1.1.1.1,internet\|8.8.8.8`                                                                                            | Ping targets.                                 |
| `NETWORK_DNS_TARGETS`  | `google.com,github.com`                                                                                                                          | Domains to resolve.                           |
| `NETWORK_DNS_SERVER`   | `""`                                                                                                                                             | Custom DNS server(s) (comma‑separated).       |
| `TAILSCALE_PATH`       | Path to the tailscale binary on the host. Default: tailscale. Only used if TAILSCALE_API_KEY and TAILSCALE_TAILNET are not set.                  |
| `TAILSCALE_API_KEY`    | Tailscale API key (optional). If set (along with TAILSCALE_TAILNET), the network collector uses the Tailscale REST API instead of the local CLI. |
| `TAILSCALE_TAILNET`    | Your Tailscale tailnet name (e.g., example.tailnet). Required if TAILSCALE_API_KEY is set.                                                       |

### Tailscale Integration (Optional)

| Scenario                                                        | Environment Variables                                                | What happens                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Using the Tailscale REST API (recommended for TrueNAS apps)** | `TAILSCALE_API_KEY=tskey-...`<br>`TAILSCALE_TAILNET=example.tailnet` | The collector calls `https://api.tailscale.com` directly – no binary or socket needed. |
| **Using the local CLI (with mounted binary)**                   | `TAILSCALE_PATH=/usr/bin/tailscale`<br>(no API key)                  | The collector runs `tailscale status --json` inside the container.                     |
| **Disabling Tailscale**                                         | `TAILSCALE_PATH=` (empty)<br>(no API key)                            | The collector skips Tailscale checks entirely.                                         |

### Example `.env` File

```env
# Aggregator
PORT=3333
POLL_INTERVAL_MS=30000
LOG_LEVEL=info
API_KEY=your-super-secret-key

# Application URLs & Tokens
PLEX_URL=http://<host>:32400/identity
JELLYFIN_URL=https://<host>:<port>/health
SONARR_URL=http://<host>:8989/api/v3/health
RADARR_URL=http://<host>>:7878/api/v3/health
PROWLARR_URL=http://<host>:9696/api/v1/health
SEERR_URL=http://<host>:5055/api/v1/status
SABNZBD_URL=http://<host>:30055

PLEX_TOKEN=your-plex-token
JELLYFIN_TOKEN=your-jellyfin-token
SONARR_API_KEY=your-sonarr-key
RADARR_API_KEY=your-radarr-key
PROWLARR_API_KEY=your-prowlarr-key
SEERR_API_KEY=your-seerr-key
SABNZBD_API_KEY=your-sabnzbd-key

# Infrastructure
TRUENAS_HOST=http://<host>
TRUENAS_API_KEY=your-truenas-key
PROXMOX_HOST=https://<host>
PROXMOX_API_TOKEN=your-proxmox-token

# Network
NETWORK_PING_TARGETS=gateway|192.168.0.1,dns|1.1.1.1,internet|8.8.8.8
NETWORK_DNS_TARGETS=google.com,github.com
NETWORK_DNS_SERVER=192.168.0.101,192.168.0.110
TAILSCALE_PATH=tailscale
TAILSCALE_API_KEY=tskey-api-xxx
TAILSCALE_TAILNET=your-tailnet.ts.net
REDACT_IPS=true
```

---

## Building the Docker Image

If you have the source code, you can build the image manually.

```bash
# Clone or navigate to the project directory
cd homelab-summary

# Build the image
docker build -t homelab-summary:latest .
```

### The build process:

1. Copies the source code.
2. Installs dependencies.
3. Compiles the TypeScript code.
4. Creates a lightweight runtime image with only the compiled output and production dependencies.

---

## Running with Docker Compose (Recommended)

### Step 1 – Create the Docker Compose file

Create a docker-compose.yml file in the project root (or download the provided one).

### Option A – Build from source:

```yaml
services:
  aggregator:
    build: .
    container_name: homelab-summary
    restart: unless-stopped
    ports:
      - "3333:3333"
    env_file:
      - .env
    # Optional: mount Tailscale socket for Tailscale support
    # volumes:
    #   - /var/run/tailscale/tailscaled.sock:/var/run/tailscale/tailscaled.sock
```

### Option B – Use a pre-built image:

```yaml
services:
  aggregator:
    image: tomita2022/homelab-summary:latest
    container_name: homelab-summary
    restart: unless-stopped
    ports:
      - "3333:3333"
    env_file:
      - .env
```

---

### Step 2 – Create the .env file

Place your .env file in the same directory as docker-compose.yml.

### Step 3 – Build and start

```bash
# Build and start in the background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Running with Docker (Without Compose)

If you prefer not to use Docker Compose, you can run the container directly:

```bash
docker run -d \
  --name homelab-summary \
  --restart unless-stopped \
  -p 3333:3333 \
  --env-file .env \
  homelab-summary:latest

```

---

## Healthcheck

The Docker image includes a healthcheck that calls the /health endpoint every 30 seconds. You can monitor container health with:

```bash
docker ps
```

The `STATUS` column will show healthy when the application is running correctly.

---

## Testing the API

```bash
curl -H "X-API-Key: your-super-secret-key" http://localhost:3333/status
```

**Expected response:**

```json
[
  {
    "id": "plex",
    "name": "Starmedia Plex",
    "status": "UP",
    "lastUpdate": "..."
  }
]
```

---

## Troubleshooting

- Missing environment variables – ensure API_KEY and all URLs are set.
- Authentication errors – verify the X-API-Key header matches the API_KEY value.
- Container not starting – check logs: docker logs homelab-summary.
- Network issues – if using a reverse proxy, ensure host: "0.0.0.0" is set.

### 1. Container exits immediately

Check the logs:

```bash
docker logs homelab-summary
```

Common causes:

- Missing required environment variables.
- Syntax error in .env file (e.g., trailing spaces).
- Port conflict (port xxxx already in use).

---

### 2. Cannot reach services on the host

If your aggregator container needs to access services running on the host machine (e.g., Plex on the host), use:

- Windows / macOS: Use host.docker.internal as the hostname.
- Linux: Use host network mode or the host's IP address (e.g., xxx.xxx.xxx.xxx).
  Example:

```env
PLEX_URL=http://host.docker.internal:32400/identity
```

---

### 3. Network collector timeouts

The network collector uses ping and nslookup. The Docker image includes these tools. If they time out, check:

- Firewall rules on the host.
- Network configuration of the container.
- The NETWORK_PING_TARGETS and NETWORK_DNS_TARGETS values.

---

### 4. Tailscale not working

- Ensure the Tailscale socket is mounted correctly.
- Verify Tailscale is running on the host.
- Check TAILSCALE_PATH is set correctly.
- If using the REST API, verify TAILSCALE_API_KEY and TAILSCALE_TAILNET are correct.

---

## Updating the Container

To update to a new version:

```bash
# Pull the latest code (if using Git)
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

Or if you are using a pre-built image, pull the latest tag and restart.

---

## Logging

The application logs to stdout. Docker captures these logs. To view them:

```bash
docker logs -f homelab-summary
```

You can also configure a log driver (e.g., json-file, syslog, loki) in docker-compose.yml.

---

## Summary

| Step                | Command                                                             |
| ------------------- | ------------------------------------------------------------------- |
| Build the image     | docker-compose build                                                |
| Start the container | docker-compose up -d                                                |
| View logs           | docker-compose logs -f                                              |
| Stop the container  | docker-compose down                                                 |
| Test the API        | curl -H "X-API-Key: your-key" http://localhost:3333/health-overview |

The Homelab Summary aggregator is now running as a Docker container. You can access the API at http://<host-ip>:3333 and integrate it with Homepage, Grafana, or any other client.
