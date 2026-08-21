import { startXide } from "./app";
import { bootShim } from "./intercept";

interface ExtGlobal {
  browser?: { storage?: unknown };
  chrome?: { storage?: unknown };
}

const boot = () => {
  const g = globalThis as ExtGlobal;
  const isExtensionWorld = g.browser?.storage !== undefined || g.chrome?.storage !== undefined;
  if (!isExtensionWorld) {
    bootShim();
    return;
  }
  const alreadyBooted = globalThis.__xide !== undefined;
  if (alreadyBooted) return;
  void startXide();
}

boot();


