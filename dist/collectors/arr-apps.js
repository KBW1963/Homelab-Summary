"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArrApps = getArrApps;
// src/collectors/arr-apps.ts
const sonarr_1 = require("./sonarr");
const radarr_1 = require("./radarr");
const prowlarr_1 = require("./prowlarr");
const arrAppIds = ["sonarr", "radarr", "prowlarr"];
async function getArrApps(config) {
    const start = Date.now();
    try {
        const results = await Promise.allSettled([
            (0, sonarr_1.getSonarrStatus)(config),
            (0, radarr_1.getRadarrStatus)(config),
            (0, prowlarr_1.getProwlarrStatus)(config),
        ]);
        const services = results.map((result, index) => {
            if (result.status === "fulfilled") {
                return result.value.data;
            }
            else {
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
    }
    catch (err) {
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
