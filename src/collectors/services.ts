// src/collectors/services.ts
import {
  ServiceStatus,
  deriveStatusFromFindings,
  Finding,
} from "../normalizer";
import { CollectorResult } from "./types";
import { getMediaServers } from "./media-servers";
import { getArrApps } from "./arr-apps";
import { getSeerrStatus } from "./seerr";
import { getSabnzbdStatus } from "./sabnzbd";
import * as plex from "./plex";
import * as jellyfin from "./jellyfin";
import * as sonarr from "./sonarr";
import * as radarr from "./radarr";
import * as prowlarr from "./prowlarr";
import * as seerr from "./seerr";
import * as sabnzbd from "./sabnzbd";

// ─── Dynamic service registry ───
const serviceRegistry = [
  { id: plex.serviceId, name: plex.serviceName, fetch: plex.fetch },
  { id: jellyfin.serviceId, name: jellyfin.serviceName, fetch: jellyfin.fetch },
  { id: sonarr.serviceId, name: sonarr.serviceName, fetch: sonarr.fetch },
  { id: radarr.serviceId, name: radarr.serviceName, fetch: radarr.fetch },
  { id: prowlarr.serviceId, name: prowlarr.serviceName, fetch: prowlarr.fetch },
  { id: seerr.serviceId, name: seerr.serviceName, fetch: seerr.fetch },
  { id: sabnzbd.serviceId, name: sabnzbd.serviceName, fetch: sabnzbd.fetch },
];

export const serviceIds = serviceRegistry.map((s) => s.id);
export const serviceNames = serviceRegistry.map((s) => s.name);
export const serviceCount = serviceRegistry.length;

export async function getAllServices(
  config: any,
): Promise<CollectorResult<ServiceStatus[]>> {
  const start = Date.now();
  try {
    const [mediaResult, arrResult, seerrResult, sabnzbdResult] =
      await Promise.allSettled([
        getMediaServers(config),
        getArrApps(config),
        getSeerrStatus(config),
        getSabnzbdStatus(config),
      ]);

    const services: ServiceStatus[] = [];

    if (mediaResult.status === "fulfilled") {
      services.push(...mediaResult.value.data);
    } else {
      console.error("Media Servers collector failed:", mediaResult.reason);
    }

    if (arrResult.status === "fulfilled") {
      services.push(...arrResult.value.data);
    } else {
      console.error("ARR Apps collector failed:", arrResult.reason);
    }

    if (seerrResult.status === "fulfilled") {
      services.push(seerrResult.value.data);
    } else {
      console.error("Seerr collector failed:", seerrResult.reason);
    }

    if (sabnzbdResult.status === "fulfilled") {
      services.push(sabnzbdResult.value.data);
    } else {
      console.error("SABnzbd collector failed:", sabnzbdResult.reason);
    }

    if (services.length !== serviceCount) {
      console.warn(
        `[services] Expected ${serviceCount} services, got ${services.length}`,
      );
    }

    return {
      collector: "services",
      data: services,
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "success",
    };
  } catch (err: any) {
    return {
      collector: "services",
      data: [],
      collectedAt: new Date().toISOString(),
      duration: Date.now() - start,
      status: "error",
      error: err.message,
    };
  }
}
