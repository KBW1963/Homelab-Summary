// src/routes/tailscale.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";

export default async function tailscaleRoutes(fastify: FastifyInstance) {
  fastify.get("/tailscale", async () => {
    const data = getState().network;
    if (!data) return { error: "No data yet" };

    const tailscale = data.tailscale;
    if (!tailscale || !tailscale.nodes) {
      return { nodes: [] };
    }

    // Filter to ONLY online nodes to keep the widget compact
    const onlineNodes = tailscale.nodes
      .filter((node: any) => node.online)
      .map((node: any) => ({
        name: node.name,
        status: `🟢 Online (${node.ip})`,
      }));

    return { nodes: onlineNodes };
  });
}
