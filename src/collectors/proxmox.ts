// src/collectors/proxmox.ts
import axios from "axios";
import https from "https";

export interface ProxmoxNode {
  name: string;
  status: "online" | "offline";
  cpu: number;
  memoryUsed: string;
  memoryTotal: string;
  vms: number;
  containers: number;
}

export async function getProxmoxMetrics(
  config: any,
): Promise<{ nodes: ProxmoxNode[] } | { error: string }> {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = { Authorization: config.PROXMOX_API_TOKEN };

    // 1) Get list of nodes (includes status)
    const listUrl = `${config.PROXMOX_HOST}/api2/json/nodes`;
    const listRes = await axios.get(listUrl, {
      headers: authHeader,
      timeout: 10000,
      httpsAgent: agent,
    });
    const nodesList = listRes.data.data || [];

    // Build a map of node name -> status
    const nodeStatusMap: Record<string, string> = {};
    nodesList.forEach((n: any) => {
      nodeStatusMap[n.node] = n.status; // 'online' or 'offline'
    });

    // 2) For each node, fetch detailed status (CPU, memory), VMs, and containers
    const nodes = await Promise.all(
      nodesList.map(async (nodeEntry: any) => {
        const name = nodeEntry.node;
        try {
          // Node status (CPU, memory)
          const statusUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/status`;
          const statusRes = await axios.get(statusUrl, {
            headers: authHeader,
            timeout: 10000,
            httpsAgent: agent,
          });
          const statusData = statusRes.data.data || {};

          // Count running VMs
          const vmUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/qemu`;
          const vmRes = await axios.get(vmUrl, {
            headers: authHeader,
            timeout: 10000,
            httpsAgent: agent,
          });
          const vms =
            vmRes.data.data?.filter((vm: any) => vm.status === "running")
              .length || 0;

          // Count running containers
          const ctUrl = `${config.PROXMOX_HOST}/api2/json/nodes/${name}/lxc`;
          const ctRes = await axios.get(ctUrl, {
            headers: authHeader,
            timeout: 10000,
            httpsAgent: agent,
          });
          const containers =
            ctRes.data.data?.filter((ct: any) => ct.status === "running")
              .length || 0;

          // Memory fields
          const mem = statusData.memory || {};
          const memTotal = mem.total || 0;
          const memUsed = mem.used || 0;

          const formatGB = (bytes: number) =>
            bytes ? `${Math.round(bytes / 1024 / 1024 / 1024)} GB` : "N/A";

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
        } catch (nodeError: any) {
          console.warn(
            `Failed to fetch details for node ${name}: ${nodeError.message}`,
          );
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
      }),
    );

    return { nodes };
  } catch (error: any) {
    return { error: `Failed to fetch Proxmox data: ${error.message}` };
  }
}
