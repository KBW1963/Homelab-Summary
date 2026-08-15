"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createArrCollector = createArrCollector;
// src/collectors/arr-common.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
async function createArrCollector(id, name, url, apiKey) {
    const start = Date.now();
    let data;
    const findings = [];
    try {
        const response = await axios_1.default.get(url, {
            headers: { "X-Api-Key": apiKey },
            timeout: 10000,
        });
        if (Array.isArray(response.data) && response.data.length > 0) {
            for (const issue of response.data) {
                let severity = "warning";
                if (issue.source === "UpdateCheck") {
                    severity = "info";
                }
                else if (issue.source === "NotificationStatusCheck" ||
                    issue.message?.toLowerCase().includes("notification")) {
                    severity = "info"; // ← FIXED: now "info"
                }
                else if (issue.type === "error") {
                    severity = "critical";
                }
                else {
                    severity = "warning";
                }
                let message;
                if (issue.source === "UpdateCheck") {
                    const version = issue.message.replace(/^New update is available:\s*/i, "");
                    message = `New update available: ${version}`;
                }
                else if (issue.source === "NotificationStatusCheck") {
                    message = issue.message
                        .replace(/^Reports?:\s*/i, "")
                        .replace(/^All notifications are unavailable due to failures/i, "All notifications unavailable");
                }
                else {
                    const cleanMessage = issue.message.replace(/^Reports?:\s*/i, "");
                    message = cleanMessage;
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
            details: { issues: response.data },
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
