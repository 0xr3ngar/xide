export interface ShimHit {
    handle: string;
    location: string | null;
    basedIn: string | null;
}

export const collectHits = (json: unknown) => {
    const out: ShimHit[] = [];
    walk(json, out, new Set<object>());
    return out;
};

const walk = (node: unknown, out: ShimHit[], seen: Set<object>) => {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
        for (const item of node) walk(item, out, seen);
        return;
    }
    const obj = node as Record<string, unknown>;
    const legacy = obj.legacy as Record<string, unknown> | undefined;
    if (legacy !== undefined) {
        const about = obj.about_profile as Record<string, unknown> | undefined;
        pushHit(out, legacy.screen_name, legacy.location, about?.account_based_in);
    }
    for (const value of Object.values(obj)) walk(value, out, seen);
};

const pushHit = (out: ShimHit[], handle: unknown, location: unknown, basedIn: unknown) => {
    const isHandle = typeof handle === "string" && handle.length > 0;
    if (!isHandle) return;
    out.push({
        handle,
        location: typeof location === "string" && location.length > 0 ? location : null,
        basedIn: typeof basedIn === "string" && basedIn.length > 0 ? basedIn : null,
    });
};
