"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkMetrics = getNetworkMetrics;
// src/collectors/network.ts
const axios_1 = __importDefault(require("axios"));
const ping_1 = __importDefault(require("ping"));
const systeminformation_1 = __importDefault(require("systeminformation"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const perf_hooks_1 = require("perf_hooks");
const redact_1 = require("../utils/redact");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Cross‑platform DNS resolution using nslookup
async function resolveWithNslookup(domain, server) {
    try {
        const cmd = server ? `nslookup ${domain} ${server}` : `nslookup ${domain}`;
        const { stdout } = await execAsync(cmd, { timeout: 5000 });
        const ipv4Regex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
        const matches = stdout.match(ipv4Regex);
        if (!matches)
            return [];
        if (server) {
            return matches.filter((ip) => ip !== server);
        }
        return matches;
    }
    catch (err) {
        throw new Error(`nslookup failed: ${err.message}`);
    }
}
async function getNetworkMetrics(config) {
    const steps = {};
    let externalIP = null;
    const tailscale = {
        connected: false,
        total: 0,
        online: 0,
        nodes: [],
    };
    const pings = {};
    const dnsResults = {};
    let interfaces = [];
    try {
        // 1. External IP
        let stepStart = perf_hooks_1.performance.now();
        try {
            const ipRes = await axios_1.default.get("https://api.ipify.org?format=json", {
                timeout: 5000,
            });
            externalIP = ipRes.data.ip;
        }
        catch {
            externalIP = null;
        }
        steps["External IP"] = perf_hooks_1.performance.now() - stepStart;
        // 2. Tailscale (Supports official API for native apps or local CLI fallback)
        stepStart = perf_hooks_1.performance.now();
        try {
            const apiKey = config.TAILSCALE_API_KEY || process.env.TAILSCALE_API_KEY;
            const tailnet = config.TAILSCALE_TAILNET || process.env.TAILSCALE_TAILNET;
            if (apiKey && tailnet) {
                // Use Tailscale REST API (ideal for TrueNAS native app environments)
                const apiRes = await axios_1.default.get(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                    timeout: 5000,
                });
                const devices = apiRes.data.devices || [];
                tailscale.connected = true;
                let onlineCount = 0;
                for (const device of devices) {
                    // Active online devices report a null/missing lastSeen value,
                    // or we fall back to checking if the last seen time was recent.
                    const isOnline = !device.lastSeen ||
                        new Date(device.lastSeen).getTime() > Date.now() - 5 * 60 * 1000;
                    if (isOnline)
                        onlineCount++;
                    const primaryIP = device.addresses?.[0] || "N/A";
                    tailscale.nodes.push({
                        name: device.hostname || device.name,
                        ip: primaryIP,
                        online: isOnline,
                    });
                }
                tailscale.total = devices.length;
                tailscale.online = onlineCount;
            }
            else {
                // Fallback to local CLI binary
                const { stdout } = await execAsync(`${config.TAILSCALE_PATH || process.env.TAILSCALE_PATH || "tailscale"} status --json`, { timeout: 5000 });
                const data = JSON.parse(stdout);
                if (data.Self) {
                    tailscale.connected = true;
                    let onlineCount = 0;
                    for (const [nodeKey, info] of Object.entries(data.Peer || {})) {
                        const peer = info;
                        const isOnline = peer.Online || false;
                        if (isOnline)
                            onlineCount++;
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
        }
        catch (err) {
            console.error("Tailscale check failed:", err.message);
            tailscale.connected = false;
        }
        steps["Tailscale"] = perf_hooks_1.performance.now() - stepStart;
        // 3. Pings
        stepStart = perf_hooks_1.performance.now();
        const pingTargets = (config.NETWORK_PING_TARGETS || "")
            .split(",")
            .filter((t) => t.includes("|"))
            .map((t) => {
            const [name, host] = t.split("|");
            return { name: name.trim(), host: host.trim() };
        });
        for (const { name, host } of pingTargets) {
            try {
                const res = await ping_1.default.promise.probe(host, { timeout: 3 });
                pings[name] = {
                    host,
                    reachable: res.alive,
                    latency: res.alive ? res.time : null,
                };
            }
            catch {
                pings[name] = { host, reachable: false, latency: null };
            }
        }
        steps["Pings"] = perf_hooks_1.performance.now() - stepStart;
        // 4. DNS Resolution
        stepStart = perf_hooks_1.performance.now();
        const dnsTargets = (config.NETWORK_DNS_TARGETS || "")
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d.length > 0);
        const customServers = config.NETWORK_DNS_SERVER
            ? config.NETWORK_DNS_SERVER.split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];
        for (const domain of dnsTargets) {
            try {
                let ips = [];
                let lastError = null;
                if (customServers.length > 0) {
                    for (const server of customServers) {
                        try {
                            ips = await resolveWithNslookup(domain, server);
                            if (ips.length > 0)
                                break;
                        }
                        catch (err) {
                            lastError = err;
                            continue;
                        }
                    }
                }
                else {
                    ips = await resolveWithNslookup(domain);
                }
                if (ips.length > 0) {
                    dnsResults[domain] = { domain, ips };
                }
                else {
                    dnsResults[domain] = {
                        domain,
                        ips: [],
                        error: lastError?.message || "No IPs resolved",
                    };
                }
            }
            catch (err) {
                dnsResults[domain] = {
                    domain,
                    ips: [],
                    error: err.message || "Resolution failed",
                };
            }
        }
        steps["DNS"] = perf_hooks_1.performance.now() - stepStart;
        // 5. Network interfaces
        stepStart = perf_hooks_1.performance.now();
        const netIfaces = await systeminformation_1.default.networkInterfaces();
        const netStats = await systeminformation_1.default.networkStats();
        const statsMap = {};
        netStats.forEach((stat) => {
            statsMap[stat.iface] = {
                rx_bytes: stat.rx_bytes || 0,
                tx_bytes: stat.tx_bytes || 0,
            };
        });
        interfaces = netIfaces.map((iface) => {
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
        steps["Interfaces"] = perf_hooks_1.performance.now() - stepStart;
        // 6. Build final result
        let result = {
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
                externalIP: externalIP ? (0, redact_1.redactIP)(externalIP) : null,
                tailscale: {
                    ...tailscale,
                    nodes: tailscale.nodes.map((node) => ({
                        ...node,
                        ip: (0, redact_1.redactIP)(node.ip),
                    })),
                },
                pings: Object.fromEntries(Object.entries(pings).map(([key, pingInfo]) => [
                    key,
                    {
                        ...pingInfo,
                        host: (0, redact_1.redactIP)(pingInfo.host),
                    },
                ])),
                dns: Object.fromEntries(Object.entries(dnsResults).map(([domain, dnsInfo]) => [
                    domain,
                    {
                        ...dnsInfo,
                        ips: dnsInfo.ips.map(redact_1.redactIP),
                    },
                ])),
                interfaces: interfaces.map((iface) => ({
                    ...iface,
                    ip4: iface.ip4.map(redact_1.redactIP),
                    ip6: iface.ip6.map(redact_1.redactIP),
                    mac: (0, redact_1.redactMac)(iface.mac),
                })),
                steps,
            };
        }
        return result;
    }
    catch (error) {
        return { error: `Failed to fetch network metrics: ${error.message}` };
    }
}
