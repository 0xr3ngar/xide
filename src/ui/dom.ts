const TWEET_SELECTOR = 'article[data-testid="tweet"]';

const RESERVED_PATHS = new Set([
    "home",
    "explore",
    "notifications",
    "messages",
    "search",
    "settings",
    "i",
    "topics",
    "lists",
    "bookmarks",
    "communitynotes",
    "communities",
    "jobs",
    "grok",
    "verified",
]);

const cleanHandle = (segment: string) => {
    const isReserved = RESERVED_PATHS.has(segment);
    if (isReserved) return null;
    return segment;
};

export const getAuthorHandle = (article: HTMLElement) => {
    const authorLink = article.querySelector<HTMLAnchorElement>(
        'div[data-testid="User-Name"] a[href^="/"][role="link"]',
    );
    const href = authorLink?.getAttribute("href") ?? null;
    if (href === null) return null;
    const segment = href.split("/").filter(Boolean)[0];
    if (segment === undefined) return null;
    return cleanHandle(segment);
};

export const hideArticle = (article: HTMLElement) => {
    article.style.display = "none";
    article.dataset.xide = "hidden";
};

export const showArticle = (article: HTMLElement) => {
    article.style.display = "";
    article.dataset.xide = "visible";
};

export const isHandled = (article: HTMLElement) => {
    return article.dataset.xide !== undefined;
};

export const visibleArticles = () => {
    return [...document.querySelectorAll<HTMLElement>(TWEET_SELECTOR)];
};

export const createFeedObserver = (onNew: (articles: HTMLElement[]) => void, root: HTMLElement) => {
    const observer = new MutationObserver((mutations) => {
        const articles: HTMLElement[] = [];
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.matches(TWEET_SELECTOR)) articles.push(node);
                    articles.push(...node.querySelectorAll<HTMLElement>(TWEET_SELECTOR));
                }
            }
        }
        const unique = [...new Set(articles)];
        if (unique.length > 0) onNew(unique);
    });
    observer.observe(root, { childList: true, subtree: true });
    return observer;
};
