// src/utils/redact.ts

export function redactIPv4(value: string): string {
  return value.replace(/\b(\d{1,3}\.){3}\d{1,3}\b/g, "xxx.xxx.xxx.xxx");
}

export function redactIPv6(value: string): string {
  // This matches most IPv6 formats (full, compressed, and loopback)
  // It's a simplified regex but covers typical cases.
  return value.replace(
    /\b([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b|\b([a-fA-F0-9]{1,4}:){1,7}:([a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}\b|\b::1\b|\b([a-fA-F0-9]{1,4}:){1,4}:([a-fA-F0-9]{1,4}:){1,4}:([a-fA-F0-9]{1,4})\b/g,
    "xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx",
  );
}

export function redactIP(value: string): string {
  return redactIPv6(redactIPv4(value));
}

export function redactMac(value: string): string {
  return value.replace(
    /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    "xx:xx:xx:xx:xx:xx",
  );
}

export function redactObject<T>(obj: T, redactFn: (val: string) => string): T {
  if (typeof obj === "string") {
    return redactFn(obj) as any;
  } else if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, redactFn)) as any;
  } else if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const value = (obj as any)[key];
      result[key] = redactObject(value, redactFn);
    }
    return result as T;
  }
  return obj;
}
