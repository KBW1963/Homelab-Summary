"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = collectorsRoutes;
const state_1 = require("../state");
async function collectorsRoutes(fastify) {
    fastify.get("/collectors", async () => {
        const stateData = state_1.state.getState();
        // FIX: Changed "state.collectorHealth" to "stateData.collectorHealth"
        const health = stateData.collectorHealth || {};
        // FIX: Added ": [string, CollectorHealth]" to tell TypeScript what the values are
        const entries = Object.entries(health).map(([key, value]) => {
            const isHealthy = String(value.status || "").toLowerCase() === "healthy";
            const formattedStatus = isHealthy ? "✓ healthy" : value.status;
            return {
                name: key.charAt(0).toUpperCase() + key.slice(1),
                status: formattedStatus,
            };
        });
        return { collectors: entries };
    });
}
