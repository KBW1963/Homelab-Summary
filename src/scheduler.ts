// src/scheduler.ts
import { performance } from "perf_hooks";
import { state, CollectorHealth } from "./state"; // Updated import
import { getAllServices } from "./collectors/services";
import { getTrueNASMetrics } from "./collectors/truenas";
import { getProxmoxMetrics } from "./collectors/proxmox";
import { getNetworkMetrics } from "./collectors/network";

let pollCounter = 0;
const previousHealth: Record<
  string,
  { status: string; error?: string | null }
> = {};

export async function runCollectors(config: any) {
  pollCounter++;
  const startTotal = performance.now();

  const runWithTiming = async (
    name: string,
    fn: (config: any) => Promise<any>,
  ) => {
    const start = performance.now();
    try {
      const result = await fn(config);
      const duration = performance.now() - start;
      return { name, result, duration, error: null };
    } catch (err: any) {
      const duration = performance.now() - start;
      return { name, result: null, duration, error: err };
    }
  };

  const results = await Promise.all([
    runWithTiming("services", getAllServices),
    runWithTiming("truenas", getTrueNASMetrics),
    runWithTiming("proxmox", getProxmoxMetrics),
    runWithTiming("network", getNetworkMetrics),
  ]);

  const healthRecord: Record<string, CollectorHealth> = {};
  const timings: Record<string, number> = {};
  const stepDetails: Record<string, Record<string, number>> = {};

  for (const item of results) {
    timings[item.name] = item.duration;

    if (item.error) {
      console.error(`${item.name} collector failed:`, item.error);
      healthRecord[item.name] = {
        name: item.name,
        status: "unhealthy",
        lastRun: new Date().toISOString(),
        duration: item.duration,
        errors: 1,
        lastError: item.error.message || "Unknown error",
      };
      continue;
    }

    const data = item.name === "services" ? item.result.data : item.result;

    if (item.name === "network" && data && data.steps) {
      stepDetails.network = data.steps;
    }

    const isError = data && typeof data === "object" && "error" in data;
    const currentStatus = isError ? "degraded" : "healthy";

    const prev = previousHealth[item.name];
    if (prev) {
      if (prev.status !== currentStatus) {
        const errorMsg = isError ? (data as any).error : null;
        console.log("──────────────────────────────────────────");
        console.log("Collector state changed");
        console.log("");
        console.log(`  Collector : ${item.name}`);
        console.log(`  Previous  : ${prev.status.toUpperCase()}`);
        console.log(`  Current   : ${currentStatus.toUpperCase()}`);
        if (errorMsg) {
          console.log(`  Reason    : ${errorMsg}`);
        }
        console.log("──────────────────────────────────────────");
        console.log("");
      }
    }

    previousHealth[item.name] = {
      status: currentStatus,
      error: isError ? (data as any).error : null,
    };

    healthRecord[item.name] = {
      name: item.name,
      status: currentStatus,
      lastRun: new Date().toISOString(),
      duration: item.duration,
      errors: isError ? 1 : 0,
      lastError: isError ? (data as any).error : null,
    };
  }

  // Call the new unified update method
  const networkResult = results.find((r) => r.name === "network")?.result;
  console.log("Scheduler network result:", networkResult ? "exists" : "null");
  console.log(
    "Scheduler network tailscale nodes:",
    networkResult?.tailscale?.nodes?.length || 0,
  );

  state.updateAll(
    results.find((r) => r.name === "services")?.result?.data || [],
    results.find((r) => r.name === "truenas")?.result || null,
    results.find((r) => r.name === "proxmox")?.result || null,
    results.find((r) => r.name === "network")?.result || null,
    healthRecord,
  );

  console.log(
    "State after update - network:",
    state.getState().network ? "exists" : "null",
  );

  const totalDuration = (performance.now() - startTotal).toFixed(0);

  // --- Rest of your logs remain exactly the same ---
  console.log("──────────────────────────────────────────");
  console.log(`Scheduler Poll #${pollCounter}`);
  console.log("──────────────────────────────────────────");
  console.log("");
  console.log("Collectors:");

  for (const [name, duration] of Object.entries(timings)) {
    if (name === "network") continue;
    const health = healthRecord[name];
    let icon = "✓";
    if (health?.status === "unhealthy") icon = "✗";
    else if (health?.status === "degraded") icon = "⚠";
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    const durationStr = duration.toFixed(0).padStart(5, " ") + "ms";
    console.log(`  ${icon} ${displayName.padEnd(14)} ${durationStr}`);
  }

  console.log("");
  console.log(`    Network Checks:`);

  if (stepDetails.network) {
    for (const [step, stepDuration] of Object.entries(stepDetails.network)) {
      const stepDurationStr = stepDuration.toFixed(0).padStart(4, " ") + "ms";
      console.log(`        ✓ ${step.padEnd(14)} ${stepDurationStr}`);
    }
  }

  const networkDuration = timings.network || 0;
  if (networkDuration > 0) {
    const durationStr = networkDuration.toFixed(0).padStart(10, " ") + "ms";
    console.log("──────────────────────────────────────────");
    console.log(`  ✓ ${"Network".padEnd(14)} ${durationStr}`);
    console.log("");
    console.log(`Poll compelted in ${totalDuration}ms`);
    console.log("──────────────────────────────────────────");
  }

  const healthy = Object.values(healthRecord).filter(
    (h) => h.status === "healthy",
  ).length;
  const degraded = Object.values(healthRecord).filter(
    (h) => h.status === "degraded",
  ).length;
  const unhealthy = Object.values(healthRecord).filter(
    (h) => h.status === "unhealthy",
  ).length;
  const totalCollectors = healthy + degraded + unhealthy;
  console.log("Infrastructure Health");
  console.log(`  Healthy:    ${healthy}`);
  console.log(`  Degraded:   ${degraded}`);
  console.log(`  Unhealthy:  ${unhealthy}`);
  console.log(`  Total:      ${totalCollectors}`);
  console.log("");

  // Fix: Use 'state' instead of 'getState()'
  const stateData = state.getState();
  const services = stateData.services || [];
  const up = services.filter((s: any) => s.status === "UP").length;
  const servDegraded = services.filter(
    (s: any) => s.status === "DEGRADED",
  ).length;
  const down = services.filter((s: any) => s.status === "DOWN").length;
  const totalServices = up + servDegraded + down;
  console.log("Service Health");
  console.log(`  Up:         ${up}`);
  console.log(`  Degraded:   ${servDegraded}`);
  console.log(`  Down:       ${down}`);
  console.log(`  Total:      ${totalServices}`);
}
