"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveStatusFromFindings = deriveStatusFromFindings;
exports.parseXML = parseXML;
exports.inferStatus = inferStatus;
exports.extractVersion = extractVersion;
// src/normalizer.ts
const fast_xml_parser_1 = require("fast-xml-parser");
// ─── Derive status from findings ───
function deriveStatusFromFindings(findings) {
    if (!findings || findings.length === 0)
        return "UP";
    const isUnreachable = findings.some((f) => f.severity === "critical" && f.category === "connectivity");
    if (isUnreachable)
        return "DOWN";
    const hasCritical = findings.some((f) => f.severity === "critical");
    const hasWarning = findings.some((f) => f.severity === "warning");
    if (hasCritical || hasWarning)
        return "DEGRADED";
    return "UP";
}
// ─── XML Parser (for Plex) ───
function parseXML(data, rootKey) {
    if (typeof data !== "string") {
        // If it's already an object, return the root if it exists
        if (data && typeof data === "object" && data[rootKey]) {
            return data[rootKey];
        }
        return null;
    }
    try {
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
        });
        const parsed = parser.parse(data);
        return parsed[rootKey] || null;
    }
    catch {
        return null;
    }
}
// ─── Legacy helpers (kept for backward compatibility) ───
function inferStatus(data) {
    if (!data)
        return "UNKNOWN";
    if (data.status === "pass")
        return "UP";
    if (data.status === "fail")
        return "DOWN";
    if (data.status === "warn")
        return "DEGRADED";
    if (data.status === "ok" || data.status === "healthy" || data.status === "up")
        return "UP";
    if (data.database) {
        if (data.database === "ok" || data.database === "up")
            return "UP";
        if (data.database === "down" || data.database === "error")
            return "DOWN";
        return "DEGRADED";
    }
    if (data.error)
        return "DOWN";
    return "UNKNOWN";
}
function extractVersion(data) {
    return data.version || data.release || data.buildInfo?.version;
}
