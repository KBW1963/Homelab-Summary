# Logging Policy

This document defines the logging levels and their usage across the Homelab Summary project. It provides guidance for contributors on what to log and at which level.

---

## Quick Reference

```markdown
| Level     | When to use                                                                                             | Example                                     |
| --------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **INFO**  | Normal operational messages. Startup banner, poll summaries, collector state changes, and API requests. | ✓ Services collector completed in 705ms     |
| **WARN**  | Recoverable issues. Slow collectors (>3s), retries, degraded services.                                  | ⚠ Proxmox timeout after 10008ms             |
| **ERROR** | Failures. Collector failures, unhandled exceptions, authentication errors.                              | ✗ Failed to fetch Plex: connection refused  |
| **DEBUG** | Detailed debugging information. Individual API calls to external services, payload inspection.          | Parsing TrueNAS response: 12 datasets found |
| **TRACE** | Very detailed, low-level logging                                                                        | Request payload: { ... }                    |
```

---

## Log Format

Each log line follows this structure:
[Timestamp] [Service] [Level] Message

**Example:**
19.08.2026 16:19:31 [homelab-summary] ✓ Configuration loaded

### Color Coding (in terminal)

```markdown
| Color      | Meaning                |
| ---------- | ---------------------- |
| Green      | Success (✓)            |
| Yellow     | Warning (⚠)            |
| Red        | Error (✗)              |
| White/Blue | Info (•, regular text) |
```

---

## Log Level Hierarchy

The log level is **inclusive** – setting a level includes all higher-priority levels:

```markdown
| `LOG_LEVEL` | Shows                               |
| ----------- | ----------------------------------- |
| `trace`     | trace + debug + info + warn + error |
| `debug`     | debug + info + warn + error         |
| `info`      | info + warn + error                 |
| `warn`      | warn + error                        |
| `error`     | error only                          |
```

## **Example: `LOG_LEVEL=warn` will only show warnings and errors.**

## What to log (by level)

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

## Interpreting Log Symbols

```markdown
| Symbol | Meaning                                                             |
| ------ | ------------------------------------------------------------------- |
| ✓      | Success – operation completed                                       |
| ⚠      | Warning – operation completed but with issues (e.g., slow response) |
| ✗      | Error – operation failed                                            |
| •      | Item – listing of services or collectors                            |
```

---

## Configuration

### Setting Log Level

Add to your `.env` file:

```markdown
`LOG_LEVEL=info` # Default – shows info, warnings, errors
`LOG_LEVEL=debug` # Shows everything including detailed collector steps
`LOG_LEVEL=error` # Only shows errors
```

---

## Log Examples

```markdown
╔════════════════════════════════════════════╗
║ Homelab Summary v0.1.0-dev ║
╠════════════════════════════════════════════╣
║ Startup ║
║ ✓ Configuration loaded ║
║ ✓ 4 collectors registered ║
║ ✓ Scheduler started ║
║ ✓ Current Homelab State initialised ║
║ ✓ API listening on http://0.0.0.0:3333 ║
╠════════════════════════════════════════════╣
║ Runtime ║
║ Node: v20.20.2 ║
║ Environment: development ║
║ API Version: v0.1.0-dev ║
║ Polling: 30s ║
║ Collectors: 4 ║
╚════════════════════════════════════════════╝
```

### Registered collectors:

• All Services (7 services)
• Network
• Proxmox
• TrueNAS

### Monitored services:

• Starmedia Plex
• N100 Jellyfin
• Sonarr
• Radarr
• Prowlarr
• Seerr
• SABnzbd

──────────────────────────────────────────
Scheduler Poll #1
──────────────────────────────────────────

Collectors:
✓ Services 705ms
✓ Truenas 382ms
⚠ Proxmox 10008ms

    Network Checks:
        ✓ External IP     152ms
        ✓ Tailscale        96ms
        ✓ Pings          3024ms
        ✓ DNS              62ms
        ✓ Interfaces       49ms

──────────────────────────────────────────
✓ Network 3385ms

Poll compelted in 10062ms
──────────────────────────────────────────

---

## Performance Tuning from Logs

Your logs help identify bottlenecks:

⚠ Proxmox 10008ms ← Proxmox took 10 seconds – consider adjusting timeout
✓ Services 705ms ← Fast, good
✓ Truenas 382ms ← Fast, good
✓ Network 3385ms ← Mostly due to pings (3024ms)

If a collector consistently times out:

- Increase PROXMOX_TIMEOUT_MS in your .env file
- Or reduce the number of Proxmox nodes being queried

---

## "Troubleshooting Common Issues"

Help users quickly diagnose problems:

## Troubleshooting with Logs

```markdown
| Issue                       | What to Look For                 | Likely Cause                             |
| --------------------------- | -------------------------------- | ---------------------------------------- |
| **Services not showing**    | ⚠ API_KEY not set                | Missing or invalid API key               |
| **Slow polls**              | ⚠ Collector X took >5s           | Network latency or service overload      |
| **No network data**         | ✗ Network check failed           | Check your `NETWORK_PING_TARGETS`        |
| **Proxmox timeout**         | ⚠ Proxmox timeout after 10000ms  | Proxmox not responding or too many nodes |
| **Tailscale nodes offline** | ⚠ Tailscale API returned 0 nodes | Tailscale API key expired or invalid     |
```

---

## Common Log Events & Their Meanings

### Startup Events

```markdown
| Log Message               | Meaning                                       | Action                |
| ------------------------- | --------------------------------------------- | --------------------- |
| ✓ Configuration loaded    | All environment variables validated           | ✅ Normal             |
| ✓ X collectors registered | The specified number of collectors are active | ✅ Normal             |
| ✓ API listening on :3333  | Server is ready to accept requests            | ✅ Normal             |
| ⚠ TRUENAS_API_KEY not set | TrueNAS collector will be skipped             | Add API key if needed |
```

### Runtime Events

```markdown
| Log Message               | Meaning                                       | Action                      |
| ------------------------- | --------------------------------------------- | --------------------------- |
| ✓ Services 705ms          | All application services checked successfully | ✅ Normal                   |
| ⚠ Proxmox 10008ms         | Proxmox response slow (near timeout)          | Check Proxmox performance   |
| ✗ Collector 'plex' failed | Service didn't respond                        | Check if service is running |
| ⚠ Poll timed out          | Overall poll exceeded the timeout             | Consider increasing timeout |
```

### Network Collector Details

```markdown
The network collector is broken down into sub-checks:

| Check       | What It Does                                     | Expected Time      |
| ----------- | ------------------------------------------------ | ------------------ |
| External IP | Gets public IP (from NETWORK_EXTERNAL_IP_SOURCE) | ~150ms             |
| Tailscale   | Queries Tailscale API for node status            | ~100ms             |
| Pings       | Pings targets (gateway, DNS, internet)           | Depends on network |
| DNS         | Resolves configured DNS targets                  | ~50ms              |
| Interfaces  | Lists network interfaces                         | ~50ms              |
```

---

## Privacy & Security

- IP addresses are automatically redacted when REDACT_IPS=true
- API keys and passwords are never logged
- Full response bodies are only logged at trace level

---

## Log Rotation

Logs are emitted to stdout/stderr. For Docker deployments, logs are managed by Docker:

```bash
# View recent logs
docker logs homelab-summary --tail 50

# Follow logs in real-time
docker logs homelab-summary -f

```

---

## Adding Logs in Code

```typescript
import { logger } from "./logger.js";

// Simple info log
logger.info("Collector started");

// With structured data
logger.info({ collector: "plex", duration: 234 }, "Collector completed");

// Error with context
logger.error({ err, collector: "proxmox" }, "Collector failed");
```

### Implementation Notes

- Use `console.log` for INFO and WARN (custom formatting).
- Use `console.error` for ERROR.
- Use `console.debug` for DEBUG (not currently implemented).
- Fastify's built‑in logger is disabled; all logging is custom.

---

### How to add logging to a new collector

1. Use `console.log` for normal operational messages.
2. Use `console.error` for failures.
3. Avoid logging sensitive information (passwords, API keys).
4. Keep logs structured – use prefixes like `[Scheduler]`, `[Collector]`, or `[State Change]` for easy filtering.

### Contributing

When adding new features or collectors:

1. Use `logger.info()` for normal operations
2. Use `logger.warn()` for slow or degraded operations
3. Use `logger.error()` for failures
4. Add the collector name as a context parameter
5. Never log API keys, passwords, or sensitive data
6. Run `LOG_LEVEL=debug` locally to see detailed output

---

## Log File Locations

```markdown
| Environment | Location                        |
| ----------- | ------------------------------- |
| Docker      | docker logs homelab-summary     |
| Local dev   | console output (stdout)         |
| Production  | Configure via Docker log driver |
```

---

## Monitoring & Alerting

You can set up alerts based on log patterns:

```bash
# Alert on warnings
docker logs homelab-summary --tail 100 | grep "⚠"

# Alert on errors
docker logs homelab-summary --tail 100 | grep "✗"

# Monitor for timeout warnings
docker logs homelab-summary -f | grep "timeout"
```

**Example: Using with Grafana Loki**
If you're using Loki for log aggregation, you can add this label configuration:

```yaml
# In docker-compose.yml
services:
  homelab-summary:
    labels:
      - "loki.service=homelab-summary"
      - "loki.environment=production"
```

---

## Would This Also Help: Prometheus Metrics?

Yes! If you export Prometheus metrics in addition to logs, you get:

```markdown
| Logs                     | Metrics                              |
| ------------------------ | ------------------------------------ |
| Tell you what happened   | Tell you how often it happens        |
| Show error messages      | Show error rates over time           |
| Show collector durations | Show duration percentiles (p50, p95) |
| Human-readable           | Machine-parsable                     |
```

**Example metrics to export:**

- collector_duration_seconds – histogram per collector
- collector_errors_total – counter per collector
- services_healthy_total – gauge of healthy services
- poll_duration_seconds – histogram of total poll time
- poll_errors_total – counter of failed polls

### This would give you:

- Grafana dashboards with visual health status
- Alerts when services go down
- Trend analysis of performance over time

---
