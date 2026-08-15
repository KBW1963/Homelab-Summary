// src/routes/test-health.ts
import { FastifyInstance } from "fastify";
import { interpretFindings } from "../health-interpreter";
import { Finding } from "../normalizer";

export default async function testHealthRoutes(fastify: FastifyInstance) {
  fastify.get("/test-health", async (request) => {
    const { scenario } = request.query as { scenario?: string };

    let findings: Finding[] = [];
    let mockTruenas: any = { status: "UP" };
    let mockProxmox: any = { status: "UP" };
    let mockNetwork: any = { status: "UP" };
    let description = "";
    let expectedStatus = "";
    let expectedSeverity = "";
    let expectedSummary = "";
    let expectedImpact = "";
    let expectedAction = "";

    switch (scenario) {
      case "updates-only":
        description = "Only updates available (info)";
        expectedStatus = "UP";
        expectedSeverity = "info";
        expectedSummary =
          "Updates are available for 2 services. No health issues.";
        expectedImpact =
          "Services are running normally. Updates are recommended.";
        expectedAction = "Apply updates when convenient.";
        findings = [
          {
            category: "update",
            severity: "info",
            message: "New update available: v4.0.19.2997",
            source: "Sonarr",
          },
          {
            category: "update",
            severity: "info",
            message: "New update available: v6.4.1.10545",
            source: "Radarr",
          },
        ];
        break;

      case "warning":
        description = "Service health warning (warning)";
        expectedStatus = "DEGRADED";
        expectedSeverity = "warning";
        expectedSummary = "Some services have warnings.";
        expectedImpact =
          "Services are running but may have reduced functionality.";
        expectedAction = "Review warnings and take corrective action.";
        findings = [
          {
            category: "health",
            severity: "warning",
            message: "Health check failed: indexers unreachable",
            source: "Sonarr",
          },
        ];
        break;

      case "critical-service":
        description = "Service connectivity failure (critical)";
        expectedStatus = "DOWN";
        expectedSeverity = "critical";
        expectedSummary =
          "Critical issues detected. One or more services are offline.";
        expectedImpact = "Some services may be unavailable.";
        expectedAction = "Check connectivity and service logs immediately.";
        findings = [
          {
            category: "connectivity",
            severity: "critical",
            message: "Connection refused to port 8989",
            source: "Sonarr",
          },
        ];
        break;

      case "infra-down":
        description = "Infrastructure failure: TrueNAS unreachable";
        expectedStatus = "DOWN";
        expectedSeverity = "critical";
        expectedSummary =
          "Critical issues detected. One or more services are offline.";
        expectedImpact = "Some services may be unavailable.";
        expectedAction = "Check connectivity and service logs immediately.";
        mockTruenas = {
          status: "DOWN",
          error: "Connection timeout to TrueNAS API",
        };
        findings = [
          {
            category: "connectivity",
            severity: "critical",
            message: "TrueNAS unreachable",
            source: "TrueNAS",
          },
        ];
        break;

      case "mixed":
        description = "Mixed: Infrastructure warning + Service updates";
        expectedStatus = "UP"; // Service side remains UP
        expectedSeverity = "info";
        expectedSummary =
          "Updates are available for 1 service. No health issues.";
        expectedImpact =
          "Services are running normally. Updates are recommended.";
        expectedAction = "Apply updates when convenient.";
        mockProxmox = {
          status: "DEGRADED",
          error: "High memory utilization warning",
        };
        findings = [
          {
            category: "update",
            severity: "info",
            message: "New update available: v4.0.19.2997",
            source: "Sonarr",
          },
        ];
        break;

      default:
        description = "Default: updates only";
        expectedStatus = "UP";
        expectedSeverity = "info";
        expectedSummary =
          "Updates are available for 1 service. No health issues.";
        expectedImpact =
          "Services are running normally. Updates are recommended.";
        expectedAction = "Apply updates when convenient.";
        findings = [
          {
            category: "update",
            severity: "info",
            message: "New update available: v4.0.19.2997",
            source: "Sonarr",
          },
        ];
    }

    // Run interpreter on findings
    const interpreted = interpretFindings(findings);

    // Simulate infrastructure rollup (matching /homepage logic)
    const infraErrors = [mockTruenas, mockProxmox, mockNetwork].filter(
      (i) => i.status !== "UP",
    );
    const infrastructureStatus =
      infraErrors.length > 0 ? "DEGRADED" : "HEALTHY";

    // Determine combined overall status (matching /homepage)
    let overallStatus: string = interpreted.status;
    if (infrastructureStatus === "DEGRADED" && overallStatus === "UP") {
      overallStatus = "WARNING";
    } else if (
      infrastructureStatus === "DEGRADED" &&
      overallStatus === "DEGRADED"
    ) {
      overallStatus = "DEGRADED";
    } else if (overallStatus === "DOWN") {
      overallStatus = "DOWN";
    }

    return {
      scenario: description,
      expected: {
        status: expectedStatus,
        severity: expectedSeverity,
        summary: expectedSummary,
        impact: expectedImpact,
        recommendedAction: expectedAction,
      },
      simulatedState: {
        infrastructure: infrastructureStatus,
        infrastructureErrors: infraErrors,
        servicesStatus: interpreted.status,
        overallStatus: overallStatus,
      },
      interpretedHealth: {
        status: interpreted.status,
        severity: interpreted.severity,
        summary: interpreted.summary,
        impact: interpreted.impact,
        recommendedAction: interpreted.recommendedAction,
      },
      findingsCount: {
        info: interpreted.details.info.length,
        warnings: interpreted.details.warnings.length,
        critical: interpreted.details.critical.length,
      },
      rawFindings: findings,
    };
  });
}
