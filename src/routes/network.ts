// src/routes/network.ts
import { FastifyInstance } from "fastify";
import { state } from "../state";
import { redactObject, redactIP } from "../utils/redact";

export default async function networkRoutes(fastify: FastifyInstance) {
  // ─── Existing full endpoint ───
  fastify.get("/network", async () => {
    const stateData = state.getState();
    if (!stateData) return { error: "No data yet" };

    // ✅ Apply redaction if enabled
    const shouldRedact = fastify.config?.REDACT_IPS === true;
    if (shouldRedact) {
      return redactObject(stateData.network, redactIP);
    }
    return stateData.network;
  });

  // ─── Summary endpoint for Homepage ───
  fastify.get("/network/summary", async () => {
    const stateData = state.getState();
    const network = stateData.network || {};
    const shouldRedact = fastify.config?.REDACT_IPS === true;

    // ✅ Apply redaction to external IP
    let externalIP = network.externalIP || "N/A";
    if (shouldRedact && externalIP !== "N/A") {
      externalIP = "xxx.xxx.xxx.xxx";
    }

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
    const dnsOperational =
      dnsKeys.length > 0 &&
      dnsKeys.every(
        (k) => !dnsResults[k].error && dnsResults[k]?.ips?.length > 0,
      );
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
