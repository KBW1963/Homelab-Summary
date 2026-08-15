"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getSonarrStatus = getSonarrStatus;
exports.fetch = getSonarrStatus;
// src/collectors/sonarr.ts
const arr_common_1 = require("./arr-common");
exports.serviceId = "sonarr";
exports.serviceName = "Sonarr";
async function getSonarrStatus(config) {
    return (0, arr_common_1.createArrCollector)(exports.serviceId, exports.serviceName, config.SONARR_URL, config.SONARR_API_KEY);
}
