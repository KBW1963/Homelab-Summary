"use strict";
// src/utils/redact.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactIPv4 = redactIPv4;
exports.redactIPv6 = redactIPv6;
exports.redactIP = redactIP;
exports.redactMac = redactMac;
exports.redactObject = redactObject;
function redactIPv4(value) {
    return value.replace(/\b(\d{1,3}\.){3}\d{1,3}\b/g, "xxx.xxx.xxx.xxx");
}
function redactIPv6(value) {
    // This matches most IPv6 formats (full, compressed, and loopback)
    // It's a simplified regex but covers typical cases.
    return value.replace(/\b([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b|\b([a-fA-F0-9]{1,4}:){1,7}:([a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}\b|\b::1\b|\b([a-fA-F0-9]{1,4}:){1,4}:([a-fA-F0-9]{1,4}:){1,4}:([a-fA-F0-9]{1,4})\b/g, "xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx");
}
function redactIP(value) {
    return redactIPv6(redactIPv4(value));
}
function redactMac(value) {
    return value.replace(/\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g, "xx:xx:xx:xx:xx:xx");
}
function redactObject(obj, redactFn) {
    if (typeof obj === "string") {
        return redactFn(obj);
    }
    else if (Array.isArray(obj)) {
        return obj.map((item) => redactObject(item, redactFn));
    }
    else if (obj && typeof obj === "object") {
        const result = {};
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            result[key] = redactObject(value, redactFn);
        }
        return result;
    }
    return obj;
}
