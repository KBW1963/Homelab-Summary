"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getSabnzbdStatus = getSabnzbdStatus;
exports.fetch = getSabnzbdStatus;
// src/collectors/sabnzbd.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
exports.serviceId = "sabnzbd";
exports.serviceName = "SABnzbd";
// Fallback version if the API fails
const FALLBACK_SABNZBD_VERSION = "4.4.0";
// Fetch latest SABnzbd version from GitHub releases
async function getLatestSabnzbdVersion() {
    try {
        const response = await axios_1.default.get("https://api.github.com/repos/sabnzbd/sabnzbd/releases/latest", {
            timeout: 5000,
        });
        // GitHub returns tag_name like "v4.4.0" – remove the 'v' prefix
        const version = response.data?.tag_name?.replace(/^v/, "");
        if (version)
            return version;
        return FALLBACK_SABNZBD_VERSION;
    }
    catch {
        return FALLBACK_SABNZBD_VERSION;
    }
}
async function getSabnzbdStatus(config) {
    const start = Date.now();
    const findings = [];
    try {
        const baseUrl = config.SABNZBD_URL;
        const apiKey = config.SABNZBD_API_KEY;
        // 1. Get queue status (check if service is running)
        const queueUrl = `${baseUrl}/api?mode=qstatus&output=json&apikey=${apiKey}`;
        const queueRes = await axios_1.default.get(queueUrl, { timeout: 10000 });
        if (queueRes.data && queueRes.data.status === true) {
            const sabStatus = queueRes.data.data?.status || "Unknown";
            if (sabStatus !== "Running") {
                findings.push({
                    category: "health",
                    severity: "warning",
                    message: `SABnzbd is ${sabStatus}`,
                });
            }
        }
        else {
            findings.push({
                category: "health",
                severity: "warning",
                message: "Unexpected response from SABnzbd",
            });
        }
        // 2. Get version info
        const versionUrl = `${baseUrl}/api?mode=version&output=json&apikey=${apiKey}`;
        const versionRes = await axios_1.default.get(versionUrl, { timeout: 5000 });
        if (versionRes.data && versionRes.data.version) {
            const currentVersion = versionRes.data.version;
            // Fetch latest version dynamically
            const latestVersion = await getLatestSabnzbdVersion();
            // Check if a newer version is available
            if (currentVersion !== latestVersion) {
                findings.push({
                    category: "update",
                    severity: "info",
                    message: `New update available: ${latestVersion} (current: ${currentVersion})`,
                });
            }
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
        findings.push({
            category: "connectivity",
            severity: "critical",
            message: `Failed to connect to SABnzbd: ${err.message}`,
        });
        const data = {
            id: exports.serviceId,
            name: exports.serviceName,
            status: "DOWN",
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings[0].message,
            error: err.message,
        };
        return {
            collector: exports.serviceId,
            data,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "error",
            error: err.message,
        };
    }
}
