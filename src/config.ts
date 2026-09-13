import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlanConfig } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const config: PlanConfig = JSON.parse(
  readFileSync(join(root, "config/plan.json"), "utf8"),
) as PlanConfig;

export const projectRoot = root;
