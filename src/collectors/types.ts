// src/collectors/types.ts
export interface Collector<T = any> {
  id: string;
  name: string;
  collect: (config: any) => Promise<CollectorResult<T>>;
  capabilities?: {
    provides: string[];
    requires: string[];
    dataFreshness: string;
  };
}

export interface CollectorResult<T> {
  collector: string;
  data: T;
  collectedAt: string; // ISO timestamp
  duration: number; // milliseconds
  status: "success" | "error";
  error?: string; // present if status === 'error'
}
