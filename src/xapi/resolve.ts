import { COUNTRIES, COUNTRY_ALIASES, CITY_COUNTRY } from "../data/countries";
import type { ProfileSignal } from "../types";

const COUNTRY_BY_NAME: Record<string, string> = Object.fromEntries([
    ...COUNTRIES.map((c) => [c.name.toLowerCase(), c.code]),
    ...COUNTRIES.map((c) => [c.code.toLowerCase(), c.code]),
]);

const normalize = (value: string) => {
    return value
        .trim()
        .toLowerCase()
        .replace(/^the\s+/, "")
        .replace(/\s+/g, " ");
};

const lookup = (value: string) => {
    return COUNTRY_BY_NAME[value] ?? COUNTRY_ALIASES[value] ?? CITY_COUNTRY[value];
};

const resolve = (value: string | null) => {
    if (value === null) return null;
    const normalized = normalize(value);
    if (normalized.length === 0) return null;
    const direct = lookup(normalized);
    if (direct !== undefined) return direct;
    for (const part of normalized.split(",")) {
        const code = lookup(part.trim());
        if (code !== undefined) return code;
    }
    return null;
};

export const resolveSignal = (signal: ProfileSignal) => {
    const basedIn = signal.basedIn === null ? null : resolve(signal.basedIn);
    if (basedIn !== null) return basedIn;
    return resolve(signal.location);
};
