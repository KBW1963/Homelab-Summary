"use strict";
// src/index.ts (relevant imports and banner section)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../package.json"));
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const config_1 = require("./config");
const scheduler_1 = require("./scheduler");
const collector_manager_1 = require("./collector-manager");
const services_1 = require("./collectors/services");
const health_1 = __importDefault(require("./routes/health"));
const test_health_1 = __importDefault(require("./routes/test-health"));
const status_1 = __importDefault(require("./routes/status"));
const summary_1 = __importDefault(require("./routes/summary"));
const services_2 = __importDefault(require("./routes/services"));
const collectors_1 = __importDefault(require("./routes/collectors"));
const truenas_1 = __importDefault(require("./routes/truenas"));
const proxmox_1 = __importDefault(require("./routes/proxmox"));
const network_1 = __importDefault(require("./routes/network"));
const tailscale_1 = __importDefault(require("./routes/tailscale"));
const fastify = (0, fastify_1.default)({
    logger: false, // disable built‑in logger
});
fastify.register(cors_1.default, { origin: true });
// Custom request logging (only if LOG_LEVEL=debug)
fastify.addHook("onRequest", (request, reply, done) => {
    request.logStart = Date.now();
    done();
});
if (process.env.LOG_LEVEL === "debug") {
    fastify.addHook("onResponse", (request, reply, done) => {
        const duration = Date.now() - (request.logStart || Date.now());
        const clientIp = request.ip || request.headers["x-forwarded-for"] || "unknown";
        console.log(`[${new Date().toISOString()}] ${clientIp} ${request.method} ${request.url} → ${reply.statusCode} (${duration}ms)`);
        done();
    });
}
// Authentication hook
fastify.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || request.url === "/homepage")
        return;
    const apiKey = request.headers["x-api-key"];
    if (!apiKey || apiKey !== fastify.config?.API_KEY) {
        reply.code(401).send({ error: "Unauthorized: invalid or missing API key" });
        throw new Error("Unauthorized");
    }
});
// Helper for consistent banner formatting
function bannerLine(left, right = "") {
    const contentWidth = 58; // total visible content width between the two borders
    const content = left + right;
    const padded = content.padEnd(contentWidth, " ");
    return `║ ${padded} ║`;
}
function logStartupBanner(config) {
    const version = package_json_1.default.version || "0.1.0-dev";
    const nodeVersion = process.version;
    const environment = process.env.NODE_ENV || "development";
    console.log("");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log(bannerLine("Homelab Summary v" + version));
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(bannerLine("Startup"));
    console.log(bannerLine("  ✓ Configuration loaded"));
    console.log(bannerLine("  ✓ " + collector_manager_1.collectorCount + " collectors registered"));
    console.log(bannerLine("  ✓ Scheduler started"));
    console.log(bannerLine("  ✓ Current Homelab State initialised"));
    console.log(bannerLine("  ✓ API listening on http://0.0.0.0:" + config.PORT));
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(bannerLine("Runtime"));
    console.log(bannerLine("  Node:        " + nodeVersion));
    console.log(bannerLine("  Environment: " + environment));
    console.log(bannerLine("  API Version: v" + version));
    console.log(bannerLine("  Polling:     " + config.POLL_INTERVAL_MS / 1000 + "s"));
    console.log(bannerLine("  Collectors:  " + collector_manager_1.collectorCount));
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log("");
    // ---- Collector list (only once) ----
    console.log("Registered collectors:");
    const sortedNames = [...collector_manager_1.collectorNames].sort();
    for (const name of sortedNames) {
        if (name === "All Services") {
            console.log(`  • ${name} (${services_1.serviceCount} services)`);
        }
        else {
            console.log(`  • ${name}`);
        }
    }
    console.log("");
    // ---- Monitored services (only once, outside any loop) ----
    console.log("Monitored services:");
    for (const name of services_1.serviceNames) {
        console.log(`  • ${name}`);
    }
    console.log("");
    console.log("Ready to serve requests.");
    console.log("");
}
async function start() {
    // 1. Load configuration
    await (0, config_1.configureEnv)(fastify);
    const config = fastify.config; // <-- declared here
    // 2. Register routes
    await fastify.register(health_1.default);
    await fastify.register(test_health_1.default);
    await fastify.register(status_1.default);
    await fastify.register(summary_1.default);
    await fastify.register(services_2.default);
    await fastify.register(collectors_1.default);
    await fastify.register(truenas_1.default);
    await fastify.register(proxmox_1.default);
    await fastify.register(network_1.default);
    await fastify.register(tailscale_1.default);
    // 3. Start API
    await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
    // (No fastify.log.info line)
    // 4. Print startup banner
    logStartupBanner(config);
    // 5. Start scheduler (initial poll + periodic)
    await (0, scheduler_1.runCollectors)(config);
    setInterval(() => (0, scheduler_1.runCollectors)(config), config.POLL_INTERVAL_MS);
}
start().catch((err) => {
    console.error("Fatal error during startup:", err);
    process.exit(1);
});
