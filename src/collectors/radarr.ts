// src/collectors/radarr.ts
import { createArrCollector } from "./arr-common";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

export const serviceId = "radarr";
export const serviceName = "Radarr";
export { getRadarrStatus as fetch };

export async function getRadarrStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  return createArrCollector(
    serviceId,
    serviceName,
    config.RADARR_URL,
    config.RADARR_API_KEY,
  );
}
