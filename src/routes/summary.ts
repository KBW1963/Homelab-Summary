// src/routes/summary.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";
import { interpretFindings } from "../health-interpreter";
import { Finding } from "../normalizer";

export default async function summaryRoutes(fastify: FastifyInstance) {
  // ─── Endpoint: /summary (Detailed services list) ───
  fastify.get("/summary", async () => {
    const data = getState();
    const services = data.services || [];

    const up = services.filter((s) => s.status === "UP").length;
    const down = services.filter((s) => s.status === "DOWN").length;
    const degraded = services.filter((s) => s.status === "DEGRADED").length;

    const allFindings: Finding[] = [];
    for (const s of services) {
      if (s.findings) allFindings.push(...s.findings);
    }
    const interpreted = interpretFindings(allFindings);

    // Severity weight for sorting findings
    const severityWeight: Record<string, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    const serviceList = services.map((s) => {
      const findings = s.findings || [];
      if (findings.length === 0) {
        return {
          name: s.name,
          status: s.status,
          label: s.status,
        };
      }

      // Sort findings by severity (critical > warning > info)
      const sortedFindings = [...findings].sort(
        (a, b) =>
          (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0),
      );

      // Build label with all messages separated by " | "
      const messages = sortedFindings.map((f) => f.message);
      const label =
        messages.length === 1
          ? `${s.status} — ${messages[0]}`
          : `${s.status} — ${messages.join(" | ")}`;

      return {
        name: s.name,
        status: s.status,
        label,
      };
    });

    return {
      overall: interpreted.status,
      severity: interpreted.severity,
      summary: interpreted.summary,
      impact: interpreted.impact,
      recommendedAction: interpreted.recommendedAction,
      total: services.length,
      up,
      down,
      degraded,
      lastUpdate: new Date().toISOString(),
      services: serviceList,
      infrastructure: {
        truenas: data.truenas,
        proxmox: data.proxmox,
        network: data.network,
      },
    };
  });

  // ─── Endpoint: /homepage (Top card widget) ───
  fastify.get("/homepage", async () => {
    const data = getState();
    const services = data.services || [];

    const allFindings: Finding[] = [];
    for (const s of services) {
      if (s.findings) allFindings.push(...s.findings);
    }
    const interpreted = interpretFindings(allFindings);

    // Counts
    const totalServices = services.length;
    const upServices = services.filter((s) => s.status === "UP").length;
    const degradedServices = services.filter(
      (s) => s.status === "DEGRADED",
    ).length;
    const downServices = services.filter((s) => s.status === "DOWN").length;

    const updateCount = allFindings.filter(
      (f) => f.category === "update",
    ).length;

    const notificationCount = allFindings.filter(
      (f) => f.category === "health" && f.severity === "info",
    ).length;

    // Infrastructure health
    const truenasOk = data.truenas && !(data.truenas as any)?.error;
    const proxmoxOk = data.proxmox && !(data.proxmox as any)?.error;
    const infraOk = truenasOk && proxmoxOk;

    let displayStatus = "HEALTHY";
    let finalSeverity = interpreted.severity;
    let summaryParts: string[] = [];

    if (!infraOk) {
      displayStatus = "CRITICAL";
      finalSeverity = "critical";
      summaryParts = [
        "Infrastructure issue detected",
        "Some services may be affected",
      ];
    } else if (downServices > 0) {
      displayStatus = "DOWN";
      finalSeverity = "critical";
      summaryParts = [`${downServices} service(s) down`];
    } else if (degradedServices > 0) {
      displayStatus = "WARNING";
      finalSeverity = "warning";
      summaryParts = [`${degradedServices} service(s) degraded`];
    } else {
      displayStatus = "HEALTHY";
      finalSeverity = "info";
      // Build granular summary
      if (upServices > 0)
        summaryParts.push(`${upServices}/${totalServices} services healthy`);
      if (notificationCount > 0)
        summaryParts.push(`${notificationCount} notification(s)`);
      if (updateCount > 0)
        summaryParts.push(`${updateCount} update(s) available`);
      if (summaryParts.length === 0) summaryParts.push("All services healthy");
      //      summaryParts.push("See Homelab Services for details.");
    }

    return {
      status: displayStatus,
      severity: finalSeverity,
      summary: summaryParts.join(" | "),
      updatesAvailable: updateCount,
      notifications: notificationCount,
      infrastructureHealthy: infraOk,
      services: {
        total: totalServices,
        up: upServices,
        degraded: degradedServices,
        down: downServices,
      },
    };
  });
}
