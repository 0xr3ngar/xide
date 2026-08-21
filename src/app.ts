import { AuthorCache } from "./xapi/cache";
import { CountryApi } from "./xapi/api";
import {
    createFeedObserver,
    getAuthorHandle,
    hideArticle,
    isHandled,
    showArticle,
    visibleArticles,
} from "./ui/dom";
import { resolveSignal } from "./xapi/resolve";
import { createStorage } from "./xapi/storage";
import {
    DEFAULT_SETTINGS,
    SettingsSchema,
    type AuthorEntry,
    type Settings,
    type UiStats,
} from "./types";
import type { ShimHit } from "./intercept";
import { mountUi } from "./ui";

interface XideApi {
    stats(): UiStats;
    settings(): Settings;
}

declare global {
    var __xide: XideApi | undefined;
}

const waitForBody = () => {
    return new Promise<HTMLElement>((resolve) => {
        const hasBody = document.body !== null;
        if (hasBody) {
            resolve(document.body);
            return;
        }
        const probe = new MutationObserver(() => {
            const body = document.body;
            if (body === null) return;
            probe.disconnect();
            resolve(body);
        });
        probe.observe(document.documentElement, { childList: true, subtree: true });
    });
};

const loadSettings = async (storage: ReturnType<typeof createStorage>) => {
    const stored = await storage.get("settings", SettingsSchema);
    return stored ?? { ...DEFAULT_SETTINGS };
};

export const startXide = async () => {
    const body = await waitForBody();
    const storage = createStorage();
    const cache = new AuthorCache(storage);
    const settings = await loadSettings(storage);
    let current = settings;

    const saveSettings = async (next: Settings) => {
        current = next;
        await storage.set("settings", next);
        reapplyAll();
    };

    const stats = () => ({
        hidden: current.hiddenCount,
        blockedCount: current.blocked.length,
        counts: current.counts,
    });

    const api = new CountryApi(async (handle, signal) => {
        const country = signal === null ? null : resolveSignal(signal);
        const entry: AuthorEntry = { country, ts: Date.now() };
        await cache.set(handle, entry);
        for (const article of visibleArticles()) {
            const isAuthor = getAuthorHandle(article)?.toLowerCase() === handle;
            if (isAuthor) void applyVerdict(article);
        }
    });

    const applyVerdict = async (article: HTMLElement) => {
        const rawHandle = getAuthorHandle(article);
        if (rawHandle === null) {
            showArticle(article);
            return;
        }
        const handle = rawHandle.toLowerCase();
        const isAllowed = current.allowlist.includes(handle);
        if (isAllowed) {
            showArticle(article);
            return;
        }
        const entry = await cache.get(handle);
        if (entry === null) {
            showArticle(article);
            api.enqueue(handle);
            return;
        }
        const isStale = cache.isStale(entry);
        if (isStale) api.enqueue(handle);
        const country = entry.country;
        const isBlockedCountry = country !== null && current.blocked.includes(country);
        if (isBlockedCountry) {
            const wasHidden = article.dataset.xide === "hidden";
            if (!wasHidden) {
                current.hiddenCount++;
                current.counts[country] = (current.counts[country] ?? 0) + 1;
                await storage.set("settings", current);
            }
            hideArticle(article);
            return;
        }
        showArticle(article);
    };

    const processNew = (articles: HTMLElement[]) => {
        for (const article of articles) {
            const handled = isHandled(article);
            if (handled) continue;
            void applyVerdict(article);
        }
    };

    const reapplyAll = () => {
        for (const article of visibleArticles()) void applyVerdict(article);
    };

    const handleShimEntries = async (entries: ShimHit[]) => {
        const articlesByHandle = new Map<string, HTMLElement[]>();
        for (const article of visibleArticles()) {
            const rawHandle = getAuthorHandle(article);
            if (rawHandle === null) continue;
            const handle = rawHandle.toLowerCase();
            const group = articlesByHandle.get(handle) ?? [];
            group.push(article);
            articlesByHandle.set(handle, group);
        }
        for (const entry of entries) {
            const handle = entry.handle.toLowerCase();
            const existing = await cache.get(handle);
            const country = resolveSignal({ basedIn: entry.basedIn, location: entry.location });
            if (country !== null) {
                await cache.set(handle, { country, ts: Date.now() });
                const articles = articlesByHandle.get(handle) ?? [];
                for (const article of articles) void applyVerdict(article);
                continue;
            }
            const needsApi =
                existing === null || (existing.country === null && cache.isStale(existing));
            if (needsApi) api.enqueue(handle);
            if (existing === null) await cache.set(handle, { country: null, ts: Date.now() });
        }
    };

    const onShimMessage = (event: MessageEvent) => {
        const data = event.data as { source?: string; hits?: ShimHit[] } | null;
        const isShim = data !== null && data.source === "xide-shim" && Array.isArray(data.hits);
        if (!isShim) return;
        void handleShimEntries((data as { hits: ShimHit[] }).hits);
    };

    createFeedObserver(processNew, body);
    reapplyAll();
    api.onCooldownEnd = () => void reapplyAll();
    window.addEventListener("message", onShimMessage);
    mountUi({ settings: () => current, saveSettings, stats });

    globalThis.__xide = { stats, settings: () => current };
};
