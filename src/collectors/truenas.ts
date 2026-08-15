// src/collectors/truenas.ts
import axios from "axios";

export interface TrueNASPool {
  name: string;
  status: string;
  used: string;
  free: string;
  health: string;
}

// Helper to format bytes to human-readable (TB or GB)
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = (bytes / Math.pow(k, i)).toFixed(1);
  return `${size} ${units[i]}`;
}

export async function getTrueNASMetrics(
  config: any,
): Promise<{ pools: TrueNASPool[] } | { error: string }> {
  try {
    const url = `${config.TRUENAS_HOST}/api/v2.0/pool`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.TRUENAS_API_KEY}`,
      },
      timeout: 10000,
    });

    const pools = response.data.map((pool: any) => ({
      name: pool.name,
      status: pool.status || "UNKNOWN",
      used: formatBytes(pool.allocated || 0),
      free: formatBytes(pool.free || 0),
      health: pool.healthy ? "HEALTHY" : pool.status_code || "UNKNOWN",
    }));

    return { pools };
  } catch (error: any) {
    return { error: `Failed to fetch TrueNAS data: ${error.message}` };
  }
}
