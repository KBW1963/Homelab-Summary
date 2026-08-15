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
async function getSeerrStatus(config) {
    const start = Date.now();
    const findings = [];
    try {
        const url = config.SEERR_URL;
        const response = await axios_1.default.get(url, {
            headers: { "X-Api-Key": config.SEERR_API_KEY },
            timeout: 10000,
        });
        // Seerr returns { version, commitTag, updateAvailable, ... }
        if (response.data.version) {
            // All good – no findings
        }
        else {
            findings.push({
                category: "health",
                severity: "warning",
                message: "Unexpected response from Seerr",
            });
        }
        const status = (0, normalizer_1.deriveStatusFromFindings)(findings);
        const data = {
            id: exports.serviceId,
            name: exports.serviceName,
            status,
            lastUpdate: new Date().toISOString(),
            findings,
            issue: findings.length > 0 ? findings[0].message : null,
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
            message: `Failed to connect to Seerr: ${err.message}`,
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
