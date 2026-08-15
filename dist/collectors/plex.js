"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getPlexStatus = getPlexStatus;
exports.fetch = getPlexStatus;
// src/collectors/plex.ts
const axios_1 = __importDefault(require("axios"));
const normalizer_1 = require("../normalizer");
exports.serviceId = "plex";
exports.serviceName = "Starmedia Plex";
// Fallback version if the API fails
const FALLBACK_PLEX_VERSION = "1.43.3.10828-00f62d37d";
// Fetch latest Plex version from official API
async function getLatestPlexVersion() {
    try {
        // Use the public release channel
        const response = await axios_1.default.get("https://plex.tv/api/downloads/1.json?channel=public", {
            timeout: 5000,
        });
        // The version is nested in the response
        const version = response.data?.computer?.Linux?.version;
        if (version)
            return version;
        return FALLBACK_PLEX_VERSION;
    }
    catch {
        return FALLBACK_PLEX_VERSION;
    }
}
async function getPlexStatus(config) {
    const start = Date.now();
    let data;
    const findings = [];
    try {
        const url = config.PLEX_URL;
        const response = await axios_1.default.get(url, {
            headers: { "X-Plex-Token": config.PLEX_TOKEN },
            timeout: 10000,
        });
        const container = (0, normalizer_1.parseXML)(response.data, "MediaContainer");
        if (container && container.version) {
            const currentVersion = container.version;
            // Fetch latest version dynamically
            const latestVersion = await getLatestPlexVersion();
            // Check if a newer version is available
            if (currentVersion !== latestVersion) {
                findings.push({
                    category: "update",
                    severity: "info",
                    message: `New update available: ${latestVersion} (current: ${currentVersion})`,
                });
            }
            data = {
                id: "plex",
                name: "Starmedia Plex",
                status: "UP",
                lastUpdate: new Date().toISOString(),
                findings,
                issue: findings.length > 0 ? findings[0].message : null,
                details: { version: container.version },
            };
        }
        else {
            findings.push({
                category: "health",
                severity: "critical",
                message: "Invalid response from Plex",
            });
            data = {
                id: "plex",
                name: "Starmedia Plex",
                status: "DOWN",
                lastUpdate: new Date().toISOString(),
                findings,
                issue: findings[0].message,
                error: "Invalid response",
            };
        }
    }
    catch (err) {
        findings.push({
            category: "connectivity",
            severity: "critical",
            message: `Failed to connect to Plex: ${err.message}`,
        });
        data = {
            id: "plex",
            name: "Starmedia Plex",
            status: "DOWN",
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings[0].message,
            error: err.message,
        };
    }
    data.status = (0, normalizer_1.deriveStatusFromFindings)(findings);
    return {
        collector: "plex",
        data,
        collectedAt: new Date().toISOString(),
        duration: Date.now() - start,
        status: data.status === "DOWN" ? "error" : "success",
        error: data.error,
    };
}
