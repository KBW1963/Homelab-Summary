// src/routes/tailscale.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";

export default async function tailscaleRoutes(fastify: FastifyInstance) {
  fastify.get("/tailscale", async () => {
    const stateData = getState();
    console.log(
      "Route - full stateData.network:",
      JSON.stringify(stateData.network, null, 2),
    );

    if (!stateData) return { error: "No data yet" };

    const tailscale = stateData.network?.tailscale;
    console.log(
      "Route - tailscale from network:",
      tailscale ? "exists" : "undefined",
    );
    if (tailscale) {
      console.log("Route - tailscale nodes count:", tailscale.nodes?.length);
    }

    if (!tailscale || !tailscale.nodes) {
      return { nodes: [] };
    }

    const shouldRedact = fastify.config?.REDACT_IPS === true;
    console.log(`[Route] shouldRedact: ${shouldRedact}`);

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

    // Log the first returned node
    if (onlineNodes.length) {
      console.log(`[Route] first returned node IP: ${onlineNodes[0].status}`);
    }

    return { nodes: onlineNodes };
  });
}
