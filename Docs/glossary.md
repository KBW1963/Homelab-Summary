# Glossary

This document defines the key terms used throughout the Homelab Summary project. It serves as a reference for contributors, users, and maintainers to ensure consistent language across documentation, code, and discussions.

---

## Core Concepts

| Term                   | Definition                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregator**         | The overall project. A lightweight, read‑only service that collects, normalises, and caches infrastructure health data from multiple self‑hosted services.                                                                                                                |
| **Collector**          | A standalone, read‑only function that retrieves data from a single external service (e.g., Plex, TrueNAS) and returns a normalised `CollectorResult<T>`. It is independent, has one responsibility, and never exposes an API endpoint. See **Rule 1** in `philosophy.md`. |
| **Collector Manager**  | The component that orchestrates all collectors. It discovers registered collectors, executes them concurrently, handles timeouts and errors, and returns aggregated results to the scheduler.                                                                             |
| **Scheduler**          | The component that triggers the Collector Manager on a fixed interval (e.g., every 30 seconds). It is responsible for maintaining the regularity of data collection and updating the `HomelabState`.                                                                      |
| **Homelab State**      | The in‑memory data store (`HomelabState`) that holds the latest results from all collectors. It is the **single source of truth** for the application. The API reads from this state; collectors write to it via the scheduler. Previously named `Cache` or `State`.      |
| **CollectorResult<T>** | The standardised wrapper that every collector returns. It includes the collected `data`, a `collectedAt` timestamp, the `duration` of the collection, and a `status` (`success` or `error`).                                                                              |
| **Health Interpreter** | A dedicated layer that applies severity rules to turn raw findings into an overall health conclusion. It produces a `status`, `severity`, `summary`, `impact`, and `recommendedAction`.                                                                                   |
| **Redaction**          | The process of automatically masking sensitive information (IP addresses, MAC addresses) from API responses to protect privacy. Controlled by the `REDACT_IPS` environment variable.                                                                                      |
| **Notification**       | A finding that indicates an informational condition (e.g., "All notifications unavailable"). It does **not** affect the service's health status – the badge remains `UP`.                                                                                                 |
| **Tailscale**          | A peer‑to‑peer VPN service. The aggregator can report Tailscale node status via the `/tailscale` endpoint, either through the REST API or the local CLI.                                                                                                                  |
| **Finding**            | A single observation from a collector about a service. Contains a `category`, `severity`, `message`, and optional `source`. Findings are used by the Health Interpreter to determine overall health.                                                                      |

---

## Architecture & Design

| Term                       | Definition                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decoupled Architecture** | A design where collectors, state, and API are independent of each other. Collectors never know about the API, and the API never calls collectors directly. All communication flows through `HomelabState`.               |
| **CQRS‑Inspired**          | Command Query Responsibility Segregation – a pattern where **writing** (scheduler → collectors → state) is separated from **reading** (API → state → clients). This allows both sides to scale and behave independently. |
| **Fastify**                | The HTTP framework used for the API. It handles routing, request validation, logging, and authentication (`X-API-Key`).                                                                                                  |
| **CORS**                   | Cross‑Origin Resource Sharing. Enabled in the aggregator to allow web dashboards (e.g., Homepage) to access the API from a different origin.                                                                             |
| **Plugin Architecture**    | The design principle that each collector is an independent plugin. The core system only knows that a collector returns data in a defined format; it does not know how the collector works internally.                    |

---

## Data & Status

| Term                  | Definition                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HealthStatus**      | The four‑state health indicator used across the system: `UP`, `DEGRADED`, `DOWN`, `UNKNOWN`. See `data-model.md` for detailed definitions.                                                    |
| **ServiceStatus**     | The standardised object for a monitored service. Contains `id`, `name`, `status`, `lastUpdate`, optional `details`, and optional `error`.                                                     |
| **CollectorHealth**   | The health report of a collector itself. Contains `status` (`healthy`, `degraded`, `unhealthy`), `lastRun` timestamp, `duration`, `errors` count, and `lastError` message.                    |
| **CollectorError**    | A structured error object returned by a collector. Contains a machine‑readable `code`, a human‑readable `message`, and a `retryable` flag.                                                    |
| **Health Transition** | A logged event when a collector's health changes from one state to another (e.g., `healthy → degraded`). Only logged on change, to avoid noise. This provides immediate operational feedback. |

---

## Observability & Logging

| Term                | Definition                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Startup Banner**  | The ASCII box printed at server startup, showing version, Node.js version, environment, polling interval, and the list of registered collectors. It gives immediate confidence that the application started correctly. |
| **Poll Summary**    | The formatted log output after each scheduler run, showing per‑collector timing, status icons (`✓`, `⚠`, `✗`), and total duration. It is printed on every poll.                                                        |
| **Request Logging** | Custom HTTP request logs that include timestamp, method, URL, status code, and duration. These replace Fastify's built‑in logs for a more human‑readable format.                                                       |
| **Log Level**       | Environment variable `LOG_LEVEL` controls the verbosity of logs (`info`, `debug`, `warn`, `error`). The detailed poll summary is shown when `LOG_LEVEL=info` or for the first poll.                                    |

---

## Security

| Term                | Definition                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **X-API-Key**       | The HTTP header used for authentication. All endpoints (except `/health` and `/homepage`) require this header with a value that matches the `API_KEY` environment variable. |
| **Least‑Privilege** | A security principle applied to collectors. Each collector uses the minimum permissions required to read status information (e.g., read‑only API tokens).                   |
| **Redaction**       | Masking sensitive data (IPs, MACs) in API responses to protect privacy and internal network details. Controlled by `REDACT_IPS`.                                            |

---

## Codebase & Implementation

| Term        | Definition                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TSX**     | The development runner used to execute TypeScript files directly with live‑reload (`tsx watch`).                                                                                                 |
| **ESBuild** | The underlying bundler/compiler used by TSX to transform TypeScript into JavaScript.                                                                                                             |
| **Pino**    | The fast, low‑overhead JSON logger used by Fastify for structured logging (currently disabled in favour of custom console logs).                                                                 |
| **Axios**   | The HTTP client used by collectors to make requests to external services.                                                                                                                        |
| **BOM**     | Byte Order Mark – an invisible Unicode character that can appear at the beginning of files. Windows‑generated files sometimes contain BOMs, which can cause syntax errors in TypeScript/ESBuild. |

---

## Related Documents

| Term                    | Document                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| **The Collector Rules** | `philosophy.md` – the guiding principles for writing collectors.        |
| **Data Model**          | `data-model.md` – detailed definitions of all types and interfaces.     |
| **API Spec**            | `api.md` – endpoint documentation and examples.                         |
| **Architecture**        | `architecture.md` – component diagram and high‑level design.            |
| **Collector Template**  | `collector-template.md` – step‑by‑step guide to adding a new collector. |
| **Security**            | `security.md` – security principles and practices.                      |
| **Logging**             | `logging.md` – logging policy and levels.                               |

---

## How to use this glossary

- When writing documentation, refer to these definitions to ensure consistency.
- When reviewing pull requests, check that new collectors or features align with the terminology defined here.
- When onboarding new contributors, point them to this glossary first to familiarise them with the project's language.

If a term is missing or needs clarification, update this document as part of the development process.
