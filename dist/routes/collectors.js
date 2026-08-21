"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = collectorsRoutes;
const state_1 = require("../state");
async function collectorsRoutes(fastify) {
    fastify.get("/collectors", async () => {
        const stateData = (0, state_1.getState)();
        const health = stateData.collectorHealth || {};
        const entries = Object.entries(health).map(([key, value]) => {
            const status = String(value.status || "").toLowerCase();
            // Map status to emoji indicator
            let indicator = "⚪"; // default/unknown
            if (status === "healthy" || status === "up") {
                indicator = "🟢";
            }
            else if (status === "degraded") {
                indicator = "🟡";
            }
            else if (status === "unhealthy" || status === "down") {
                indicator = "🔴";
            }
            return {
                name: key.charAt(0).toUpperCase() + key.slice(1),
                status: `${indicator} ${value.status}`, // e.g., "🟢 healthy"
            };
        });
        return { collectors: entries };
    });
}
