# Logging Policy

This document defines the logging levels and their usage across the Homelab Summary project. It provides guidance for contributors on what to log and at which level.

---

## Log Levels

| Level     | Purpose                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------- |
| **INFO**  | Normal operational messages. Startup banner, poll summaries, collector state changes, and API requests. |
| **WARN**  | Recoverable issues. Slow collectors (>3s), retries, degraded services.                                  |
| **ERROR** | Failures. Collector failures, unhandled exceptions, authentication errors.                              |
| **DEBUG** | Detailed debugging information. Individual API calls to external services, payload inspection.          |

---

## What to log

### INFO

- Startup banner
- Poll # start/completion
- Collector state changes (`HEALTHY → DEGRADED → UNHEALTHY`)

### WARN

- Collector taking more than 3 seconds
- Authentication failures (403/401)
- Retry attempts (if implemented)
- Service reported as `DEGRADED`

### ERROR

- Collector failure (unhandled exception)
- Unhandled exceptions in the application
- Connection failures to external services

### DEBUG

- Raw API payloads (redacted)
- Internal state transitions
- Collector execution details

---

## Implementation Notes

- Use `console.log` for INFO and WARN (custom formatting).
- Use `console.error` for ERROR.
- Use `console.debug` for DEBUG (not currently implemented).
- Fastify's built‑in logger is disabled; all logging is custom.

---

## How to add logging to a new collector

1. Use `console.log` for normal operational messages.
2. Use `console.error` for failures.
3. Avoid logging sensitive information (passwords, API keys).
4. Keep logs structured – use prefixes like `[Scheduler]`, `[Collector]`, or `[State Change]` for easy filtering.
