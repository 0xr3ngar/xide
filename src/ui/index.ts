import panelHtml from "./panel.html" with { type: "text" };
import { COUNTRIES } from "../data/countries";
import type { UiContext } from "../types";

const BUTTON_ID = "xide-button";
const SEARCH_ID = "xide-search";
const DROP_ID = "xide-drop";
const CHIPS_ID = "xide-chips";
const STATS_ID = "xide-stats";
const ALLOW_INPUT_ID = "xide-allow-input";
const ALLOW_CHIPS_ID = "xide-allow-chips";

const plural = (n: number, one: string, many: string) => {
    return n === 1 ? one : many;
};

const createButton = (onClick: () => void) => {
    const button = document.createElement("div");
    button.id = BUTTON_ID;
    const icon = document.createElement("span");
    icon.className = "xide-icon";
    const label = document.createElement("span");
    label.className = "xide-label";
    label.textContent = "Xide";
    button.append(icon, label);
    button.addEventListener("click", onClick);
    return button;
};

const createChip = (
    label: string,
    count: number | null,
    onRemove: () => void,
    removeLabel: string,
) => {
    const chip = document.createElement("div");
    chip.className = "xide-chip";
    const name = document.createElement("span");
    name.textContent = label;
    chip.appendChild(name);
    if (count !== null && count > 0) {
        const countEl = document.createElement("span");
        countEl.className = "xide-chip-count";
        countEl.textContent = String(count);
        chip.appendChild(countEl);
    }
    const remove = document.createElement("button");
    remove.className = "xide-chip-x";
    remove.textContent = "×";
    remove.setAttribute("aria-label", removeLabel);
    remove.addEventListener("click", onRemove);
    chip.appendChild(remove);
    return chip;
};

const renderCountryChips = (container: HTMLElement, ctx: UiContext) => {
    container.replaceChildren();
    const blocked = ctx.settings().blocked;
    if (blocked.length === 0) {
        const hint = document.createElement("div");
        hint.className = "xide-hint";
        hint.textContent = "No countries blocked yet. Search above to add one.";
        container.appendChild(hint);
        return;
    }
    for (const code of blocked) {
        const country = COUNTRIES.find((c) => c.code === code);
        const name = country?.name ?? code;
        const count = ctx.settings().counts[code] ?? 0;
        const chip = createChip(
            name,
            count,
            () => {
                const next = {
                    ...ctx.settings(),
                    blocked: ctx.settings().blocked.filter((c) => c !== code),
                };
                ctx.saveSettings(next);
            },
            `Allow posts from ${name}`,
        );
        container.appendChild(chip);
    }
};

const renderAllowChips = (container: HTMLElement, ctx: UiContext) => {
    container.replaceChildren();
    for (const handle of ctx.settings().allowlist) {
        const chip = createChip(
            `@${handle}`,
            null,
            () => {
                const next = {
                    ...ctx.settings(),
                    allowlist: ctx.settings().allowlist.filter((h) => h !== handle),
                };
                ctx.saveSettings(next);
            },
            `Stop always showing @${handle}`,
        );
        container.appendChild(chip);
    }
};

const renderStats = (el: HTMLElement, ctx: UiContext) => {
    const stats = ctx.stats();
    const text = `${stats.hidden} ${plural(stats.hidden, "post", "posts")} refused · ${stats.blockedCount} ${plural(stats.blockedCount, "country", "countries")} blocked`;
    el.textContent = text;
};

const searchMatches = (query: string, ctx: UiContext) => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    const blocked = new Set(ctx.settings().blocked);
    return COUNTRIES.filter((c) => !blocked.has(c.code) && c.name.toLowerCase().includes(q)).slice(
        0,
        6,
    );
};

const renderDropdown = (
    drop: HTMLElement,
    matches: { code: string; name: string }[],
    onPick: (code: string) => void,
    rect: { top: number; left: number; width: number } | null,
) => {
    drop.replaceChildren();
    if (rect !== null) {
        drop.style.top = `${rect.top + 6}px`;
        drop.style.left = `${rect.left}px`;
        drop.style.width = `${rect.width}px`;
    }
    if (matches.length === 0) {
        const miss = document.createElement("div");
        miss.className = "xide-opt-miss";
        miss.textContent = "No countries match.";
        drop.appendChild(miss);
        return;
    }
    for (const country of matches) {
        const opt = document.createElement("button");
        opt.className = "xide-opt";
        opt.textContent = country.name;
        opt.setAttribute("role", "option");
        opt.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            onPick(country.code);
        });
        drop.appendChild(opt);
    }
};

const closeModal = () => {
    const modal = document.getElementById("xide-modal");
    if (modal !== null) modal.remove();
};

const requireIn = <T extends Element>(root: Element, selector: string) => {
    const el = root.querySelector<T>(selector);
    if (el === null) return null;
    return el;
};

const createPanel = (ctx: UiContext) => {
    const root = document.createElement("div");
    const parsed = new DOMParser().parseFromString(String(panelHtml), "text/html");
    const modal = parsed.body.firstElementChild;
    if (!(modal instanceof HTMLElement)) return null;
    const stats = requireIn<HTMLElement>(modal, `#${STATS_ID}`);
    const search = requireIn<HTMLInputElement>(modal, `#${SEARCH_ID}`);
    const drop = requireIn<HTMLElement>(modal, `#${DROP_ID}`);
    const chips = requireIn<HTMLElement>(modal, `#${CHIPS_ID}`);
    const allowInput = requireIn<HTMLInputElement>(modal, `#${ALLOW_INPUT_ID}`);
    const allowChips = requireIn<HTMLElement>(modal, `#${ALLOW_CHIPS_ID}`);
    const closeBtn = requireIn<HTMLButtonElement>(modal, ".xide-close");
    if (
        stats === null ||
        search === null ||
        drop === null ||
        chips === null ||
        allowInput === null ||
        allowChips === null ||
        closeBtn === null
    )
        return null;

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("pointerdown", (event) => {
        const isBackdrop = event.target === modal;
        if (isBackdrop) closeModal();
    });

    const pick = (code: string) => {
        const isBlocked = ctx.settings().blocked.includes(code);
        if (isBlocked) return;
        ctx.saveSettings({ ...ctx.settings(), blocked: [...ctx.settings().blocked, code] });
        search.value = "";
        drop.hidden = true;
        renderDropdown(drop, [], pick, null);
        renderCountryChips(chips, ctx);
        renderStats(stats, ctx);
        search.focus();
    };

    search.addEventListener("input", () => {
        const matches = searchMatches(search.value, ctx);
        const hasQuery = search.value.trim().length > 0;
        drop.hidden = !hasQuery;
        if (!hasQuery) {
            renderDropdown(drop, [], pick, null);
            return;
        }
        const rect = search.getBoundingClientRect();
        renderDropdown(drop, matches, pick, {
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
        });
    });

    search.addEventListener("keydown", (event) => {
        const isEnter = event.key === "Enter";
        if (!isEnter) return;
        const matches = searchMatches(search.value, ctx);
        const first = matches[0];
        if (first === undefined) return;
        pick(first.code);
    });

    allowInput.addEventListener("keydown", (event) => {
        const isEnter = event.key === "Enter";
        if (!isEnter) return;
        event.preventDefault();
        const handles = allowInput.value
            .split(/[\s,]+/)
            .map((h) => h.trim().replace(/^@/, "").toLowerCase())
            .filter(Boolean);
        if (handles.length === 0) return;
        const merged = [...new Set([...ctx.settings().allowlist, ...handles])];
        ctx.saveSettings({ ...ctx.settings(), allowlist: merged });
        allowInput.value = "";
        renderAllowChips(allowChips, ctx);
    });

    const timer = setInterval(() => {
        const stillOpen = document.getElementById("xide-modal") !== null;
        if (!stillOpen) {
            clearInterval(timer);
            return;
        }
        renderStats(stats, ctx);
        renderCountryChips(chips, ctx);
    }, 1500);

    renderStats(stats, ctx);
    renderCountryChips(chips, ctx);
    renderAllowChips(allowChips, ctx);
    return modal;
};

const openModal = (ctx: UiContext) => {
    const existing = document.getElementById("xide-modal");
    if (existing !== null) {
        existing.remove();
        return;
    }
    const modal = createPanel(ctx);
    if (modal === null) return;
    document.body.appendChild(modal);
    const search = requireIn<HTMLInputElement>(modal, `#${SEARCH_ID}`);
    if (search !== null) search.focus();
};

const ensureButton = (button: HTMLElement) => {
    const alreadyPlaced = document.getElementById(BUTTON_ID) !== null;
    if (alreadyPlaced) return;
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const notifications =
        nav?.querySelector('a[href="/notifications"]') ??
        nav?.querySelector('[data-testid="AppTabBar_Notifications_Link"]') ??
        null;
    if (notifications !== null) {
        notifications.insertAdjacentElement("afterend", button);
        return;
    }
    if (nav !== null) {
        nav.appendChild(button);
        return;
    }
};

export const mountUi = (ctx: UiContext) => {
    document.addEventListener("keydown", (event) => {
        const isEscape = event.key === "Escape";
        if (isEscape) closeModal();
    });
    const button = createButton(() => openModal(ctx));
    ensureButton(button);
    const watcher = new MutationObserver(() => {
        const wasRemoved = document.getElementById(BUTTON_ID) === null;
        if (wasRemoved) ensureButton(button);
    });
    watcher.observe(document.body, { childList: true, subtree: true });
};
