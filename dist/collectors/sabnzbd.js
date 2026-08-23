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
const FALLBACK_SABNZBD_VERSION = "5.1.0";
async function getLatestSabnzbdVersion() {
    try {
        const response = await axios_1.default.get("https://api.github.com/repos/sabnzbd/sabnzbd/releases/latest", {
            timeout: 5000,
        });
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
        // Derive the Host header from the base URL
        const host = new URL(baseUrl).host;
        // Use mode=version to check if the service is running
        const versionUrl = `${baseUrl}?mode=version&output=json&apikey=${apiKey}`;
        const versionRes = await axios_1.default.get(versionUrl, {
            timeout: 5000,
            headers: {
                Host: host,
            },
        });
        if (versionRes.data && versionRes.data.version) {
            const currentVersion = versionRes.data.version;
            const latestVersion = await getLatestSabnzbdVersion();
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
        else {
            // If the response is unexpected, treat as a warning
            findings.push({
                category: "connectivity",
                severity: "critical",
                message: "SABnzbd version endpoint returned unexpected response",
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
