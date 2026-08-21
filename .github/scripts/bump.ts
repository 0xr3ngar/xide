import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");

const bump = (path: string) => {
    const file = join(root, path);
    const pkg = JSON.parse(readFileSync(file, "utf8")) as { version: string };
    const [major, minor, patch] = pkg.version.split(".").map(Number);
    const nextPatch = (patch ?? 0) + 1;
    pkg.version = `${major}.${minor}.${nextPatch}`;
    writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
};

bump("manifest.json");
bump("package.json");

const fmt = Bun.spawnSync(["bunx", "oxfmt", "manifest.json", "package.json"]);
if (fmt.exitCode !== 0) process.exit(fmt.exitCode ?? 1);

const bumped = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as { version: string };
console.log(bumped.version);
