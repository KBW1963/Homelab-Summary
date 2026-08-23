// src/collector-manager.ts
import { Collector, CollectorResult } from "./collectors/types";
import { getAllServices } from "./collectors/services"; // <-- This now handles ALL apps
import { getTrueNASMetrics } from "./collectors/truenas";
import { getProxmoxMetrics } from "./collectors/proxmox";
import { getNetworkMetrics } from "./collectors/network";
import { getTailscaleMetrics } from "./collectors/tailscale";

const collectors: Collector[] = [
  {
    id: "services",
    name: "All Services",
    collect: async (config) => {
      const result = await getAllServices(config);
      return result;
    },
  },

  {
    id: "tailscale",
    name: "Tailscale",
    collect: async (config) => {
      const raw = await getTailscaleMetrics(config);
      const isError = raw && (raw as any).error;
      return {
        collector: "tailscale",
        data: raw,
        collectedAt: new Date().toISOString(),
        duration: 0,
        status: isError ? "error" : "success",
        error: isError ? (raw as any).error : undefined,
      };
    },
  },

  {
    id: "truenas",
    name: "TrueNAS",
    collect: async (config) => {
      const raw = await getTrueNASMetrics(config);
      const isError = raw && (raw as any).error;
      return {
        collector: "truenas",
        data: raw,
        collectedAt: new Date().toISOString(),
        duration: 0,
        status: isError ? "error" : "success",
        error: isError ? (raw as any).error : undefined,
      };
    },
  },

  {
    id: "proxmox",
    name: "Proxmox",
    collect: async (config) => {
      const raw = await getProxmoxMetrics(config);
      const isError = raw && (raw as any).error;
      return {
        collector: "proxmox",
        data: raw,
        collectedAt: new Date().toISOString(),
        duration: 0,
        status: isError ? "error" : "success",
        error: isError ? (raw as any).error : undefined,
      };
    },
  },
  {
    id: "network",
    name: "Network",
    collect: async (config) => {
      const raw = await getNetworkMetrics(config);
      const isError = raw && (raw as any).error;
      return {
        collector: "network",
        data: raw,
        collectedAt: new Date().toISOString(),
        duration: 0,
        status: isError ? "error" : "success",
        error: isError ? (raw as any).error : undefined,
      };
    },
  },
];

export class CollectorManager {
  private collectors: Collector[] = [];

  constructor() {
    this.collectors = collectors;
  }

  async runAll(config: any): Promise<CollectorResult<any>[]> {
    console.log(
      `CollectorManager running ${this.collectors.length} collectors`,
    );

    const results = await Promise.allSettled(
      this.collectors.map(async (collector) => {
        const start = Date.now();
        try {
          const result = await collector.collect(config);
          result.duration = Date.now() - start;
          return result;
        } catch (err: any) {
          return {
            collector: collector.id,
            data: null,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "error" as const,
            error: err.message || "Unknown error",
          };
        }
      }),
    );

    const fulfilled: CollectorResult<any>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        fulfilled.push(result.value);
      } else {
        fulfilled.push({
          collector: "unknown",
          data: null,
          collectedAt: new Date().toISOString(),
          duration: 0,
          status: "error",
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    console.log(`CollectorManager returning ${fulfilled.length} results`);
    return fulfilled;
  }
}

export const collectorCount = collectors.length;
export const collectorNames = collectors.map((c) => c.name);
