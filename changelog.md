# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
