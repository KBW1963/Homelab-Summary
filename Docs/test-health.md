# Health Interpreter Test Scenarios

This document describes the test scenarios available via the `/test-health` endpoint. These tests simulate different health conditions to validate the interpreter logic without needing to manipulate real services.

---

## Endpoint

**GET /test-health?scenario=<scenario-name>**

**Authentication:** Requires the `X-API-Key` header.

---

## Scenarios

### 1. `updates-only`

**Description:** Only updates are available – no health issues.

**Simulated Findings:**

- Sonarr: New update available (info)
- Radarr: New update available (info)

**Expected Output:**

```json
{
  "status": "UP",
  "severity": "info",
  "summary": "Updates are available for 2 services. No health issues.",
  "impact": "Services are running normally. Updates are recommended.",
  "recommendedAction": "Apply updates when convenient."
}
```

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=updates-only" | jq
```

---

### 2. warning

**Description:** A service health check is failing.

- \*Simulated Findings:\*\*

* Sonarr: Health check failed – indexers unreachable (warning)

Expected Output:

```json
{
  "status": "DEGRADED",
  "severity": "warning",
  "summary": "Some services have warnings.",
  "impact": "Services are running but may have reduced functionality.",
  "recommendedAction": "Review warnings and take corrective action."
}
```

Test Command:

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=warning" | jq
```

---

### 3. critical-service

Description: A service is unreachable.

Simulated Findings:

- Sonarr: Connection refused to port 8989 (critical)

Expected Output:

````json
{
  "status": "DOWN",
  "severity": "critical",
  "summary": "Critical issues detected. One or more services are offline.",
  "impact": "Some services may be unavailable.",
  "recommendedAction": "Check connectivity and service logs immediately."
}```

**Test Command:**
```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=critical-service" | jq
````

---

### 4. infra-down

**Description:** Infrastructure (TrueNAS) is down.

Simulated Findings:

- TrueNAS: Connection timeout (critical)

Expected Output:

```json
{
  "status": "DOWN",
  "severity": "critical",
  "summary": "Critical issues detected. One or more services are offline.",
  "impact": "Some services may be unavailable.",
  "recommendedAction": "Check connectivity and service logs immediately."
}
```

**Test Command:**

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=infra-down" | jq
```

---

### 5. mixed

**Description:** Infrastructure warning + service updates available.
**Simulated Findings:**

- Proxmox: High memory utilisation warning (degraded)
- Sonarr: New update available (info)

Interpreted Health Output:

- Service side: UP (info)
- Combined (/homepage): WARNING

```json
{
  "status": "UP",
  "severity": "info",
  "summary": "Updates are available for 1 service. No health issues.",
  "impact": "Services are running normally. Updates are recommended.",
  "recommendedAction": "Apply updates when convenient."
}
```

> `Note:` The /homepage endpoint combines service health and infrastructure health. In this scenario, the combined overall status becomes WARNING because of the infrastructure warning.

**Test Command:**

```bash
curl -H "X-API-Key: your-key" "http://localhost:3333/test-health?scenario=mixed" | jq
```

---

## How to extend tests

To add a new scenario:

1. Open src/routes/test-health.ts.
2. Add a new case to the switch statement.
3. Define the findings and optional mock infrastructure states.
4. Set the expected output fields (expectedStatus, expectedSummary, etc.).
5. Run the test and verify the output.
6. Add the scenario to this document.

## Why these tests matter

- Regression testing – ensures the health interpreter behaves consistently after changes.
- Documentation – shows what each severity level means in practice.
- Onboarding – helps new contributors understand the health model without setting up real services.
- Debugging – quickly isolate whether an issue is in the interpreter or a collector.

### Related Documents

- [`philosophy.md`](./philosophy.md) – Health vs. Information and severity hierarchy.
- [`data-model.md`](./data-model.md) – Finding and ServiceStatus definitions.
- [`api.md`](./api.md) – `/health-overview` and `/summary` endpoints.
