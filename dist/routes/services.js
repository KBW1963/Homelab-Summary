"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = servicesRoutes;
const state_1 = require("../state");
async function servicesRoutes(fastify) {
    fastify.get("/services", async () => {
        // FIXED: Added the dot between getState() and services
        const services = state_1.state.getState().services || [];
        return services.map((s) => {
            let issueText = "";
            if (s.error) {
                issueText = s.error;
            }
            else if (s.details?.issues && Array.isArray(s.details.issues)) {
                issueText = s.details.issues.map((i) => i.message || i).join(", ");
            }
            else if (s.findings && Array.isArray(s.findings)) {
                issueText = s.findings.map((f) => f.message).join(", ");
            }
            return {
                id: s.id,
                name: s.name,
                status: s.status,
                label: issueText ? `${s.status} — ${issueText}` : s.status,
                lastUpdate: s.lastUpdate,
                details: s.details || null,
                error: s.error || null,
            };
        });
    });
}
