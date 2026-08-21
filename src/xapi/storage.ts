import { z } from "zod";
import type { StorageAdapter } from "../types";

interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface GlobalWithStorage {
  browser?: { storage?: { local?: StorageAreaLike } };
  chrome?: { storage?: { local?: StorageAreaLike } };
}

const KEY_PREFIX = "xide:";

class BrowserStorage implements StorageAdapter {
  constructor(private readonly area: StorageAreaLike) {}

  async get<T>(key: string, schema: z.ZodType<T>) {
    const res = await this.area.get(KEY_PREFIX + key);
    const parsed = schema.safeParse(res[KEY_PREFIX + key]);
    return parsed.success ? parsed.data : null;
  }

  async set(key: string, value: unknown) {
    await this.area.set({ [KEY_PREFIX + key]: value });
  }
}

class LocalStorageArea implements StorageAdapter {
  async get<T>(key: string, schema: z.ZodType<T>) {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (raw === null) return null;
    let value: unknown = null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  async set(key: string, value: unknown) {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  }
}

const findStorageArea = () => {
  const g = globalThis as GlobalWithStorage;
  return g.browser?.storage?.local ?? g.chrome?.storage?.local ?? null;
}

export const createStorage = () => {
  const area = findStorageArea();
  if (area !== null) return new BrowserStorage(area);
  return new LocalStorageArea();
}
