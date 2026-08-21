"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getSeerrStatus = getSeerrStatus;
exports.fetch = getSeerrStatus;
// src/collectors/seerr.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
exports.serviceId = "seerr";
exports.serviceName = "Seerr";
const FALLBACK_SEERR_VERSION = "3.4.1";
async function getLatestSeerrVersion() {
    try {
        // Correct repository: seerr-team/seerr
        const response = await axios_1.default.get("https://api.github.com/repos/seerr-team/seerr/releases/latest", {
            timeout: 5000,
        });
        const version = response.data?.tag_name?.replace(/^v/, "");
        if (version)
            return version;
        return FALLBACK_SEERR_VERSION;
    }
    catch {
        return FALLBACK_SEERR_VERSION;
    }
}
// Simple version comparison function
function compareVersions(v1, v2) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2)
            return 1;
        if (p1 < p2)
            return -1;
    }
    return 0;
}
async function getSeerrStatus(config) {
    const start = Date.now();
    const findings = [];
    try {
        const url = config.SEERR_URL;
        const apiKey = config.SEERR_API_KEY;
        // 1. Status check
        const response = await axios_1.default.get(url, {
            headers: { "X-Api-Key": apiKey },
            timeout: 10000,
        });
        if (response.data && response.data.version) {
            const currentVersion = response.data.version;
            const latestVersion = await getLatestSeerrVersion();
            if (currentVersion !== latestVersion) {
                const isNewer = compareVersions(currentVersion, latestVersion) > 0;
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
        else {
            findings.push({
                category: "health",
                severity: "warning",
                message: "Unexpected response from Seerr",
            });
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
            message: `Failed to connect to Seerr: ${errorMessage}`,
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
