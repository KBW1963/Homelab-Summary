# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-24

### Added

- Tailscale REST API support via `TAILSCALE_API_KEY` and `TAILSCALE_TAILNET` environment variables
- Redaction status shown in startup banner (`REDACT_IPS`)
- Explicit external IP redaction in `/network/summary` endpoint

### Changed

- Tailscale data is now collected via the Network collector using REST API (TrueNAS)
- Removed separate Tailscale collector (CLI) – no more `tailscaled` errors
- Homepage widgets point to TrueNAS instance for real IPs and VPS for redacted IPs

### Fixed

- `REDACT_IPS` boolean handling (strict `=== true` comparison)
- Scheduler state update to properly store `network.tailscale` data
- SABnzbd version comparison logic (semantic versioning)
- Git merge conflicts and cleanup

## [0.2.0] - 2026-08-17

### Added

- VPS deployment with Tailscale and Caddy reverse proxy
- Seerr migrated to TrueNAS and integrated into both aggregators
- Public `/homepage` endpoint for Homepage integration

### Changed

- SABnzbd collector uses `mode=version` and explicit `Host` header
- Updated Homepage to use VPS URL (`https://<VPS_URL>/homepage`)

### Fixed

- Seerr self‑signed certificate issue resolved via Caddy proxy
- SABnzbd hostname verification fixed with `Host` header

---

## [0.1.1] - 2026-08-16

### Added

- Emoji status indicators (🟢, 🟡, 🔴, ⚪) to the `/collectors` endpoint for better visual feedback in Homepage
- `CHANGELOG.md` to track project changes

### Changed

- Collector health status now displays with colour‑coded emojis instead of relying on Homepage's `color: adaptive` (which doesn't work with `dynamic-list`)

### Added

- Added screenshot of the Homelab Summary output as an example of how I have integrated it with Homepage.

---

## [0.1.0] - 2026-08-15

### Added

- Initial release of Homelab Summary aggregator
- Service collectors: Plex, Jellyfin, Sonarr, Radarr, Prowlarr, Seerr, SABnzbd
- Infrastructure collectors: TrueNAS, Proxmox, Network
- Tailscale node list endpoint (`/tailscale`)
- Update detection for all services using official APIs
- Health Interpreter layer with severity rules (`info`, `warning`, `critical`)
- Homepage integration endpoints (`/homepage`, `/summary`, `/status`)
- Docker deployment support (`Dockerfile`, `docker-compose.yml`)
- Full documentation set (`README.md`, `api.md`, `architecture.md`, `data-model.md`, `philosophy.md`, `deployment.md`, `glossary.md`, `logging.md`, `security.md`, `test-health.md`, `vision.md`)

### Fixed

- Consistent update message format across all services
- SABnzbd API key and status handling
- Jellyfin version detection using official Jellyfin endpoint
- Seerr GitHub repository correction

---

## [Unreleased]

### Planned

- Additional collectors (Docker, Kuma, WUD, media streams, backups)
- Optional persistent storage (SQLite) for historical trends
- Web UI (optional, lightweight)
