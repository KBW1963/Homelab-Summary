"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageMetrics = getStorageMetrics;
async function getStorageMetrics() {
    // TODO: Replace with actual API call to TrueNAS, Unraid, or local disk
    // For now, return a structured placeholder.
    return {
        pools: [
            { name: "pool1", status: "ONLINE", used: "2.3 TB", free: "5.1 TB" },
            { name: "pool2", status: "ONLINE", used: "0.8 TB", free: "3.2 TB" },
        ],
    };
}
