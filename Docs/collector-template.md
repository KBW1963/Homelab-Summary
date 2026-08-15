# Adding a New Collector

## This guide walks you through adding a new collector to the aggregator, following the Twelve Rules and the Collector Lifecycle.

## Step 1 – Define the Collector's Purpose

Clearly state what the collector does, which service it targets, and what data it collects.

**Example:**

> **Collector:** Proxmox  
> **Purpose:** Collect node status, CPU, memory, and VM/container counts from a Proxmox cluster.  
> **Permissions:** Read‑only API token with `Sys.Audit` and `VM.Monitor` privileges.

---

## Step 2 – Identify Required Configuration

List the environment variables the collector needs:

- `PROXMOX_HOST` – the base URL of the Proxmox API (e.g., `https://192.168.0.20:8006`)
- `PROXMOX_API_TOKEN` – the API token string

Add these to `.env.example` and `src/config.ts`.

---

## Step 3 – Implement the Collector

Create a new file in `src/collectors/` (e.g., `proxmox.ts`). The collector must export a function that:

- `serviceId` – unique identifier (e.g., `'proxmox'`)
- `serviceName` – human‑readable name (e.g., `'Proxmox'`)
- `fetch` – alias to the main collect function
- A `get<Service>Status` function that returns `CollectorResult<ServiceStatus>`

**Example skeleton:**

```typescript
// src/collectors/proxmox.ts
import {
  ServiceStatus,
  deriveStatusFromFindings,
  Finding,
} from "../normalizer";
import { CollectorResult } from "./types";

export const serviceId = "proxmox";
export const serviceName = "Proxmox";
export { getProxmoxStatus as fetch };

export async function getProxmoxStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    // 1. Read configuration
    const url = config.PROXMOX_HOST;
    const response = await axios.get(url, {
      headers: { Authorization: config.PROXMOX_API_TOKEN },
      timeout: 10000,
    });

    // 2. Normalise data
    const nodes = response.data.data.map((node: any) => ({
      name: node.node,
      status: node.status === "online" ? "online" : "offline",
      // ... more fields
    }));

    // 3. Build ServiceStatus
    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status: "UP",
      lastUpdate: new Date().toISOString(),
      findings,
      // ... details
    };

    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (err: any) {
    findings.push({
      category: "connectivity",
      severity: "critical",
      message: `Failed to connect: ${err.message}`,
    });
    // ... return error status
  }
}
```

### Rules to follow:

- Use a timeout (10 seconds recommended).
- Handle errors gracefully (return { error: ... }).
- Do not throw exceptions – let the function handle them.
- Do not log directly – the caller (scheduler) will log.
- Ensure the collector is independent (no external dependencies).

---

## Step 4 – Register the Collector

In src/collectors/services.ts, import your collector and add it to the serviceRegistry array:

```typescript
import * as myService from "./my-service";

const serviceRegistry = [
  // ... existing
  {
    id: myService.serviceId,
    name: myService.serviceName,
    fetch: myService.fetch,
  },
];
```

---

## Step 5 – Test the Collector

Run the collector independently (without the full server) to verify it works.

## Create a test script (e.g., test-collector.js) that loads environment variables and calls the collector directly.

## Step 6 – Document the Collector

- Purpose – what it does.
- Required permissions – what API keys or tokens are needed.
- Configuration – all environment variables.
- Normalised output – describe the returned data structure.

---

# Important Notes

- Do not add a route. The API reads from the cache, not from individual collectors.
- Do not modify the API. The collector is internal.
- Follow the Twelve Rules. Every step above respects those rules.

# Summary

Step Action

1. Define the collector's purpose
2. Identify configuration
3. Implement the collector
4. Register with scheduler
5. Test independently
6. Document everything
