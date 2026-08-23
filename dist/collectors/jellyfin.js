"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getJellyfinStatus = getJellyfinStatus;
exports.fetch = getJellyfinStatus;
// src/collectors/jellyfin.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
exports.serviceId = "jellyfin";
exports.serviceName = "N100 Jellyfin";
const FALLBACK_JELLYFIN_VERSION = "10.11.11";
async function getLatestJellyfinVersion() {
    try {
        // Use the official Jellyfin version endpoint
        const response = await axios_1.default.get("https://repo.jellyfin.org/releases/server/latest/stable", {
            timeout: 5000,
        });
        // The response is the version string directly (e.g., "10.11.11")
        const version = response.data?.trim();
        if (version)
            return version;
        return FALLBACK_JELLYFIN_VERSION;
    }
    catch {
        return FALLBACK_JELLYFIN_VERSION;
    }
}
async function getJellyfinStatus(config) {
    const start = Date.now();
    const findings = [];
    try {
        const baseUrl = config.JELLYFIN_URL.replace(/\/health$/, "");
        const token = config.JELLYFIN_TOKEN;
        // 1. Health check
        const healthRes = await axios_1.default.get(`${baseUrl}/health`, {
            headers: { "X-Emby-Token": token },
            timeout: 10000,
        });
        if (typeof healthRes.data === "string" &&
            healthRes.data.trim() === "Healthy") {
            // Service is healthy
        }
        else {
            findings.push({
                category: "health",
                severity: "critical",
                message: "Unexpected response from Jellyfin",
            });
        }
        // 2. Get version info
        try {
            const versionRes = await axios_1.default.get(`${baseUrl}/system/info`, {
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
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.warn("Jellyfin version endpoint failed:", errorMessage);
        }
        const status = (0, normalizer_1.deriveStatusFromFindings)(findings);
        const firstFinding = findings.length > 0 ? findings[0] : null;
        const data = {
            id: exports.serviceId,
            name: exports.serviceName,
            status,
            lastUpdate: new Date().toISOString(),
            findings,
            issue: firstFinding ? firstFinding.message : null,
        };
        return {
            collector: exports.serviceId,
            data,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: status === "DOWN" ? "error" : "success",
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        findings.push({
            category: "connectivity",
            severity: "critical",
            message: `Failed to connect to Jellyfin: ${errorMessage}`,
        });
        const data = {
            id: exports.serviceId,
            name: exports.serviceName,
            status: "DOWN",
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings[0].message,
            error: errorMessage,
        };
        return {
            collector: exports.serviceId,
            data,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "error",
            error: errorMessage,
        };
    }
}
