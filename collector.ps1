# create-refactored-files.ps1
# Run this from your project root (e.g., C:\ISO\Homelab Summary)

$ErrorActionPreference = "Stop"

Write-Host "Creating refactored aggregator files..." -ForegroundColor Cyan

# Ensure directories exist
$dirs = @(
    "src\collectors",
    "src\routes"
)
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 1. src\cache.ts
@"
import { ServiceStatus } from './normalizer';

export interface State {
  services: ServiceStatus[];
  truenas: any | null;
  proxmox: any | null;
  network: any | null;
}

const state: State = {
  services: [],
  truenas: null,
  proxmox: null,
  network: null,
};

export function getState(): State {
  return state;
}

export function updateServices(data: ServiceStatus[]) {
  state.services = data;
}

export function updateTruenas(data: any) {
  state.truenas = data;
}

export function updateProxmox(data: any) {
  state.proxmox = data;
}

export function updateNetwork(data: any) {
  state.network = data;
}
"@ | Out-File -FilePath "src\cache.ts" -Encoding utf8

# 2. src\scheduler.ts
@"
import { getAllServices } from './collectors/services';
import { getTrueNASMetrics } from './collectors/truenas';
import { getProxmoxMetrics } from './collectors/proxmox';
import { getNetworkMetrics } from './collectors/network';
import { updateServices, updateTruenas, updateProxmox, updateNetwork } from './cache';

export async function runCollectors(config: any) {
  const [servicesResult, truenasResult, proxmoxResult, networkResult] = await Promise.allSettled([
    getAllServices(config),
    getTrueNASMetrics(config),
    getProxmoxMetrics(config),
    getNetworkMetrics(config),
  ]);

  if (servicesResult.status === 'fulfilled') {
    updateServices(servicesResult.value);
  } else {
    console.error('Services collector failed:', servicesResult.reason);
  }

  if (truenasResult.status === 'fulfilled') {
    updateTruenas(truenasResult.value);
  } else {
    console.error('TrueNAS collector failed:', truenasResult.reason);
  }

  if (proxmoxResult.status === 'fulfilled') {
    updateProxmox(proxmoxResult.value);
  } else {
    console.error('Proxmox collector failed:', proxmoxResult.reason);
  }

  if (networkResult.status === 'fulfilled') {
    updateNetwork(networkResult.value);
  } else {
    console.error('Network collector failed:', networkResult.reason);
  }
}
"@ | Out-File -FilePath "src\scheduler.ts" -Encoding utf8

# 3. src\collectors\plex.ts
@"
import axios from 'axios';
import { ServiceStatus } from '../normalizer';
import { parseXML } from '../normalizer';

export async function getPlexStatus(config: any): Promise<ServiceStatus> {
  try {
    const url = config.PLEX_URL;
    const response = await axios.get(url, {
      headers: { 'X-Plex-Token': config.PLEX_TOKEN },
      timeout: 10000,
    });
    const container = parseXML(response.data, 'MediaContainer');
    if (container && container.version) {
      return {
        id: 'plex',
        name: 'Starmedia Plex',
        status: 'UP',
        lastUpdate: new Date().toISOString(),
        details: { version: container.version },
      };
    }
    return {
      id: 'plex',
      name: 'Starmedia Plex',
      status: 'DOWN',
      lastUpdate: new Date().toISOString(),
      error: 'Invalid response',
    };
  } catch (err: any) {
    return {
      id: 'plex',
      name: 'Starmedia Plex',
      status: 'DOWN',
      lastUpdate: new Date().toISOString(),
      error: err.message,
    };
  }
}
"@ | Out-File -FilePath "src\collectors\plex.ts" -Encoding utf8

# 4. src\collectors\jellyfin.ts
@"
import axios from 'axios';
import { ServiceStatus } from '../normalizer';

export async function getJellyfinStatus(config: any): Promise<ServiceStatus> {
  try {
    const url = config.JELLYFIN_URL;
    const response = await axios.get(url, {
      headers: { 'X-Emby-Token': config.JELLYFIN_TOKEN },
      timeout: 10000,
    });
    if (typeof response.data === 'string' && response.data.trim() === 'Healthy') {
      return {
        id: 'jellyfin',
        name: 'N100 Jellyfin',
        status: 'UP',
        lastUpdate: new Date().toISOString(),
      };
    }
    return {
      id: 'jellyfin',
      name: 'N100 Jellyfin',
      status: 'DOWN',
      lastUpdate: new Date().toISOString(),
      error: 'Unexpected response',
    };
  } catch (err: any) {
    return {
      id: 'jellyfin',
      name: 'N100 Jellyfin',
      status: 'DOWN',
      lastUpdate: new Date().toISOString(),
      error: err.message,
    };
  }
}
"@ | Out-File -FilePath "src\collectors\jellyfin.ts" -Encoding utf8

# 5. src\collectors\sonarr.ts
@"
import axios from 'axios';
import { ServiceStatus } from '../normalizer';

export async function getSonarrStatus(config: any): Promise<ServiceStatus> {
  try {
    const url = config.SONARR_URL;
    const response = await axios.get(url, {
      headers: { 'X-Api-Key': config.SONARR_API_KEY },
      timeout: 10000,
    });
    if (Array.isArray(response.data) && response.data.length === 0) {
      return {
        id: 'sonarr',
        name: 'Sonarr',
        status: 'UP',
        lastUpdate: new Date().toISOString(),
      };
    }
    return {
      id: 'sonarr',
      name: 'Sonarr',
      status: 'DEGRADED',
      lastUpdate: new Date().toISOString(),
      details: { issues: response.data },
    };
  } catch (err: any) {
    return {
      id: 'sonarr',
      name: 'Sonarr',
      status: 'DOWN',
      lastUpdate: new Date().toISOString(),
      error: err.message,
    };
  }
}
"@ | Out-File -FilePath "src\collectors\sonarr.ts" -Encoding utf8

# 6. src\collectors\services.ts (aggregator)
@"
import { ServiceStatus } from '../normalizer';
import { getPlexStatus } from './plex';
import { getJellyfinStatus } from './jellyfin';
import { getSonarrStatus } from './sonarr';

export async function getAllServices(config: any): Promise<ServiceStatus[]> {
  const results = await Promise.allSettled([
    getPlexStatus(config),
    getJellyfinStatus(config),
    getSonarrStatus(config),
  ]);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const ids = ['plex', 'jellyfin', 'sonarr'];
      const names = ['Starmedia Plex', 'N100 Jellyfin', 'Sonarr'];
      return {
        id: ids[index],
        name: names[index],
        status: 'DOWN',
        lastUpdate: new Date().toISOString(),
        error: result.reason.message,
      };
    }
  });
}
"@ | Out-File -FilePath "src\collectors\services.ts" -Encoding utf8

# 7. src\collectors\truenas.ts (existing – but we keep it as is)
# We'll not overwrite, but if you want the final version from earlier, you can include it.
# I'll skip to avoid duplication.

# 8. src\collectors\proxmox.ts – we keep the one with nslookup DNS fallback (already exists, skip)

# 9. src\collectors\network.ts – keep the one with nslookup (skip)

# 10. src\routes\status.ts – read from cache
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async () => {
    return getState().services;
  });

  fastify.get('/status/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const service = getState().services.find(s => s.id === id);
    if (!service) {
      reply.code(404).send({ error: 'Service not found' });
      return;
    }
    return service;
  });

  fastify.get('/status/summary', async () => {
    const services = getState().services;
    if (services.length === 0) {
      return { overall: 'UNKNOWN', total: 0, up: 0, down: 0, degraded: 0, services: [], issues: [] };
    }
    const up = services.filter(s => s.status === 'UP').length;
    const down = services.filter(s => s.status === 'DOWN').length;
    const degraded = services.filter(s => s.status === 'DEGRADED').length;
    const total = services.length;
    let overall = 'UP';
    if (down > 0) overall = 'DOWN';
    else if (degraded > 0) overall = 'DEGRADED';
    const issues = services.filter(s => s.status !== 'UP').map(s => `${s.name}: ${s.status}`);
    return {
      overall,
      total,
      up,
      down,
      degraded,
      lastUpdate: new Date().toISOString(),
      issues,
      services: services.map(s => ({ name: s.name, status: s.status })),
    };
  });
}
"@ | Out-File -FilePath "src\routes\status.ts" -Encoding utf8

# 11. src\routes\truenas.ts
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function truenasRoutes(fastify: FastifyInstance) {
  fastify.get('/truenas', async () => {
    const data = getState().truenas;
    if (!data) return { error: 'No data yet' };
    return data;
  });
}
"@ | Out-File -FilePath "src\routes\truenas.ts" -Encoding utf8

# 12. src\routes\proxmox.ts
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function proxmoxRoutes(fastify: FastifyInstance) {
  fastify.get('/proxmox', async () => {
    const data = getState().proxmox;
    if (!data) return { error: 'No data yet' };
    return data;
  });
}
"@ | Out-File -FilePath "src\routes\proxmox.ts" -Encoding utf8

# 13. src\routes\network.ts
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function networkRoutes(fastify: FastifyInstance) {
  fastify.get('/network', async () => {
    const data = getState().network;
    if (!data) return { error: 'No data yet' };
    return data;
  });
}
"@ | Out-File -FilePath "src\routes\network.ts" -Encoding utf8

# 14. src\routes\summary.ts – keep as is (it already uses getState? we'll adjust to use cache)
# Actually, summary.ts was using getCache(). We'll update it to use getState().services.
# We'll provide a new version.
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function summaryRoutes(fastify: FastifyInstance) {
  fastify.get('/summary', async () => {
    const services = getState().services;
    if (services.length === 0) {
      return { overall: 'UNKNOWN', total: 0, up: 0, down: 0, degraded: 0, services: [], issues: [] };
    }
    const up = services.filter(s => s.status === 'UP').length;
    const down = services.filter(s => s.status === 'DOWN').length;
    const degraded = services.filter(s => s.status === 'DEGRADED').length;
    const total = services.length;
    let overall = 'UP';
    if (down > 0) overall = 'DOWN';
    else if (degraded > 0) overall = 'DEGRADED';
    const issues = services.filter(s => s.status !== 'UP').map(s => `${s.name}: ${s.status}`);
    return {
      overall,
      total,
      up,
      down,
      degraded,
      lastUpdate: new Date().toISOString(),
      issues,
      services: services.map(s => ({ name: s.name, status: s.status })),
    };
  });
}
"@ | Out-File -FilePath "src\routes\summary.ts" -Encoding utf8

# 15. src\routes\services.ts – this was for detailed list; we'll also read from cache.
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function servicesRoutes(fastify: FastifyInstance) {
  fastify.get('/services', async () => {
    const services = getState().services;
    return services.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      lastUpdate: s.lastUpdate,
      details: s.details || null,
      error: s.error || null,
    }));
  });
}
"@ | Out-File -FilePath "src\routes\services.ts" -Encoding utf8

# 16. src\routes\collectors.ts – we can keep as is, it uses getCache, but we can adapt.
# But we may not need that endpoint now; we can keep it or remove. For safety, we'll keep it using getState.
# We'll create a new version that provides status of each collector? That's a separate topic.
# I'll keep the old one for now.

# 17. src\index.ts – the main entry point.
@"
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { configureEnv } from "./config";
import { runCollectors } from "./scheduler";
import healthRoutes from "./routes/health";
import statusRoutes from "./routes/status";
import summaryRoutes from "./routes/summary";
import servicesRoutes from "./routes/services";
import collectorsRoutes from "./routes/collectors";
import storageRoutes from "./routes/storage";
import truenasRoutes from "./routes/truenas";
import proxmoxRoutes from "./routes/proxmox";
import networkRoutes from "./routes/network";

interface AppConfig {
  POLL_INTERVAL_MS: number;
  PORT: number;
  LOG_LEVEL: string;
  API_KEY: string;
  PLEX_URL?: string;
  JELLYFIN_URL?: string;
  SONARR_URL?: string;
  PLEX_TOKEN?: string;
  JELLYFIN_TOKEN?: string;
  SONARR_API_KEY?: string;
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
  logger: { level: process.env.LOG_LEVEL || "info" },
});

fastify.register(cors, { origin: true });

// Authentication hook
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url === '/health') return;
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || apiKey !== fastify.config?.API_KEY) {
    reply.code(401).send({ error: 'Unauthorized: invalid or missing API key' });
    throw new Error('Unauthorized');
  }
});

async function start() {
  await configureEnv(fastify);
  const config = fastify.config;

  // Initial collector run
  await runCollectors(config);

  // Schedule periodic runs
  setInterval(() => runCollectors(config), config.POLL_INTERVAL_MS);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(statusRoutes);
  await fastify.register(summaryRoutes);
  await fastify.register(servicesRoutes);
  await fastify.register(collectorsRoutes);
  await fastify.register(storageRoutes);
  await fastify.register(truenasRoutes);
  await fastify.register(proxmoxRoutes);
  await fastify.register(networkRoutes);

  await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
  fastify.log.info(`Server listening on port ${config.PORT}`);
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
"@ | Out-File -FilePath "src\index.ts" -Encoding utf8

# 18. src\routes\collectors.ts – we need to update it to use getState if we want to keep it.
# We can create a new version that shows status of each collector run (like last poll time, success).
# For simplicity, we'll just keep the old one but it references getCache which is gone.
# Let's provide a replacement that reads from state and provides a summary of collectors.
# Actually, the collector status endpoint was for debugging. We can drop it, or keep it.
# I'll provide a simple version that returns the list of services with last update.
@"
import { FastifyInstance } from 'fastify';
import { getState } from '../cache';

export default async function collectorsRoutes(fastify: FastifyInstance) {
  fastify.get('/collectors', async () => {
    const services = getState().services;
    return services.map(s => ({
      id: s.id,
      name: s.name,
      lastPoll: s.lastUpdate,
      success: !s.error,
      error: s.error || null,
    }));
  });
}
"@ | Out-File -FilePath "src\routes\collectors.ts" -Encoding utf8

# 19. src\config.ts – we'll keep the existing one, but ensure it has all required properties.
# We'll not overwrite; the user already has it.

# 20. src\normalizer.ts – keep existing.

Write-Host "All files created successfully!" -ForegroundColor Green
Write-Host "Please review the changes and restart the aggregator." -ForegroundColor Yellow