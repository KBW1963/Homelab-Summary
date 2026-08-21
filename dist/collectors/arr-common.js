"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createArrCollector = createArrCollector;
// src/collectors/arr-common.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
const sourceMap = {
    NotificationStatusCheck: "Notifications",
    UpdateCheck: "UpdateCheck",
    IndexerStatusCheck: "Indexers",
    DownloadClientStatusCheck: "Download Client",
    ImportStatusCheck: "Import",
    DiskSpaceCheck: "Disk Space",
    SystemStatusCheck: "System",
};
async function createArrCollector(id, name, url, apiKey) {
    const start = Date.now();
    let data;
    const findings = [];
    let currentVersion = null;
    try {
        // 1. Get health status (issues)
        const response = await axios_1.default.get(url, {
            headers: { "X-Api-Key": apiKey },
            timeout: 10000,
        });
        // 2. Get current version from system/status
        try {
            const versionUrl = url.replace(/\/health$/, "/system/status");
            const versionRes = await axios_1.default.get(versionUrl, {
                headers: { "X-Api-Key": apiKey },
                timeout: 5000,
            });
            if (versionRes.data && versionRes.data.version) {
                currentVersion = versionRes.data.version;
            }
        }
        catch {
            // Version endpoint not available – ignore
        }
        if (Array.isArray(response.data) && response.data.length > 0) {
            for (const issue of response.data) {
                let severity = "warning";
                if (issue.source === "UpdateCheck") {
                    severity = "info";
                }
                else if (issue.source === "NotificationStatusCheck" ||
                    issue.message?.toLowerCase().includes("notification")) {
                    severity = "info";
                }
                else if (issue.type === "error") {
                    severity = "critical";
                }
                else {
                    severity = "warning";
                }
                const rawSource = issue.source || "System";
                const sourceLabel = sourceMap[rawSource] || rawSource;
                let message;
                if (issue.source === "UpdateCheck") {
                    // Extract the version from the message (e.g., "New update is available: v4.0.19.3001")
                    const versionMatch = issue.message.match(/(?:v?[\d.]+)/);
                    const latestVersion = versionMatch ? versionMatch[0] : "unknown";
                    const currentVersionStr = currentVersion
                        ? ` (current: ${currentVersion})`
                        : "";
                    message = `New update available: ${latestVersion}${currentVersionStr}`;
                }
                else {
                    const cleanMessage = issue.message.replace(/^Reports?:\s*/i, "");
                    message = `${sourceLabel}: ${cleanMessage}`;
                }
                findings.push({
                    category: issue.source === "UpdateCheck" ? "update" : "health",
                    severity,
                    message,
                    source: issue.source,
                });
            }
        }
        // Sort findings: updates first
        findings.sort((a, b) => {
            if (a.category === "update" && b.category !== "update")
                return -1;
            if (b.category === "update" && a.category !== "update")
                return 1;
            return 0;
        });
        const status = (0, normalizer_1.deriveStatusFromFindings)(findings);
        const firstFinding = findings.length > 0 ? findings[0] : null;
        data = {
            id,
            name,
            status,
            lastUpdate: new Date().toISOString(),
            findings,
            issue: firstFinding ? firstFinding.message : null,
            details: { issues: response.data, version: currentVersion },
        };
    }
    catch (err) {
        findings.push({
            category: "connectivity",
            severity: "critical",
            message: `Failed to connect to ${name}: ${err.message}`,
        });
        data = {
            id,
            name,
            status: "DOWN",
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings[0].message,
            error: err.message,
        };
    }
    data.status = (0, normalizer_1.deriveStatusFromFindings)(findings);
    return {
        collector: id,
        data,
        collectedAt: new Date().toISOString(),
        duration: Date.now() - start,
        status: data.status === "DOWN" ? "error" : "success",
        error: data.error,
    };
}
