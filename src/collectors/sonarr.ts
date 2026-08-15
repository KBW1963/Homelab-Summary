// src/collectors/sonarr.ts
import { createArrCollector } from "./arr-common";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

export const serviceId = "sonarr";
export const serviceName = "Sonarr";
export { getSonarrStatus as fetch };

export async function getSonarrStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  return createArrCollector(
    serviceId,
    serviceName,
    config.SONARR_URL,
    config.SONARR_API_KEY,
  );
}
