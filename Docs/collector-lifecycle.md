# Collector Lifecycle

A collector goes through a well‑defined lifecycle, from configuration to data display. Understanding this lifecycle helps you design new collectors and debug existing ones.

---

## Lifecycle Steps

### 1. Read Configuration

The collector reads its configuration from environment variables. This includes:

- `URL` – the endpoint to query
- `TOKEN` or `API_KEY` – authentication credentials
- Any other required parameters (e.g., timeout overrides)

All configuration must be documented in `.env.example` and validated in `src/config.ts`.

---

### 2. Connect to the Service

Using the configuration, the collector establishes a connection to the external service. This usually involves an HTTP request (via `axios`). The collector should:

- Set appropriate headers (e.g., `Authorization`, `Accept`)
- Respect the configured timeout
- Handle SSL/TLS as needed (e.g., `rejectUnauthorized: false` for self‑signed certs)

---

### 3. Collect Raw Data

The collector sends the request and receives the raw response. This response may be:

- JSON
- XML
- Plain text
- Binary (less common)

The collector must parse the raw data without making assumptions about its structure.

---

### 4. Normalise Data

The raw data is transformed into a **normalised format** that is consistent across all collectors.

For service health collectors, the normalised output includes `findings` and a derived `status`.

For other collectors (e.g., network, storage), the output structure may differ but must be well‑defined in `data-model.md`.

---

### 5. Return Result

The collector returns the normalised result, along with a success/failure indication. In case of failure, it returns an error object without throwing.

---

### 6. Scheduler Stores Result

The scheduler runs all collectors on a regular interval (e.g., every 30 seconds). It collects the results and stores them in a central cache.

The scheduler must:

- Run collectors concurrently
- Respect timeouts
- Log successes and failures
- Update the cache atomically

---

### 7. API Serves Result

The Fastify API reads from the cache only. It never calls a collector directly.

This decoupling means:

- The API remains fast (cache reads are near‑instantaneous).
- The API is unaffected by collector failures.
- The API does not depend on the number of collectors.

---

### 8. Homepage (or any client) Displays Result

The client (e.g., Homepage, Grafana, a custom UI) makes authenticated requests to the API and displays the cached data.

The client can poll as frequently as it wants without affecting the external services, because it only reads from the cache.

---

## Why This Lifecycle Matters

- **Separation of concerns** – each component does one thing.
- **Resilience** – a slow collector doesn't slow down the API.
- **Scalability** – adding more collectors does not affect the API's performance.
- **Testability** – each step can be tested in isolation.

This lifecycle is the foundation of the aggregator's architecture.
