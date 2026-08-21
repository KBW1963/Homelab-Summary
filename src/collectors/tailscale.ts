// src/collectors/tailscale.ts
import { exec } from "child_process";
import { promisify } from "util";
import { CollectorResult } from "./types";

const execAsync = promisify(exec);

export const serviceId = "tailscale";
export const serviceName = "Tailscale";

export async function fetchTailscaleStatus(): Promise<CollectorResult<any>> {
  const start = Date.now();

  try {
    // Use the tailscale command to get status as JSON
    const { stdout, stderr } = await execAsync("tailscale status --json", {
      timeout: 5000,
    });

    if (stderr) {
      console.warn(`Tailscale stderr: ${stderr}`);
    }

    const data = JSON.parse(stdout);

    // Process the nodes into a simpler format
    const nodes = Object.values(data.Peer || {}).map((peer: any) => ({
      name: peer.HostName || peer.DNSName || "unknown",
      ip: peer.TailscaleIPs?.[0] || "N/A",
      online: peer.Online || false,
      lastSeen: peer.LastSeen || null,
    }));

    // Also include the current node
    const self = data.Self || {};
    const allNodes = [
      {
        name: self.HostName || "this-device",
        ip: self.TailscaleIPs?.[0] || "N/A",
        online: true,
        lastSeen: null,
      },
      ...nodes,
    ];

    return {
      collector: serviceId,
      data: {
        connected: true,
        total: allNodes.length,
        online: allNodes.filter((n: any) => n.online).length,
        nodes: allNodes,
      },
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (error: any) {
    console.error(`Failed to fetch Tailscale data: ${error.message}`);
    return {
      collector: serviceId,
      data: {
        connected: false,
        total: 0,
        online: 0,
        nodes: [],
      },
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: error.message,
    };
  }
}
