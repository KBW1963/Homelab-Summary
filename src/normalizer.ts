// src/normalizer.ts
import { XMLParser } from "fast-xml-parser";

export type HealthStatus = "UP" | "DEGRADED" | "DOWN" | "UNKNOWN";

export interface Finding {
  category:
    | "health"
    | "update"
    | "connectivity"
    | "configuration"
    | "performance"
    | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  source?: string;
}

export interface ServiceStatus {
  id: string;
  name: string;
  status: HealthStatus;
  lastUpdate: string;
  findings: Finding[];
  issue?: string | null; // shortcut to first finding message
  details?: Record<string, any>;
  error?: string;
}

// ─── Derive status from findings ───
export function deriveStatusFromFindings(findings: Finding[]): HealthStatus {
  if (!findings || findings.length === 0) return "UP";

  const isUnreachable = findings.some(
    (f) => f.severity === "critical" && f.category === "connectivity",
  );
  if (isUnreachable) return "DOWN";

  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasWarning = findings.some((f) => f.severity === "warning");
  if (hasCritical || hasWarning) return "DEGRADED";

  return "UP";
}

// ─── XML Parser (for Plex) ───
export function parseXML(data: unknown, rootKey: string): any {
  if (typeof data !== "string") {
    // If it's already an object, return the root if it exists
    if (data && typeof data === "object" && (data as any)[rootKey]) {
      return (data as any)[rootKey];
    }
    return null;
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(data);
    return parsed[rootKey] || null;
  } catch {
    return null;
  }
}

// ─── Legacy helpers (kept for backward compatibility) ───
export function inferStatus(data: any): HealthStatus {
  if (!data) return "UNKNOWN";
  if (data.status === "pass") return "UP";
  if (data.status === "fail") return "DOWN";
  if (data.status === "warn") return "DEGRADED";
  if (data.status === "ok" || data.status === "healthy" || data.status === "up")
    return "UP";
  if (data.database) {
    if (data.database === "ok" || data.database === "up") return "UP";
    if (data.database === "down" || data.database === "error") return "DOWN";
    return "DEGRADED";
  }
  if (data.error) return "DOWN";
  return "UNKNOWN";
}

export function extractVersion(data: any): string | undefined {
  return data.version || data.release || data.buildInfo?.version;
}
