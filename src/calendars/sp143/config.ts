import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sp143Config } from "./types.ts";

const dir = dirname(fileURLToPath(import.meta.url));

export const sp143Config: Sp143Config = JSON.parse(
  readFileSync(join(dir, "config.json"), "utf8"),
) as Sp143Config;
