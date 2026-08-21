import { z } from "zod";
import type { ProfileSignal } from "../types";

const DEFAULT_QUERY_ID = "XRqGa7EeokUU5kppkh13EA";

// Public web-client bearer token, embedded in x.com's own JS bundle, not a secret.
// X's API rejects requests without it; it identifies the official web client, while
// user auth comes from the session cookies carried by credentials: "include".
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const MAX_ACTIVE = 3;
const TICK_MS = 500;
const RESET_FALLBACK_MS = 15 * 60 * 1000;

type HttpMethod = "GET" | "POST";

const resetMs = (response: Response) => {
  const header = response.headers.get("x-rate-limit-reset");
  if (header === null) return null;
  const seconds = Number(header);
  const isSane = Number.isFinite(seconds) && seconds > 0;
  if (!isSane) return null;
  return seconds * 1000;
};

const ResponseSchema = z.object({
  data: z
    .object({
      user_result_by_screen_name: z
        .object({
          result: z
            .object({
              about_profile: z
                .object({
                  account_based_in: z.string().nullish(),
                })
                .nullish(),
              legacy: z
                .object({
                  location: z.string().nullish(),
                })
                .nullish(),
            })
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

const csrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
  return match === null ? "" : decodeURIComponent(match[1]!);
};

export class CountryApi {
  private readonly queue = new Set<string>();
  private readonly inflight = new Map<string, Promise<ProfileSignal | null>>();
  private active = 0;
  private cooldownUntil = 0;
  private method: HttpMethod = "GET";
  private queryId = DEFAULT_QUERY_ID;
  private timer: ReturnType<typeof setTimeout> | null = null;
  onCooldownEnd: (() => void) | null = null;

  constructor(private readonly onResult: (handle: string, signal: ProfileSignal | null) => void) {}

  enqueue(handle: string) {
    if (this.inflight.has(handle)) return;
    this.queue.add(handle);
    this.schedule();
  }

  private schedule() {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.drain();
    }, TICK_MS);
  }

  private drain() {
    if (this.isCoolingDown()) {
      this.scheduleCooldown();
      return;
    }
    while (this.active < MAX_ACTIVE && this.queue.size > 0) {
      const handle = this.queue.values().next().value;
      if (handle === undefined) break;
      this.queue.delete(handle);
      this.active++;
      void this.request(handle).finally(() => {
        this.active--;
        this.schedule();
      });
    }
  }

  private scheduleCooldown() {
    if (this.timer !== null) return;
    const wait = Math.max(this.cooldownUntil - Date.now(), 0);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onCooldownEnd?.();
      this.drain();
    }, wait);
  }

  private isCoolingDown() {
    return Date.now() < this.cooldownUntil;
  }

  private async request(handle: string) {
    const existing = this.inflight.get(handle);
    if (existing !== undefined) return existing;
    const promise = this.fetch(handle).finally(() => this.inflight.delete(handle));
    this.inflight.set(handle, promise);
    const signal = await promise;
    this.onResult(handle, signal);
    return signal;
  }

  private async fetch(handle: string) {
    while (true) {
      const url = `https://x.com/i/api/graphql/${this.queryId}/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({ screenName: handle }))}`;
      const response = await fetch(url, {
        method: this.method,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${BEARER}`,
          "X-Csrf-Token": csrfToken(),
        },
      });
      const isRateLimited = response.status === 429;
      if (isRateLimited) {
        const flippedToPost = this.method === "GET";
        if (flippedToPost) {
          this.method = "POST";
          this.queue.add(handle);
          return null;
        }
        this.method = "GET";
        const reset = resetMs(response);
        this.cooldownUntil = reset ?? Date.now() + RESET_FALLBACK_MS;
        this.queue.clear();
        this.scheduleCooldown();
        return null;
      }
      const isStaleQuery = response.status === 400 || response.status === 404;
      if (isStaleQuery) {
        const healed = await this.healQueryId();
        if (!healed) return null;
        continue;
      }
      const parsed = ResponseSchema.safeParse(await response.json());
      if (!parsed.success) return null;
      const result = parsed.data.data?.user_result_by_screen_name?.result;
      return {
        basedIn: result?.about_profile?.account_based_in ?? null,
        location: result?.legacy?.location ?? null,
      };
    }
  }

  private async healQueryId() {
    const scripts = [...document.querySelectorAll<HTMLScriptElement>("script[src]")];
    for (const script of scripts) {
      const found = await this.scanBundle(script.src);
      if (found !== null) {
        const isSame = found === this.queryId;
        if (isSame) return false;
        this.queryId = found;
        return true;
      }
    }
    return false;
  }

  private async scanBundle(src: string) {
    try {
      const text = await (await fetch(src)).text();
      const match = text.match(/graphql\/([A-Za-z0-9_-]{22})\/AboutAccountQuery/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
