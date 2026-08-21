import { readFileSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "..", "dist", "manifest.json"), "utf8"),
) as {
    version: string;
};
console.log(manifest.version);
