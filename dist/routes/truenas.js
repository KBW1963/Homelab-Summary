"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = truenasRoutes;
const state_1 = require("../state");
async function truenasRoutes(fastify) {
    fastify.get("/truenas", async () => {
        const data = (0, state_1.getState)().truenas;
        if (!data)
            return { error: "No data yet" };
        // Add a clean label: "ONLINE (Used: 24.3 TB, Free: 4.7 TB)"
        const pools = data.pools?.map((pool) => ({
            ...pool,
            label: `${pool.status} (Used: ${pool.used}, Free: ${pool.free})`,
        }));
        return { pools };
    });
}
