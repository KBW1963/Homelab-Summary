"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMediaServers = getMediaServers;
// src/collectors/media-servers.ts
const plex_1 = require("./plex");
const jellyfin_1 = require("./jellyfin");
const mediaServerIds = ["plex", "jellyfin"];
async function getMediaServers(config) {
    const start = Date.now();
    try {
        const results = await Promise.allSettled([
            (0, plex_1.getPlexStatus)(config),
            (0, jellyfin_1.getJellyfinStatus)(config),
        ]);
        const services = results.map((result, index) => {
            if (result.status === "fulfilled") {
                return result.value.data;
            }
            else {
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
    }
    catch (err) {
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
