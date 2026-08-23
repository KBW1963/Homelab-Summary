import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";

export async function configureEnv(fastify: FastifyInstance) {
  const schema = {
    type: "object",
    required: ["POLL_INTERVAL_MS", "API_KEY"],
    properties: {
      // Aggregator
      POLL_INTERVAL_MS: { type: "number", default: 30000 },
      PORT: { type: "number", default: 3000 },
      LOG_LEVEL: { type: "string", default: "info" },
      API_KEY: { type: "string" },

      // Redaction flag
      REDACT_IPS: { type: "boolean", default: false },

      // Application URLs
      PLEX_URL: { type: "string" },
      JELLYFIN_URL: { type: "string" },
      SONARR_URL: { type: "string" },
      RADARR_URL: { type: "string" },
      PROWLARR_URL: { type: "string" },
      SEERR_URL: { type: "string" },
      SABNZBD_URL: { type: "string" },

      // Application Tokens/API Keys/Auth
      PLEX_TOKEN: { type: "string" },
      JELLYFIN_TOKEN: { type: "string" },
      SONARR_API_KEY: { type: "string" },
      RADARR_API_KEY: { type: "string" },
      PROWLARR_API_KEY: { type: "string" },
      SEERR_API_KEY: { type: "string" },
      SABNZBD_API_KEY: { type: "string" },

      // TrueNAS
      TRUENAS_HOST: { type: "string", default: "http://truenas.local" },
      TRUENAS_API_KEY: { type: "string" },

      // Proxmox
      PROXMOX_HOST: { type: "string", default: "https://proxmox.local:8006" },
      PROXMOX_API_TOKEN: { type: "string" },

      // Network Metrics
      NETWORK_PING_TARGETS: {
        type: "string",
        default: "gateway|192.168.0.1,dns|1.1.1.1,internet|8.8.8.8",
      },
      TAILSCALE_PATH: { type: "string", default: "tailscale" },

      // ✅ ADD THESE TWO LINES:
      TAILSCALE_API_KEY: { type: "string" },
      TAILSCALE_TAILNET: { type: "string" },

      // DNS Properties
      NETWORK_DNS_TARGETS: {
        type: "string",
        default: "google.com,github.com,localhost",
      },
      NETWORK_DNS_SERVER: { type: "string", default: "" },
    },
  };

  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
    confKey: "config",
  });
}
