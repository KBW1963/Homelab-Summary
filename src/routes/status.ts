// src/routes/status.ts
import { FastifyInstance } from "fastify";
import { state } from "../state";

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get("/status", async () => {
    const stateData = state.getState();
    // FIX: Changed "state.services" to "stateData.services"
    const services = stateData.services || [];
    return services;
  });

  fastify.get("/status/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const services = state.getState().services || [];
    const service = services.find((s) => s.id === id);
    if (!service) {
      reply.code(404).send({ error: "Service not found" });
      return;
    }
    return service;
  });

  fastify.get("/status/summary", async () => {
    const services = state.getState().services || [];
    if (!Array.isArray(services) || services.length === 0) {
      return {
        overall: "UNKNOWN",
        total: 0,
        up: 0,
        down: 0,
        degraded: 0,
        lastUpdate: new Date().toISOString(),
        issues: [],
        services: [],
      };
    }
    const up = services.filter((s) => s.status === "UP").length;
    const down = services.filter((s) => s.status === "DOWN").length;
    const degraded = services.filter((s) => s.status === "DEGRADED").length;
    const total = services.length;
    let overall = "UP";
    if (down > 0) overall = "DOWN";
    else if (degraded > 0) overall = "DEGRADED";
    const issues = services
      .filter((s) => s.status !== "UP")
      .map((s) => s.name + ": " + s.status);
    return {
      overall,
      total,
      up,
      down,
      degraded,
      lastUpdate: new Date().toISOString(),
      issues,
      services: services.map((s) => ({ name: s.name, status: s.status })),
    };
  });
}
