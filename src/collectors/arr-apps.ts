// src/collectors/arr-apps.ts
import { getSonarrStatus } from "./sonarr";
import { getRadarrStatus } from "./radarr";
import { getProwlarrStatus } from "./prowlarr";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

const arrAppIds = ["sonarr", "radarr", "prowlarr"];

export async function getArrApps(
  config: any,
): Promise<CollectorResult<ServiceStatus[]>> {
  const start = Date.now();
  try {
    const results = await Promise.allSettled([
      getSonarrStatus(config),
      getRadarrStatus(config),
      getProwlarrStatus(config),
    ]);

    const services: ServiceStatus[] = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value.data;
      } else {
        const id = arrAppIds[index];
        const name = id.charAt(0).toUpperCase() + id.slice(1);
        return {
          id,
          name,
          status: "DOWN",
          lastUpdate: new Date().toISOString(),
          findings: [],
          issue: null,
          error: result.reason.message,
        };
      }
    });

    return {
      collector: "arr-apps",
      data: services,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (err: any) {
    return {
      collector: "arr-apps",
      data: [],
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: err.message,
    };
  }
}
