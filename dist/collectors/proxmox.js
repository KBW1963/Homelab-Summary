"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxmoxMetrics = getProxmoxMetrics;
// src/collectors/proxmox.ts
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
async function getProxmoxMetrics(config) {
    try {
        const agent = new https_1.default.Agent({ rejectUnauthorized: false });
        const authHeader = { Authorization: config.PROXMOX_API_TOKEN };
        // 1) Get list of nodes (includes status)
        const listUrl = `${config.PROXMOX_HOST}/api2/json/nodes`;
        const listRes = await axios_1.default.get(listUrl, {
            headers: authHeader,
            timeout: 10000,
            httpsAgent: agent,
        });
        const nodesList = listRes.data.data || [];
        // Build a map of node name -> status
        const nodeStatusMap = {};
        nodesList.forEach((n) => {
            nodeStatusMap[n.node] = n.status; // 'online' or 'offline'
        });
        // 2) For each node, fetch detailed status (CPU, memory), VMs, and containers
        const nodes = await Promise.all(nodesList.map(async (nodeEntry) => {
            const name = nodeEntry.node;
            try {
                // Node status (CPU, memory)
                const statusUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/status`;
                const statusRes = await axios_1.default.get(statusUrl, {
                    headers: authHeader,
                    timeout: 10000,
                    httpsAgent: agent,
                });
                const statusData = statusRes.data.data || {};
                // Count running VMs
                const vmUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/qemu`;
                const vmRes = await axios_1.default.get(vmUrl, {
                    headers: authHeader,
                    timeout: 10000,
                    httpsAgent: agent,
                });
                const vms = vmRes.data.data?.filter((vm) => vm.status === "running")
                    .length || 0;
                // Count running containers
                const ctUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/lxc`;
                const ctRes = await axios_1.default.get(ctUrl, {
                    headers: authHeader,
                    timeout: 10000,
                    httpsAgent: agent,
                });
                const containers = ctRes.data.data?.filter((ct) => ct.status === "running")
                    .length || 0;
                // Memory fields
                const mem = statusData.memory || {};
                const memTotal = mem.total || 0;
                const memUsed = mem.used || 0;
                const formatGB = (bytes) => bytes ? `${Math.round(bytes / 1024 / 1024 / 1024)} GB` : "N/A";
                return {
                    name,
                    // Use the status from the node list (correct)
                    status: nodeStatusMap[name] === "online" ? "online" : "offline",
                    cpu: parseFloat((statusData.cpu || 0).toFixed(2)),
                    memoryUsed: formatGB(memUsed),
                    memoryTotal: formatGB(memTotal),
                    vms,
                    containers,
                };
            }
            catch (nodeError) {
                console.warn(`Failed to fetch details for node ${name}: ${nodeError.message}`);
                return {
                    name,
                    status: nodeStatusMap[name] === "online" ? "online" : "offline",
                    cpu: 0,
                    memoryUsed: "N/A",
                    memoryTotal: "N/A",
                    vms: 0,
                    containers: 0,
                };
            }
        }));
        return { nodes };
    }
    catch (error) {
        return { error: `Failed to fetch Proxmox data: ${error.message}` };
    }
}
