// src/collectors/tailscale.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TailscaleNode {
  name: string;
  ip: string;
  online: boolean;
  lastSeen: string | null;
}

export interface TailscaleData {
  connected: boolean;
  total: number;
  online: number;
  nodes: TailscaleNode[];
}

export async function getTailscaleMetrics(
  config: any,
): Promise<TailscaleData | { error: string }> {
  try {
    const { stdout, stderr } = await execAsync("tailscale status --json", {
      timeout: 5000,
    });

    if (stderr) {
      console.warn(`Tailscale stderr: ${stderr}`);
    }

    const data = JSON.parse(stdout);

    const peers = data.Peer || {};
    const nodes = Object.values(peers).map((peer: any) => ({
      name: peer.HostName || peer.DNSName || "unknown",
      ip: peer.TailscaleIPs?.[0] || "N/A",
      online: peer.Online || false,
      lastSeen: peer.LastSeen || null,
    }));

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
      connected: true,
      total: allNodes.length,
      online: allNodes.filter((node) => node.online).length,
      nodes: allNodes,
    };
  } catch (error: any) {
    console.error(`Failed to fetch Tailscale data: ${error.message}`);
    return {
      error: `Failed to fetch Tailscale data: ${error.message}`,
    };
  }
}
