// src/collectors/media-servers.ts
import { getPlexStatus } from "./plex";
import { getJellyfinStatus } from "./jellyfin";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

const mediaServerIds = ["plex", "jellyfin"];

export async function getMediaServers(
  config: any,
): Promise<CollectorResult<ServiceStatus[]>> {
  const start = Date.now();
  try {
    const results = await Promise.allSettled([
      getPlexStatus(config),
      getJellyfinStatus(config),
    ]);

    const services: ServiceStatus[] = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value.data;
      } else {
        const id = mediaServerIds[index];
        const name = id.charAt(0).toUpperCase() + id.slice(1);
        return {
          id,
          name,
          status: "DOWN",
          lastUpdate: new Date().toISOString(),
          findings: [], // ← added
          issue: null, // ← added
          error: result.reason.message,
        };
      }
    });

    return {
      collector: "media-servers",
      data: services,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (err: any) {
    return {
      collector: "media-servers",
      data: [],
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: err.message,
    };
  }
}
