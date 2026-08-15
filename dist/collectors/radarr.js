"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getRadarrStatus = getRadarrStatus;
exports.fetch = getRadarrStatus;
// src/collectors/radarr.ts
const arr_common_1 = require("./arr-common");
exports.serviceId = "radarr";
exports.serviceName = "Radarr";
async function getRadarrStatus(config) {
    return (0, arr_common_1.createArrCollector)(exports.serviceId, exports.serviceName, config.RADARR_URL, config.RADARR_API_KEY);
}
