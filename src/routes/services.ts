// src/routes/services.ts
import { FastifyInstance } from "fastify";
import { state } from "../state";

export default async function servicesRoutes(fastify: FastifyInstance) {
  fastify.get("/services", async () => {
    // FIXED: Added the dot between getState() and services
    const services = state.getState().services || [];

    return services.map((s) => {
      let issueText = "";
      if (s.error) {
        issueText = s.error;
      } else if (s.details?.issues && Array.isArray(s.details.issues)) {
        issueText = s.details.issues.map((i: any) => i.message || i).join(", ");
      } else if (s.findings && Array.isArray(s.findings)) {
        issueText = s.findings.map((f: any) => f.message).join(", ");
      }

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        label: issueText ? `${s.status} — ${issueText}` : s.status,
        lastUpdate: s.lastUpdate,
        details: s.details || null,
        error: s.error || null,
      };
    });
  });
}
