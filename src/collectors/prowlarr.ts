// src/collectors/prowlarr.ts
import { createArrCollector } from "./arr-common";
import { CollectorResult } from "./types";
import { ServiceStatus } from "../normalizer";

export const serviceId = "prowlarr";
export const serviceName = "Prowlarr";
export { getProwlarrStatus as fetch };

export async function getProwlarrStatus(
  config: any,
): Promise<CollectorResult<ServiceStatus>> {
  return createArrCollector(
    serviceId,
    serviceName,
    config.PROWLARR_URL,
    config.PROWLARR_API_KEY,
  );
}
