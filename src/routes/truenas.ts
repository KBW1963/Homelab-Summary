// src/routes/truenas.ts
import { FastifyInstance } from "fastify";
import { getState } from "../state";

export default async function truenasRoutes(fastify: FastifyInstance) {
  fastify.get("/truenas", async () => {
    const data = getState().truenas;
    if (!data) return { error: "No data yet" };

    // Add a clean label: "ONLINE (Used: 24.3 TB, Free: 4.7 TB)"
    const pools = data.pools?.map((pool: any) => ({
      ...pool,
      label: `${pool.status} (Used: ${pool.used}, Free: ${pool.free})`,
    }));

    return { pools };
  });
}
