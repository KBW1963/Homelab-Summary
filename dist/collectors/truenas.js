"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrueNASMetrics = getTrueNASMetrics;
// src/collectors/truenas.ts
const axios_1 = __importDefault(require("axios"));
// Helper to format bytes to human-readable (TB or GB)
function formatBytes(bytes) {
    if (bytes === 0)
        return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(1);
    return `${size} ${units[i]}`;
}
async function getTrueNASMetrics(config) {
    try {
        const url = `${config.TRUENAS_HOST}/api/v2.0/pool`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${config.TRUENAS_API_KEY}`,
            },
            timeout: 10000,
        });
        const pools = response.data.map((pool) => ({
            name: pool.name,
            status: pool.status || "UNKNOWN",
            used: formatBytes(pool.allocated || 0),
            free: formatBytes(pool.free || 0),
            health: pool.healthy ? "HEALTHY" : pool.status_code || "UNKNOWN",
        }));
        return { pools };
    }
    catch (error) {
        return { error: `Failed to fetch TrueNAS data: ${error.message}` };
    }
}
