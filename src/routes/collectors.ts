// src/routes/collectors.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";
import { CollectorHealth } from "../state";

export default async function collectorsRoutes(fastify: FastifyInstance) {
  fastify.get("/collectors", async () => {
    const stateData = getState();
    const health = stateData.collectorHealth || {};

    const entries = Object.entries(health).map(
      ([key, value]: [string, CollectorHealth]) => {
        const status = String(value.status || "").toLowerCase();

        // Map status to emoji indicator
        let indicator = "⚪"; // default/unknown
        if (status === "healthy" || status === "up") {
          indicator = "🟢";
        } else if (status === "degraded") {
          indicator = "🟡";
        } else if (status === "unhealthy" || status === "down") {
          indicator = "🔴";
        }

        return {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          status: `${indicator} ${value.status}`, // e.g., "🟢 healthy"
        };
      },
    );

    return { collectors: entries };
  });
}
