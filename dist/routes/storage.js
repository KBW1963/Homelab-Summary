"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = storageRoutes;
const storage_1 = require("../collectors/storage");
async function storageRoutes(fastify) {
    fastify.get("/storage", async (request, reply) => {
        const data = await (0, storage_1.getStorageMetrics)();
        return data;
    });
}
