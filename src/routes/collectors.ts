// src/routes/collectors.ts
import { FastifyInstance } from "fastify";
import { state } from "../state";
import { CollectorHealth } from "../state"; // Import the type

export default async function collectorsRoutes(fastify: FastifyInstance) {
  fastify.get("/collectors", async () => {
    const stateData = state.getState();
    // FIX: Changed "state.collectorHealth" to "stateData.collectorHealth"
    const health = stateData.collectorHealth || {};

    // FIX: Added ": [string, CollectorHealth]" to tell TypeScript what the values are
    const entries = Object.entries(health).map(
      ([key, value]: [string, CollectorHealth]) => {
        const isHealthy =
          String(value.status || "").toLowerCase() === "healthy";
        const formattedStatus = isHealthy ? "✓ healthy" : value.status;

        return {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          status: formattedStatus,
        };
      },
    );

    return { collectors: entries };
  });
}
