// src/collectors/network.ts
import axios from "axios";
import ping from "ping";
import si from "systeminformation";
import { exec } from "child_process";
import { promisify } from "util";
import { performance } from "perf_hooks";
import { redactIP, redactMac } from "../utils/redact";

const execAsync = promisify(exec);

export interface NetworkMetrics {
  externalIP: string | null;
  tailscale: {
    connected: boolean;
    total: number;
    online: number;
    nodes: { name: string; ip: string; online: boolean }[];
  };
  pings: Record<
    string,
    { host: string; reachable: boolean; latency: number | null }
  >;
  dns: Record<string, { domain: string; ips: string[]; error?: string }>;
  interfaces: {
    name: string;
    ip4: string[];
    ip6: string[];
    mac: string;
    speed: number | null;
    rx_bytes: number;
    tx_bytes: number;
    up: boolean;
  }[];
  steps: Record<string, number>;
}

// Cross‑platform DNS resolution using nslookup
async function resolveWithNslookup(
  domain: string,
  server?: string,
): Promise<string[]> {
  try {
    const cmd = server ? `nslookup ${domain} ${server}` : `nslookup ${domain}`;
    const { stdout } = await execAsync(cmd, { timeout: 5000 });

    const ipv4Regex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
    const matches = stdout.match(ipv4Regex);
    if (!matches) return [];

    if (server) {
      return matches.filter((ip) => ip !== server);
    }
    return matches;
  } catch (err: any) {
    throw new Error(`nslookup failed: ${err.message}`);
  }
}

export async function getNetworkMetrics(
  config: any,
): Promise<NetworkMetrics | { error: string }> {
  const steps: Record<string, number> = {};
  let externalIP: string | null = null;
  const tailscale = {
    connected: false,
    total: 0,
    online: 0,
    nodes: [] as { name: string; ip: string; online: boolean }[],
  };
  const pings: Record<
    string,
    { host: string; reachable: boolean; latency: number | null }
  > = {};
  const dnsResults: Record<
    string,
    { domain: string; ips: string[]; error?: string }
  > = {};
  let interfaces: any[] = [];

  try {
    // 1. External IP
    let stepStart = performance.now();
    try {
      const ipRes = await axios.get("https://api.ipify.org?format=json", {
        timeout: 5000,
      });
      externalIP = ipRes.data.ip;
    } catch {
      externalIP = null;
    }
    steps["External IP"] = performance.now() - stepStart;

    // 2. Tailscale (Supports official API for native apps or local CLI fallback)
    stepStart = performance.now();
    try {
      const apiKey = config.TAILSCALE_API_KEY || process.env.TAILSCALE_API_KEY;
      const tailnet = config.TAILSCALE_TAILNET || process.env.TAILSCALE_TAILNET;

      if (apiKey && tailnet) {
        // Use Tailscale REST API (ideal for TrueNAS native app environments)
        const apiRes = await axios.get(
          `https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 5000,
          },
        );
        const devices = apiRes.data.devices || [];
        tailscale.connected = true;
        let onlineCount = 0;
        for (const device of devices) {
          // Active online devices report a null/missing lastSeen value,
          // or we fall back to checking if the last seen time was recent.
          const isOnline =
            !device.lastSeen ||
            new Date(device.lastSeen).getTime() > Date.now() - 5 * 60 * 1000;
          if (isOnline) onlineCount++;
          const primaryIP = device.addresses?.[0] || "N/A";
          tailscale.nodes.push({
            name: device.hostname || device.name,
            ip: primaryIP,
            online: isOnline,
          });
        }
        tailscale.total = devices.length;
        tailscale.online = onlineCount;
      } else {
        // Fallback to local CLI binary
        const { stdout } = await execAsync(
          `${config.TAILSCALE_PATH || process.env.TAILSCALE_PATH || "tailscale"} status --json`,
          { timeout: 5000 },
        );
        const data = JSON.parse(stdout);
        if (data.Self) {
          tailscale.connected = true;
          let onlineCount = 0;
          for (const [nodeKey, info] of Object.entries(data.Peer || {})) {
            const peer = info as any;
            const isOnline = peer.Online || false;
            if (isOnline) onlineCount++;
            const ips = peer.TailscaleIPs || [];
            const primaryIP = ips.length > 0 ? ips[0] : nodeKey;
            tailscale.nodes.push({
              name: peer.HostName || nodeKey,
              ip: primaryIP,
              online: isOnline,
            });
          }
          tailscale.total = Object.keys(data.Peer || {}).length;
          tailscale.online = onlineCount;
        }
      }
    } catch (err: any) {
      console.error("Tailscale check failed:", err.message);
      tailscale.connected = false;
    }
    steps["Tailscale"] = performance.now() - stepStart;

    // 3. Pings
    stepStart = performance.now();
    const pingTargets = (config.NETWORK_PING_TARGETS || "")
      .split(",")
      .filter((t: string) => t.includes("|"))
      .map((t: string) => {
        const [name, host] = t.split("|");
        return { name: name.trim(), host: host.trim() };
      });

    for (const { name, host } of pingTargets) {
      try {
        const res = await ping.promise.probe(host, { timeout: 3 });
        pings[name] = {
          host,
          reachable: res.alive,
          latency: res.alive ? res.time : null,
        };
      } catch {
        pings[name] = { host, reachable: false, latency: null };
      }
    }
    steps["Pings"] = performance.now() - stepStart;

    // 4. DNS Resolution
    stepStart = performance.now();
    const dnsTargets = (config.NETWORK_DNS_TARGETS || "")
      .split(",")
      .map((d: string) => d.trim())
      .filter((d: string) => d.length > 0);

    const customServers = config.NETWORK_DNS_SERVER
      ? config.NETWORK_DNS_SERVER.split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];

    for (const domain of dnsTargets) {
      try {
        let ips: string[] = [];
        let lastError: Error | null = null;

        if (customServers.length > 0) {
          for (const server of customServers) {
            try {
              ips = await resolveWithNslookup(domain, server);
              if (ips.length > 0) break;
            } catch (err: any) {
              lastError = err;
              continue;
            }
          }
        } else {
          ips = await resolveWithNslookup(domain);
        }

        if (ips.length > 0) {
          dnsResults[domain] = { domain, ips };
        } else {
          dnsResults[domain] = {
            domain,
            ips: [],
            error: lastError?.message || "No IPs resolved",
          };
        }
      } catch (err: any) {
        dnsResults[domain] = {
          domain,
          ips: [],
          error: err.message || "Resolution failed",
        };
      }
    }
    steps["DNS"] = performance.now() - stepStart;

    // 5. Network interfaces
    stepStart = performance.now();
    const netIfaces = await si.networkInterfaces();
    const netStats = await si.networkStats();

    const statsMap: Record<string, { rx_bytes: number; tx_bytes: number }> = {};
    netStats.forEach((stat: any) => {
      statsMap[stat.iface] = {
        rx_bytes: stat.rx_bytes || 0,
        tx_bytes: stat.tx_bytes || 0,
      };
    });

    interfaces = netIfaces.map((iface: any) => {
      const stats = statsMap[iface.iface] || { rx_bytes: 0, tx_bytes: 0 };
      const ip4 = Array.isArray(iface.ip4)
        ? iface.ip4
        : iface.ip4
          ? [iface.ip4]
          : [];
      const ip6 = Array.isArray(iface.ip6)
        ? iface.ip6
        : iface.ip6
          ? [iface.ip6]
          : [];
      return {
        name: iface.iface,
        ip4,
        ip6,
        mac: iface.mac || "",
        speed: iface.speed || null,
        rx_bytes: stats.rx_bytes,
        tx_bytes: stats.tx_bytes,
        up: iface.operstate === "up",
      };
    });
    steps["Interfaces"] = performance.now() - stepStart;

    // 6. Build final result
    let result: NetworkMetrics = {
      externalIP,
      tailscale,
      pings,
      dns: dnsResults,
      interfaces,
      steps,
    };

    // 7. Apply redaction if enabled
    if (config.REDACT_IPS) {
      result = {
        externalIP: externalIP ? redactIP(externalIP) : null,
        tailscale: {
          ...tailscale,
          nodes: tailscale.nodes.map((node) => ({
            ...node,
            ip: redactIP(node.ip),
          })),
        },
        pings: Object.fromEntries(
          Object.entries(pings).map(([key, pingInfo]) => [
            key,
            {
              ...pingInfo,
              host: redactIP(pingInfo.host),
            },
          ]),
        ),
        dns: Object.fromEntries(
          Object.entries(dnsResults).map(([domain, dnsInfo]) => [
            domain,
            {
              ...dnsInfo,
              ips: dnsInfo.ips.map(redactIP),
            },
          ]),
        ),
        interfaces: interfaces.map((iface) => ({
          ...iface,
          ip4: iface.ip4.map(redactIP),
          ip6: iface.ip6.map(redactIP),
          mac: redactMac(iface.mac),
        })),
        steps,
      };
    }

    return result;
  } catch (error: any) {
    return { error: `Failed to fetch network metrics: ${error.message}` };
  }
}
