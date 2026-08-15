"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCollectors = runCollectors;
// src/scheduler.ts
const perf_hooks_1 = require("perf_hooks");
const state_1 = require("./state"); // Updated import
const services_1 = require("./collectors/services");
const truenas_1 = require("./collectors/truenas");
const proxmox_1 = require("./collectors/proxmox");
const network_1 = require("./collectors/network");
let pollCounter = 0;
const previousHealth = {};
async function runCollectors(config) {
    pollCounter++;
    const startTotal = perf_hooks_1.performance.now();
    const runWithTiming = async (name, fn) => {
        const start = perf_hooks_1.performance.now();
        try {
            const result = await fn(config);
            const duration = perf_hooks_1.performance.now() - start;
            return { name, result, duration, error: null };
        }
        catch (err) {
            const duration = perf_hooks_1.performance.now() - start;
            return { name, result: null, duration, error: err };
        }
    };
    const results = await Promise.all([
        runWithTiming("services", services_1.getAllServices),
        runWithTiming("truenas", truenas_1.getTrueNASMetrics),
        runWithTiming("proxmox", proxmox_1.getProxmoxMetrics),
        runWithTiming("network", network_1.getNetworkMetrics),
    ]);
    const healthRecord = {};
    const timings = {};
    const stepDetails = {};
    for (const item of results) {
        timings[item.name] = item.duration;
        if (item.error) {
            console.error(`${item.name} collector failed:`, item.error);
            healthRecord[item.name] = {
                name: item.name,
                status: "unhealthy",
                lastRun: new Date().toISOString(),
                duration: item.duration,
                errors: 1,
                lastError: item.error.message || "Unknown error",
            };
            continue;
        }
        const data = item.name === "services" ? item.result.data : item.result;
        if (item.name === "network" && data && data.steps) {
            stepDetails.network = data.steps;
        }
        const isError = data && typeof data === "object" && "error" in data;
        const currentStatus = isError ? "degraded" : "healthy";
        const prev = previousHealth[item.name];
        if (prev) {
            if (prev.status !== currentStatus) {
                const errorMsg = isError ? data.error : null;
                console.log("──────────────────────────────────────────");
                console.log("Collector state changed");
                console.log("");
                console.log(`  Collector : ${item.name}`);
                console.log(`  Previous  : ${prev.status.toUpperCase()}`);
                console.log(`  Current   : ${currentStatus.toUpperCase()}`);
                if (errorMsg) {
                    console.log(`  Reason    : ${errorMsg}`);
                }
                console.log("──────────────────────────────────────────");
                console.log("");
            }
        }
        previousHealth[item.name] = {
            status: currentStatus,
            error: isError ? data.error : null,
        };
        healthRecord[item.name] = {
            name: item.name,
            status: currentStatus,
            lastRun: new Date().toISOString(),
            duration: item.duration,
            errors: isError ? 1 : 0,
            lastError: isError ? data.error : null,
        };
    }
    // Call the new unified update method
    state_1.state.updateAll(results.find((r) => r.name === "services")?.result?.data || [], results.find((r) => r.name === "truenas")?.result || null, results.find((r) => r.name === "proxmox")?.result || null, results.find((r) => r.name === "network")?.result || null, healthRecord);
    const totalDuration = (perf_hooks_1.performance.now() - startTotal).toFixed(0);
    // --- Rest of your logs remain exactly the same ---
    console.log("──────────────────────────────────────────");
    console.log(`Scheduler Poll #${pollCounter}`);
    console.log("──────────────────────────────────────────");
    console.log("");
    console.log("Collectors:");
    for (const [name, duration] of Object.entries(timings)) {
        if (name === "network")
            continue;
        const health = healthRecord[name];
        let icon = "✓";
        if (health?.status === "unhealthy")
            icon = "✗";
        else if (health?.status === "degraded")
            icon = "⚠";
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        const durationStr = duration.toFixed(0).padStart(5, " ") + "ms";
        console.log(`  ${icon} ${displayName.padEnd(14)} ${durationStr}`);
    }
    console.log("");
    console.log(`    Network Checks:`);
    if (stepDetails.network) {
        for (const [step, stepDuration] of Object.entries(stepDetails.network)) {
            const stepDurationStr = stepDuration.toFixed(0).padStart(4, " ") + "ms";
            console.log(`        ✓ ${step.padEnd(14)} ${stepDurationStr}`);
        }
    }
    const networkDuration = timings.network || 0;
    if (networkDuration > 0) {
        const durationStr = networkDuration.toFixed(0).padStart(10, " ") + "ms";
        console.log("──────────────────────────────────────────");
        console.log(`  ✓ ${"Network".padEnd(14)} ${durationStr}`);
        console.log("");
        console.log(`Poll compelted in ${totalDuration}ms`);
        console.log("──────────────────────────────────────────");
    }
    const healthy = Object.values(healthRecord).filter((h) => h.status === "healthy").length;
    const degraded = Object.values(healthRecord).filter((h) => h.status === "degraded").length;
    const unhealthy = Object.values(healthRecord).filter((h) => h.status === "unhealthy").length;
    const totalCollectors = healthy + degraded + unhealthy;
    console.log("Infrastructure Health");
    console.log(`  Healthy:    ${healthy}`);
    console.log(`  Degraded:   ${degraded}`);
    console.log(`  Unhealthy:  ${unhealthy}`);
    console.log(`  Total:      ${totalCollectors}`);
    console.log("");
    // Fix: Use 'state' instead of 'getState()'
    const stateData = state_1.state.getState();
    const services = stateData.services || [];
    const up = services.filter((s) => s.status === "UP").length;
    const servDegraded = services.filter((s) => s.status === "DEGRADED").length;
    const down = services.filter((s) => s.status === "DOWN").length;
    const totalServices = up + servDegraded + down;
    console.log("Service Health");
    console.log(`  Up:         ${up}`);
    console.log(`  Degraded:   ${servDegraded}`);
    console.log(`  Down:       ${down}`);
    console.log(`  Total:      ${totalServices}`);
}
