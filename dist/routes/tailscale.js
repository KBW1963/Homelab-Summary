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
        // Filter to ONLY online nodes to keep the widget compact
        const onlineNodes = tailscale.nodes
            .filter((node) => node.online)
            .map((node) => ({
            name: node.name,
            status: `🟢 Online (${node.ip})`,
        }));
        return { nodes: onlineNodes };
    });
}
