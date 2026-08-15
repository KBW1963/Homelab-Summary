// src/collectors/jellyfin.ts
import axios from "axios";
import {
  ServiceStatus,
  deriveStatusFromFindings,
  Finding,
} from "../normalizer";
import { CollectorResult } from "./types";

export const serviceId = "jellyfin";
export const serviceName = "N100 Jellyfin";
export { getJellyfinStatus as fetch };

const FALLBACK_JELLYFIN_VERSION = "10.11.11";

async function getLatestJellyfinVersion(): Promise<string> {
  try {
    // Use the official Jellyfin version endpoint
    const response = await axios.get(
      "https://repo.jellyfin.org/releases/server/latest/stable",
      {
        timeout: 5000,
      },
    );
    // The response is the version string directly (e.g., "10.11.11")
    const version = response.data?.trim();
    if (version) return version;
    return FALLBACK_JELLYFIN_VERSION;
  } catch {
    return FALLBACK_JELLYFIN_VERSION;
  }
}

export async function getJellyfinStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const baseUrl = config.JELLYFIN_URL.replace(/\/health$/, "");
    const token = config.JELLYFIN_TOKEN;

    // 1. Health check
    const healthRes = await axios.get(`${baseUrl}/health`, {
      headers: { "X-Emby-Token": token },
      timeout: 10000,
    });

    if (
      typeof healthRes.data === "string" &&
      healthRes.data.trim() === "Healthy"
    ) {
      // Service is healthy
    } else {
      findings.push({
        category: "health",
        severity: "critical",
        message: "Unexpected response from Jellyfin",
      });
    }

    // 2. Get version info
    try {
      const versionRes = await axios.get(`${baseUrl}/system/info`, {
        headers: { "X-Emby-Token": token },
        timeout: 5000,
      });

      if (versionRes.data && versionRes.data.Version) {
        const currentVersion = versionRes.data.Version;
        const latestVersion = await getLatestJellyfinVersion();

        if (currentVersion !== latestVersion) {
          const isNewer = currentVersion > latestVersion;
          const message = isNewer
            ? `Running newer version: ${currentVersion} (latest: ${latestVersion})`
            : `New update available: ${latestVersion} (current: ${currentVersion})`;

          findings.push({
            category: "update",
            severity: "info",
            message,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn("Jellyfin version endpoint failed:", errorMessage);
    }

    const status = deriveStatusFromFindings(findings);
    const firstFinding = findings.length > 0 ? findings[0] : null;

    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status,
      lastUpdate: new Date().toISOString(),
      findings,
      issue: firstFinding ? firstFinding.message : null,
    };

    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: status === "DOWN" ? "error" : "success",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    findings.push({
      category: "connectivity",
      severity: "critical",
      message: `Failed to connect to Jellyfin: ${errorMessage}`,
    });
    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status: "DOWN",
      lastUpdate: new Date().toISOString(),
      findings,
      issue: findings[0].message,
      error: errorMessage,
    };
    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: errorMessage,
    };
  }
}
