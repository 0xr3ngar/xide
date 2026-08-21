import { AuthorEntrySchema, type AuthorEntry, type StorageAdapter } from "../types";

const KNOWN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UNKNOWN_TTL_MS = 5 * 60 * 1000;

export class AuthorCache {
  private readonly memory = new Map<string, AuthorEntry>();

  constructor(private readonly storage: StorageAdapter) {}

  async get(handle: string) {
    const cached = this.memory.get(handle) ?? (await this.storage.get(`author:${handle}`, AuthorEntrySchema));
    if (cached === null) return null;
    this.memory.set(handle, cached);
    return cached;
  }

  isStale(entry: AuthorEntry, now = Date.now()) {
    const ttl = entry.country === null ? UNKNOWN_TTL_MS : KNOWN_TTL_MS;
    return now - entry.ts > ttl;
  }

  async set(handle: string, entry: AuthorEntry) {
    this.memory.set(handle, entry);
    await this.storage.set(`author:${handle}`, entry);
  }
}
