// src/index.ts (relevant imports and banner section)

import packageJson from "../package.json";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { configureEnv } from "./config";
import { runCollectors } from "./scheduler";
import { collectorCount, collectorNames } from "./collector-manager";
import { serviceCount, serviceNames } from "./collectors/services";
import healthRoutes from "./routes/health";
import testHealthRoutes from "./routes/test-health";
import statusRoutes from "./routes/status";
import summaryRoutes from "./routes/summary";
import servicesRoutes from "./routes/services";
import collectorsRoutes from "./routes/collectors";
import truenasRoutes from "./routes/truenas";
import proxmoxRoutes from "./routes/proxmox";
import networkRoutes from "./routes/network";
import tailscaleRoutes from "./routes/tailscale";

interface AppConfig {
  POLL_INTERVAL_MS: number;
  PORT: number;
  LOG_LEVEL: string;
  API_KEY: string;
  REDACT_IPS?: boolean;
  PLEX_URL?: string;
  JELLYFIN_URL?: string;
  SONARR_URL?: string;
  PLEX_TOKEN?: string;
  JELLYFIN_TOKEN?: string;
  SONARR_API_KEY?: string;
  RADARR_URL?: string;
  RADARR_API_KEY?: string;
  PROWLARR_URL?: string;
  PROWLARR_API_KEY?: string;
  SABNZBD_URL?: string;
  SABNZBD_API_KEY?: string;
  SEERR_URL?: string;
  SEERR_API_KEY?: string;
  TRUENAS_HOST?: string;
  TRUENAS_API_KEY?: string;
  PROXMOX_HOST?: string;
  PROXMOX_API_TOKEN?: string;
  NETWORK_PING_TARGETS?: string;
  NETWORK_DNS_TARGETS?: string;
  NETWORK_DNS_SERVER?: string;
  TAILSCALE_PATH?: string;
}

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
  }
}

const fastify = Fastify({
  logger: false, // disable built‑in logger
});

fastify.register(cors, { origin: true });

// Extend FastifyRequest to include logStart
declare module "fastify" {
  interface FastifyRequest {
    logStart?: number;
  }
}

// Custom request logging (only if LOG_LEVEL=debug)
fastify.addHook("onRequest", (request, reply, done) => {
  request.logStart = Date.now();
  done();
});

if (process.env.LOG_LEVEL === "debug") {
  fastify.addHook("onResponse", (request, reply, done) => {
    const duration = Date.now() - (request.logStart || Date.now());
    const clientIp =
      request.ip || request.headers["x-forwarded-for"] || "unknown";
    console.log(
      `[${new Date().toISOString()}] ${clientIp} ${request.method} ${request.url} → ${reply.statusCode} (${duration}ms)`,
    );
    done();
  });
}

// Authentication hook
fastify.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health" || request.url === "/homepage") return;
  const apiKey = request.headers["x-api-key"];
  if (!apiKey || apiKey !== fastify.config?.API_KEY) {
    reply.code(401).send({ error: "Unauthorized: invalid or missing API key" });
    throw new Error("Unauthorized");
  }
});

// Helper for consistent banner formatting
function bannerLine(left: string, right: string = ""): string {
  const contentWidth = 58; // total visible content width between the two borders
  const content = left + right;
  const padded = content.padEnd(contentWidth, " ");
  return `║ ${padded} ║`;
}

function logStartupBanner(config: AppConfig) {
  const baseVersion = packageJson.version || "0.1.0";
  const environment = process.env.NODE_ENV || "development";
  const version =
    environment === "production" ? baseVersion : `${baseVersion}-dev`;

  const redactStatus =
    config.REDACT_IPS === true
      ? "🔒 ON (redacting)"
      : "🔓 OFF (showing real IPs)";

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log(bannerLine("Homelab Summary v" + version));
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(bannerLine("Startup"));
  console.log(bannerLine("  ✓ Configuration loaded"));
  console.log(bannerLine("  ✓ " + collectorCount + " collectors registered"));
  console.log(bannerLine("  ✓ Scheduler started"));
  console.log(bannerLine("  ✓ Current Homelab State initialised"));
  console.log(bannerLine("  ✓ API listening on http://0.0.0.0:" + config.PORT));
  console.log(
    bannerLine(" ✓ Redact IPs:  " + (config.REDACT_IPS ? "🔒  ON" : "🔓  OFF")),
  );
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(bannerLine("Runtime"));
  console.log(bannerLine("  Node:        " + process.version));
  console.log(bannerLine("  Environment: " + environment));
  console.log(bannerLine("  API Version: v" + version));
  console.log(
    bannerLine("  Polling:     " + config.POLL_INTERVAL_MS / 1000 + "s"),
  );
  console.log(bannerLine("  Collectors:  " + collectorCount));
  console.log(bannerLine("  Redact IPs:  " + redactStatus));

  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  // ---- Collector list (only once) ----
  console.log("Registered collectors:");
  const sortedNames = [...collectorNames].sort();
  for (const name of sortedNames) {
    if (name === "All Services") {
      console.log(`  • ${name} (${serviceCount} services)`);
    } else {
      console.log(`  • ${name}`);
    }
  }
  console.log("");

  // ---- Monitored services (only once, outside any loop) ----
  console.log("Monitored services:");
  for (const name of serviceNames) {
    console.log(`  • ${name}`);
  }
  console.log("");

  console.log("Ready to serve requests.");
  console.log("");
}

async function start() {
  // 1. Load configuration
  await configureEnv(fastify);
  const config = fastify.config; // <-- declared here

  // 2. Register routes
  await fastify.register(healthRoutes);
  await fastify.register(testHealthRoutes);
  await fastify.register(statusRoutes);
  await fastify.register(summaryRoutes);
  await fastify.register(servicesRoutes);
  await fastify.register(collectorsRoutes);
  await fastify.register(truenasRoutes);
  await fastify.register(proxmoxRoutes);
  await fastify.register(networkRoutes);
  await fastify.register(tailscaleRoutes);

  // 3. Start API
  await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
  // (No fastify.log.info line)

  // 4. Print startup banner
  logStartupBanner(config);

  // 5. Start scheduler (initial poll + periodic)
  await runCollectors(config);
  setInterval(() => runCollectors(config), config.POLL_INTERVAL_MS);
}

start().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
