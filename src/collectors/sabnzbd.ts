// src/collectors/sabnzbd.ts
import axios from "axios";
import {
  ServiceStatus,
  deriveStatusFromFindings,
  Finding,
} from "../normalizer";
import { CollectorResult } from "./types";

// Helper: compares two semantic versions (e.g., "5.1.1" vs "5.1.0")
// Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split(".").map(Number);
  const p2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 !== n2) return n1 > n2 ? 1 : -1;
  }
  return 0;
}

export const serviceId = "sabnzbd";
export const serviceName = "SABnzbd";
export { getSabnzbdStatus as fetch };

const FALLBACK_SABNZBD_VERSION = "5.1.0";

async function getLatestSabnzbdVersion(): Promise<string> {
  try {
    const response = await axios.get(
      "https://api.github.com/repos/sabnzbd/sabnzbd/releases/latest",
      {
        timeout: 5000,
      },
    );
    const version = response.data?.tag_name?.replace(/^v/, "");
    if (version) return version;
    return FALLBACK_SABNZBD_VERSION;
  } catch {
    return FALLBACK_SABNZBD_VERSION;
  }
}

export async function getSabnzbdStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const baseUrl = config.SABNZBD_URL;
    const apiKey = config.SABNZBD_API_KEY;

    // Derive the Host header from the base URL
    const host = new URL(baseUrl).host;

    // Use mode=version to check if the service is running
    const versionUrl = `${baseUrl}?mode=version&output=json&apikey=${apiKey}`;
    const versionRes = await axios.get(versionUrl, {
      timeout: 5000,
      headers: {
        Host: host,
      },
    });

    if (versionRes.data && versionRes.data.version) {
      const currentVersion = versionRes.data.version;
      const latestVersion = await getLatestSabnzbdVersion();

      const comparison = compareVersions(currentVersion, latestVersion);
      if (comparison < 0) {
        findings.push({
          category: "update",
          severity: "info",
          message: `New update available: ${latestVersion} (current: ${currentVersion})`,
        });
      }
    } else {
      // If the response is unexpected, treat as a warning
      findings.push({
        category: "connectivity",
        severity: "critical",
        message: "SABnzbd version endpoint returned unexpected response",
      });
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
  } catch (err: any) {
    findings.push({
      category: "connectivity",
      severity: "critical",
      message: `Failed to connect to SABnzbd: ${err.message}`,
    });
    const data: ServiceStatus = {
      id: serviceId,
      name: serviceName,
      status: "DOWN",
      lastUpdate: new Date().toISOString(),
      findings,
      issue: findings[0].message,
      error: err.message,
    };
    return {
      collector: serviceId,
      data,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: err.message,
    };
  }
}
