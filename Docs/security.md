# Security Principles

This document outlines the security principles that guide the design, development, and operation of the Homelab Summary aggregator.

---

## 1. Read‑only by design

**Principle:** The aggregator never modifies the state of any external system.

**Implementation:**

- All API tokens and credentials used by collectors are scoped to **read‑only** permissions (e.g., `Sys.Audit` in Proxmox, `VM.Monitor` in TrueNAS).
- No endpoint, collector, or component performs write operations (e.g., restarting containers, deleting snapshots, acknowledging alerts).

**Why:** Prevents accidental changes and limits the blast radius of a compromised collector.

---

## 2. Least privilege

**Principle:** Each component (and each collector) operates with the minimum permissions required to perform its function.

**Implementation:**

- Collectors use **dedicated API tokens** with read‑only access to their target services.
- No component has access to credentials it doesn't need.
- The `API_KEY` used for client authentication is separate from all collector credentials.

**Why:** If a collector is compromised, the damage is contained to the specific service it monitors, not the entire system.

---

## 3. No credentials in source code

**Principle:** Secrets are never hard‑coded in the codebase.

**Implementation:**

- All credentials (API keys, tokens, URLs) are loaded from **environment variables** (`.env` file).
- `.env` is **excluded from version control** (added to `.gitignore`).
- `.env.example` contains only placeholder values (no real secrets).

**Why:** Prevents accidental credential leakage via source control, logs, or error messages.

---

## 4. Authentication before routing

**Principle:** Every request (except to `/health` and `/homepage`) must be authenticated before any data is returned.

**Implementation:**

- Fastify’s `onRequest` hook checks the `X-API-Key` header **before** any route handler is invoked.
- If the header is missing or invalid, the request is rejected with a `401` status code.
- No route‑specific logic is executed before authentication.

**Why:** Ensures that unauthenticated requests are rejected early, reducing surface area for attacks.

---

## 5. HTTPS by default

**Principle:** The aggregator should be deployed with HTTPS in production.

**Implementation:**

- The aggregator itself **does not terminate HTTPS** – it runs on HTTP.
- In production, a **reverse proxy** (e.g., Nginx, Caddy, Traefik) is recommended to terminate TLS and forward requests.
- `docker-compose.yml` and documentation encourage this configuration.

**Why:** Protects credentials and data in transit between clients and the aggregator.

---

## 6. Fail securely

**Principle:** When something goes wrong, the system fails in a way that does not expose sensitive information.

**Implementation:**

- Error responses contain generic messages (e.g., `"Unauthorized"`, `"Service not found"`) – never stack traces or internal details.
- Collector errors are logged internally but are **not** exposed to clients via the API (except via `/collectors` endpoint, which is authenticated).
- Internal error logs use structured logging and include context for debugging without leaking secrets.

**Why:** Prevents information disclosure through error messages.

---

## 7. Sensitive information never exposed

**Principle:** The API and logs never expose credentials, IPs (unless redacted), or internal network details.

**Implementation:**

- **Redaction** is built into the `/network` endpoint via the `REDACT_IPS` flag – all IPv4, IPv6, and MAC addresses are masked.
- API responses never include:
  - API keys or tokens
  - Service credentials
  - Full network topology (unless explicitly requested and authenticated)
- Fastify’s logging is disabled; custom logging is used and can be configured to omit sensitive data.

**Why:** Protects against accidental leakage of internal infrastructure details to clients or logs.

---

## 8. Collector credentials remain isolated

**Principle:** Each collector uses its own dedicated credentials, and they are not shared or exposed elsewhere.

**Implementation:**

- Each collector reads its credentials from **separate environment variables** (e.g., `PLEX_TOKEN`, `PROXMOX_API_TOKEN`).
- The scheduler passes the configuration object to collectors, but collectors only access their own credentials.
- No collector can access another collector's credentials.

**Why:** If one credential is compromised, the rest of the system remains secure.

---

## 9. Audit‑friendly logging

**Principle:** The system logs security‑relevant events in a structured, queryable format.

**Implementation:**

- Custom logging captures:
  - API requests (timestamp, client IP, method, URL, status, duration) – only when `LOG_LEVEL=debug`.
  - Authentication failures (with `401` status).
  - Collector successes and failures (including errors).
- Logs are human‑readable and can be piped to external systems.
- No secrets are logged.

**Why:** Enables security monitoring, incident response, and forensic analysis.

---

## 10. Security before convenience

**Principle:** Trade‑offs between security and ease‑of‑use are resolved in favour of security.

**Implementation:**

- Authentication is **required** for all endpoints except `/health` and `/homepage`.
- `REDACT_IPS` defaults to `false` (opt‑in), but the documentation strongly recommends enabling it in production.
- The aggregator does not include a built‑in web UI – all access must be through the authenticated API.
- No "backdoor" endpoints or administrative routes exist.

**Why:** Security is a foundational requirement, not an afterthought.

---

## Related Documents

- `philosophy.md` – The Fourteen Rules of a Collector (includes security‑relevant rules).
- `api.md` – Details authentication, error responses, and transport security.
- `data-model.md` – Defines which fields may contain sensitive data (and how they are redacted).
- `collector-template.md` – Guidance on applying these security principles when adding new collectors.

---

## Summary

These principles ensure that the Homelab Aggregator remains secure by default, resilient to attack, and safe to deploy in production environments – even when monitoring sensitive infrastructure.

**When in doubt, refer to these principles. When they conflict, security takes priority.**
