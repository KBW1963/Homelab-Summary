"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceName = exports.serviceId = void 0;
exports.getProwlarrStatus = getProwlarrStatus;
exports.fetch = getProwlarrStatus;
// src/collectors/prowlarr.ts
const arr_common_1 = require("./arr-common");
exports.serviceId = "prowlarr";
exports.serviceName = "Prowlarr";
async function getProwlarrStatus(config) {
    return (0, arr_common_1.createArrCollector)(exports.serviceId, exports.serviceName, config.PROWLARR_URL, config.PROWLARR_API_KEY);
}
