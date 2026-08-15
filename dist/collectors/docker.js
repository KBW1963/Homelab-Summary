"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDockerStats = getDockerStats;
const dockerode_1 = __importDefault(require("dockerode"));
const docker = new dockerode_1.default({ socketPath: "/var/run/docker.sock" });
async function getDockerStats() {
    try {
        const containers = await docker.listContainers({ all: true });
        const total = containers.length;
        const running = containers.filter((c) => c.State === "running").length;
        return { total, running, online: `${running}/${total} online` };
    }
    catch {
        return { total: 0, running: 0, online: "N/A" };
    }
}
