"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tailscaleRoutes;
const state_1 = require("../state");
async function tailscaleRoutes(fastify) {
    fastify.get("/tailscale", async () => {
        const data = (0, state_1.getState)().network;
        if (!data)
            return { error: "No data yet" };
        const tailscale = data.tailscale;
        if (!tailscale || !tailscale.nodes) {
            return { nodes: [] };
        }
        // Redact IPs if REDACT_IPS=true
        const shouldRedact = process.env.REDACT_IPS === "true";
        const onlineNodes = tailscale.nodes
            .filter((node) => node.online)
            .map((node) => {
            let ipDisplay = node.ip;
            if (shouldRedact && ipDisplay) {
                // Replace with a placeholder
                ipDisplay = "xxx.xxx.xxx.xxx";
            }
            return {
                name: node.name,
                status: `Online (${ipDisplay})`,
            };
        });
        return { nodes: onlineNodes };
    });
}
