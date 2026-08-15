"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = proxmoxRoutes;
const state_1 = require("../state");
async function proxmoxRoutes(fastify) {
    fastify.get("/proxmox", async () => {
        const data = (0, state_1.getState)().proxmox;
        if (!data)
            return { error: "No data yet" };
        // Add a clean label to each node
        const nodes = data.nodes?.map((node) => ({
            ...node,
            label: `${node.status.toUpperCase()} | CPU: ${(node.cpu * 100).toFixed(0)}% | RAM: ${node.memoryUsed} / ${node.memoryTotal} | VMs: ${node.vms} | CTs: ${node.containers}`,
        }));
        return { nodes };
    });
}
