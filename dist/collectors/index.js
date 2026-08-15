"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectors = void 0;
const plex_1 = require("./plex");
const jellyfin_1 = require("./jellyfin");
const sonarr_1 = require("./sonarr");
const truenas_1 = require("./truenas");
const proxmox_1 = require("./proxmox");
const network_1 = require("./network");
exports.collectors = [
    { id: "plex", name: "Plex", collect: plex_1.getPlexStatus },
    { id: "jellyfin", name: "Jellyfin", collect: jellyfin_1.getJellyfinStatus },
    { id: "sonarr", name: "Sonarr", collect: sonarr_1.getSonarrStatus },
    { id: "truenas", name: "TrueNAS", collect: truenas_1.getTrueNASMetrics },
    { id: "proxmox", name: "Proxmox", collect: proxmox_1.getProxmoxMetrics },
    { id: "network", name: "Network", collect: network_1.getNetworkMetrics },
];
// For backward compatibility, we can also export a function that runs all collectors.
