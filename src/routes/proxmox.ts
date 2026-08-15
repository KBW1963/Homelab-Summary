// src/routes/proxmox.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";

export default async function proxmoxRoutes(fastify: FastifyInstance) {
  fastify.get("/proxmox", async () => {
    const data = getState().proxmox;
    if (!data) return { error: "No data yet" };

    // Add a clean label to each node
    const nodes = data.nodes?.map((node: any) => ({
      ...node,
      label: `${node.status.toUpperCase()} | CPU: ${(node.cpu * 100).toFixed(0)}% | RAM: ${node.memoryUsed} / ${node.memoryTotal} | VMs: ${node.vms} | CTs: ${node.containers}`,
    }));

    return { nodes };
  });
}
