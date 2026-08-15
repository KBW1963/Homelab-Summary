"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getState = exports.state = void 0;
// src/state.ts
const normalizer_1 = require("./normalizer");
class HomelabState {
    constructor() {
        this.data = {
            services: [],
            truenas: null,
            proxmox: null,
            network: null,
            collectorHealth: {},
            infrastructureStatus: "UNKNOWN",
            servicesStatus: "UNKNOWN",
            overallStatus: "UNKNOWN",
            updateCount: 0,
            summaryText: "Waiting for first poll...",
        };
    }
    updateAll(services, truenas, proxmox, network, collectorHealth) {
        this.data.services = services;
        this.data.truenas = truenas;
        this.data.proxmox = proxmox;
        this.data.network = network;
        this.data.collectorHealth = collectorHealth;
        const infraFindings = [];
        if (!truenas)
            infraFindings.push({
                category: "connectivity",
                severity: "critical",
                message: "TrueNAS unreachable",
            });
        else if (truenas.error)
            infraFindings.push({
                category: "health",
                severity: "warning",
                message: `TrueNAS: ${truenas.error}`,
            });
        if (!proxmox)
            infraFindings.push({
                category: "connectivity",
                severity: "critical",
                message: "Proxmox unreachable",
            });
        else if (proxmox.error)
            infraFindings.push({
                category: "health",
                severity: "warning",
                message: `Proxmox: ${proxmox.error}`,
            });
        if (!network)
            infraFindings.push({
                category: "connectivity",
                severity: "critical",
                message: "Network unreachable",
            });
        else if (network.error)
            infraFindings.push({
                category: "health",
                severity: "warning",
                message: `Network: ${network.error}`,
            });
        // FIX: Map "UP" to "HEALTHY"
        const rawInfraStatus = (0, normalizer_1.deriveStatusFromFindings)(infraFindings);
        this.data.infrastructureStatus =
            rawInfraStatus === "UP"
                ? "HEALTHY"
                : rawInfraStatus === "UNKNOWN"
                    ? "UNKNOWN"
                    : rawInfraStatus;
        const serviceFindings = [];
        let updates = 0;
        for (const svc of services) {
            if (svc.status === "DOWN" || svc.status === "DEGRADED") {
                if (svc.findings)
                    serviceFindings.push(...svc.findings);
            }
            if (svc.details?.version &&
                svc.details?.latestVersion &&
                svc.details.version !== svc.details.latestVersion) {
                updates++;
            }
        }
        this.data.updateCount = updates;
        // FIX: Map "UP" to "HEALTHY"
        const rawSvcStatus = (0, normalizer_1.deriveStatusFromFindings)(serviceFindings);
        this.data.servicesStatus =
            rawSvcStatus === "UP"
                ? "HEALTHY"
                : rawSvcStatus === "UNKNOWN"
                    ? "UNKNOWN"
                    : rawSvcStatus;
        const upCount = services.filter((s) => s.status === "UP").length;
        const totalCount = services.length;
        if (this.data.infrastructureStatus === "DOWN") {
            this.data.overallStatus = "DOWN";
            this.data.summaryText =
                "Infrastructure Down | Check Proxmox/TrueNAS/Network";
        }
        else if (this.data.infrastructureStatus === "DEGRADED") {
            this.data.overallStatus = "DEGRADED";
            this.data.summaryText = "Infrastructure requires attention";
        }
        else if (this.data.servicesStatus === "DOWN") {
            this.data.overallStatus = "DEGRADED";
            this.data.summaryText = `${upCount}/${totalCount} services healthy (Critical failures)`;
        }
        else if (this.data.servicesStatus === "DEGRADED") {
            this.data.overallStatus = "WARNING";
            this.data.summaryText = `${upCount}/${totalCount} services healthy`;
        }
        else {
            this.data.overallStatus = "HEALTHY";
            const updateText = updates > 0
                ? ` | ${updates} update${updates > 1 ? "s" : ""} available`
                : "";
            this.data.summaryText = `${upCount}/${totalCount} services healthy${updateText}`;
        }
    }
    getState() {
        return this.data;
    }
}
exports.state = new HomelabState();
const getState = () => exports.state.getState();
exports.getState = getState;
