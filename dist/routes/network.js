"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = networkRoutes;
const state_1 = require("../state");
async function networkRoutes(fastify) {
    // ─── Existing full endpoint ───
    fastify.get("/network", async () => {
        const stateData = state_1.state.getState();
        // FIX: Changed "data" to "stateData"
        if (!stateData)
            return { error: "No data yet" };
        return stateData.network;
    });
    // ─── Summary endpoint for Homepage ───
    fastify.get("/network/summary", async () => {
        const stateData = state_1.state.getState();
        // FIX: Changed "state.network" to "stateData.network"
        const network = stateData.network || {};
        const externalIP = network.externalIP || "N/A";
        const tailscale = network.tailscale || {};
        const tailscaleOnline = tailscale.online ?? 0;
        const tailscaleTotal = tailscale.total ?? 0;
        const tailscaleStatus = tailscale.connected
            ? `Connected (${tailscaleOnline}/${tailscaleTotal} nodes)`
            : "Disconnected";
        const pings = network.pings || {};
        const internetPing = pings.internet || { reachable: false, latency: null };
        const internetDisplay = internetPing.reachable
            ? `Online (${internetPing.latency !== null ? Math.round(internetPing.latency) + "ms" : ""})`
            : "Offline";
        const dnsResults = network.dns || {};
        const dnsKeys = Object.keys(dnsResults);
        const dnsOperational = dnsKeys.length > 0 &&
            dnsKeys.every((k) => !dnsResults[k].error && dnsResults[k]?.ips?.length > 0);
        const dnsStatus = dnsOperational
            ? "Operational"
            : dnsKeys.length > 0
                ? "Degraded"
                : "N/A";
        return {
            externalIP,
            tailscaleStatus,
            internetDisplay,
            dnsStatus,
        };
    });
}
