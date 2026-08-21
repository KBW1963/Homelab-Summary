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

    // ✅ Use the config, not process.env
    const shouldRedact = fastify.config?.REDACT_IPS === true;

    const onlineNodes = tailscale.nodes
      .filter((node: any) => node.online)
      .map((node: any) => {
        let ipDisplay = node.ip;
        if (shouldRedact && ipDisplay) {
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
