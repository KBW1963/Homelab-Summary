"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceCount = exports.serviceNames = exports.serviceIds = void 0;
exports.getAllServices = getAllServices;
const media_servers_1 = require("./media-servers");
const arr_apps_1 = require("./arr-apps");
const seerr_1 = require("./seerr");
const sabnzbd_1 = require("./sabnzbd");
const plex = __importStar(require("./plex"));
const jellyfin = __importStar(require("./jellyfin"));
const sonarr = __importStar(require("./sonarr"));
const radarr = __importStar(require("./radarr"));
const seerr = __importStar(require("./seerr"));
const sabnzbd = __importStar(require("./sabnzbd"));
// ─── Dynamic service registry ───
const serviceRegistry = [
    { id: plex.serviceId, name: plex.serviceName, fetch: plex.fetch },
    { id: jellyfin.serviceId, name: jellyfin.serviceName, fetch: jellyfin.fetch },
    { id: sonarr.serviceId, name: sonarr.serviceName, fetch: sonarr.fetch },
    { id: radarr.serviceId, name: radarr.serviceName, fetch: radarr.fetch },
    { id: seerr.serviceId, name: seerr.serviceName, fetch: seerr.fetch },
    { id: sabnzbd.serviceId, name: sabnzbd.serviceName, fetch: sabnzbd.fetch },
];
exports.serviceIds = serviceRegistry.map((s) => s.id);
exports.serviceNames = serviceRegistry.map((s) => s.name);
exports.serviceCount = serviceRegistry.length;
async function getAllServices(config) {
    const start = Date.now();
    try {
        const [mediaResult, arrResult, seerrResult, sabnzbdResult] = await Promise.allSettled([
            (0, media_servers_1.getMediaServers)(config),
            (0, arr_apps_1.getArrApps)(config),
            (0, seerr_1.getSeerrStatus)(config),
            (0, sabnzbd_1.getSabnzbdStatus)(config),
        ]);
        const services = [];
        if (mediaResult.status === "fulfilled") {
            services.push(...mediaResult.value.data);
        }
        else {
            console.error("Media Servers collector failed:", mediaResult.reason);
        }
        if (arrResult.status === "fulfilled") {
            services.push(...arrResult.value.data);
        }
        else {
            console.error("ARR Apps collector failed:", arrResult.reason);
        }
        if (seerrResult.status === "fulfilled") {
            services.push(seerrResult.value.data);
        }
        else {
            console.error("Seerr collector failed:", seerrResult.reason);
        }
        if (sabnzbdResult.status === "fulfilled") {
            services.push(sabnzbdResult.value.data);
        }
        else {
            console.error("SABnzbd collector failed:", sabnzbdResult.reason);
        }
        if (services.length !== exports.serviceCount) {
            console.warn(`[services] Expected ${exports.serviceCount} services, got ${services.length}`);
        }
        return {
            collector: "services",
            data: services,
            collectedAt: new Date().toISOString(),
            duration: Date.now() - start,
            status: "success",
        };
    }
    catch (err) {
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
