import { collectHits, type ShimHit } from "./harvest";

declare global {
    var __xideShim: boolean | undefined;
}

const GRAPHQL_MARKER = "/i/api/graphql/";

const requestUrl = (input: RequestInfo | URL) => {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.href;
    return input.url;
};

const isGraphql = (url: string) => {
    return url.includes(GRAPHQL_MARKER);
};

const scanText = (text: string) => {
    try {
        const json = JSON.parse(text);
        return collectHits(json);
    } catch {
        return [] as ShimHit[];
    }
};

export const bootShim = () => {
    const alreadyBooted = globalThis.__xideShim === true;
    if (alreadyBooted) return;
    const originalFetch = window.fetch;
    const wrappedFetch = Object.assign((...args: Parameters<typeof originalFetch>) => {
        const request = originalFetch(...args);
        const first = args[0];
        const url = first === undefined ? null : requestUrl(first);
        const shouldScan = url !== null && isGraphql(url);
        if (shouldScan) {
            void request.then((response) => {
                void response
                    .clone()
                    .text()
                    .then((text) => {
                        const hits = scanText(text);
                        const hasHits = hits.length > 0;
                        if (hasHits)
                            window.postMessage({ source: "xide-shim", hits }, location.origin);
                    });
            });
        }
        return request;
    }, originalFetch);
    window.fetch = wrappedFetch;
    globalThis.__xideShim = true;
};
