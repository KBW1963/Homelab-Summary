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
exports.serviceName = "Jellyfin";
async function getJellyfinStatus(config) {
    const start = Date.now();
    let data;
    const findings = [];
    try {
        const url = config.JELLYFIN_URL;
        const response = await axios_1.default.get(url, {
            headers: { "X-Emby-Token": config.JELLYFIN_TOKEN },
            timeout: 10000,
        });
        if (typeof response.data === "string" &&
            response.data.trim() === "Healthy") {
            data = {
                id: "jellyfin",
                name: "N100 Jellyfin",
                status: "UP",
                lastUpdate: new Date().toISOString(),
                findings,
                issue: null,
            };
        }
        else {
            findings.push({
                category: "health",
                severity: "critical",
                message: "Unexpected response from Jellyfin",
            });
            data = {
                id: "jellyfin",
                name: "N100 Jellyfin",
                status: "DOWN",
                lastUpdate: new Date().toISOString(),
                findings,
                issue: findings[0].message,
                error: "Unexpected response",
            };
        }
    }
    catch (err) {
        findings.push({
            category: "connectivity",
            severity: "critical",
            message: `Failed to connect to Jellyfin: ${err.message}`,
        });
        data = {
            id: "jellyfin",
            name: "N100 Jellyfin",
            status: "DOWN",
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings[0].message,
            error: err.message,
        };
    }
    data.status = (0, normalizer_1.deriveStatusFromFindings)(findings);
    return {
        collector: "jellyfin",
        data,
        collectedAt: new Date().toISOString(),
        duration: Date.now() - start,
        status: data.status === "DOWN" ? "error" : "success",
        error: data.error,
    };
}
