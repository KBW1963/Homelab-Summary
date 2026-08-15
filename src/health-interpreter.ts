// src/health-interpreter.ts
import { Finding, HealthStatus } from "./normalizer";

export interface InterpretedHealth {
  status: HealthStatus;
  severity: "info" | "warning" | "critical";
  details: {
    info: Finding[];
    warnings: Finding[];
    critical: Finding[];
  };
  summary: string;
  impact: string;
  recommendedAction: string;
}

export function interpretFindings(findings: Finding[]): InterpretedHealth {
  const info: Finding[] = [];
  const warnings: Finding[] = [];
  const critical: Finding[] = [];

  for (const f of findings) {
    if (f.severity === "info") info.push(f);
    else if (f.severity === "warning") warnings.push(f);
    else if (f.severity === "critical") critical.push(f);
  }

  // Determine status – critical beats warning, warning beats info
  let status: HealthStatus;
  let severity: "info" | "warning" | "critical";

  if (critical.length > 0) {
    status = "DOWN";
    severity = "critical";
  } else if (warnings.length > 0) {
    status = "DEGRADED";
    severity = "warning";
  } else {
    status = "UP";
    severity = "info";
  }

  // Build context-aware messages
  let summary = "";
  let impact = "";
  let recommendedAction = "";

  if (status === "DOWN") {
    summary = "Critical issues detected. One or more services are offline.";
    impact = "Some services may be unavailable.";
    recommendedAction = "Check connectivity and service logs immediately.";
  } else if (status === "DEGRADED") {
    summary = "Some services have warnings.";
    impact = "Services are running but may have reduced functionality.";
    recommendedAction = "Review warnings and take corrective action.";
  } else {
    // Status === 'UP' – we may still have info findings
    if (info.length > 0) {
      const updateCount = info.filter((f) => f.category === "update").length;
      if (updateCount > 0) {
        const plural = updateCount === 1 ? "" : "s";
        summary = `Updates are available for ${updateCount} service${plural}. No health issues.`;
        impact = "Services are running normally. Updates are recommended.";
        recommendedAction = "Apply updates when convenient.";
      } else {
        summary = "All systems operational.";
        impact = "No issues detected.";
        recommendedAction = "No action required.";
      }
    } else {
      summary = "All systems operational.";
      impact = "No issues detected.";
      recommendedAction = "No action required.";
    }
  }

  return {
    status,
    severity,
    details: { info, warnings, critical },
    summary,
    impact,
    recommendedAction,
  };
}
