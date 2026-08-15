"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectorNames = exports.collectorCount = exports.CollectorManager = void 0;
const services_1 = require("./collectors/services"); // <-- This now handles ALL apps
const truenas_1 = require("./collectors/truenas");
const proxmox_1 = require("./collectors/proxmox");
const network_1 = require("./collectors/network");
const collectors = [
    {
        id: "services",
        name: "All Services",
        collect: async (config) => {
            const result = await (0, services_1.getAllServices)(config);
            return result;
        },
    },
    {
        id: "truenas",
        name: "TrueNAS",
        collect: async (config) => {
            const raw = await (0, truenas_1.getTrueNASMetrics)(config);
            const isError = raw && raw.error;
            return {
                collector: "truenas",
                data: raw,
                collectedAt: new Date().toISOString(),
                duration: 0,
                status: isError ? "error" : "success",
                error: isError ? raw.error : undefined,
            };
        },
    },
    {
        id: "proxmox",
        name: "Proxmox",
        collect: async (config) => {
            const raw = await (0, proxmox_1.getProxmoxMetrics)(config);
            const isError = raw && raw.error;
            return {
                collector: "proxmox",
                data: raw,
                collectedAt: new Date().toISOString(),
                duration: 0,
                status: isError ? "error" : "success",
                error: isError ? raw.error : undefined,
            };
        },
    },
    {
        id: "network",
        name: "Network",
        collect: async (config) => {
            const raw = await (0, network_1.getNetworkMetrics)(config);
            const isError = raw && raw.error;
            return {
                collector: "network",
                data: raw,
                collectedAt: new Date().toISOString(),
                duration: 0,
                status: isError ? "error" : "success",
                error: isError ? raw.error : undefined,
            };
        },
    },
];
class CollectorManager {
    constructor() {
        this.collectors = [];
        this.collectors = collectors;
    }
    async runAll(config) {
        console.log(`CollectorManager running ${this.collectors.length} collectors`);
        const results = await Promise.allSettled(this.collectors.map(async (collector) => {
            const start = Date.now();
            try {
                const result = await collector.collect(config);
                result.duration = Date.now() - start;
                return result;
            }
            catch (err) {
                return {
                    collector: collector.id,
                    data: null,
                    collectedAt: new Date().toISOString(),
                    duration: Date.now() - start,
                    status: "error",
                    error: err.message || "Unknown error",
                };
            }
        }));
        const fulfilled = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                fulfilled.push(result.value);
            }
            else {
                fulfilled.push({
                    collector: "unknown",
                    data: null,
                    collectedAt: new Date().toISOString(),
                    duration: 0,
                    status: "error",
                    error: result.reason?.message || "Unknown error",
                });
            }
        }
        console.log(`CollectorManager returning ${fulfilled.length} results`);
        return fulfilled;
    }
}
exports.CollectorManager = CollectorManager;
exports.collectorCount = collectors.length;
exports.collectorNames = collectors.map((c) => c.name);
