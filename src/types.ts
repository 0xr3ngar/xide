import { z } from "zod";

export type CountryCode = string;

export interface ProfileSignal {
  basedIn: string | null;
  location: string | null;
}

export const AuthorEntrySchema = z.object({
  country: z.string().nullable(),
  ts: z.number(),
});

export type AuthorEntry = z.infer<typeof AuthorEntrySchema>;

export const SettingsSchema = z.object({
  blocked: z.array(z.string()),
  allowlist: z.array(z.string()),
  hiddenCount: z.number(),
  counts: z.record(z.string(), z.number()),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  blocked: [],
  allowlist: [],
  hiddenCount: 0,
  counts: {},
};

export interface StorageAdapter {
  get<T>(key: string, schema: z.ZodType<T>): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

export interface UiContext {
  settings(): Settings;
  saveSettings(next: Settings): Promise<void>;
  stats(): UiStats;
}

export interface UiStats {
  hidden: number;
  blockedCount: number;
  counts: Record<string, number>;
}
