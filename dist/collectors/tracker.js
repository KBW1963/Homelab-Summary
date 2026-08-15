"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPollRun = recordPollRun;
exports.getCollectorMetrics = getCollectorMetrics;
let metrics = {
    lastPollTime: null,
    lastPollDurationMs: 0,
    totalPolls: 0,
    failedPolls: 0,
    servicesChecked: 0,
};
function recordPollRun(durationMs, success, count) {
    metrics.lastPollTime = new Date().toISOString();
    metrics.lastPollDurationMs = durationMs;
    metrics.totalPolls += 1;
    if (!success) {
        metrics.failedPolls += 1;
    }
    metrics.servicesChecked = count;
}
function getCollectorMetrics() {
    const health = metrics.failedPolls > 0 && metrics.failedPolls === metrics.totalPolls
        ? "DEGRADED"
        : "HEALTHY";
    return {
        health,
        ...metrics,
    };
}
