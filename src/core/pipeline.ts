import {
  existsSync,
  globSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { schoolIndexHtml, rootIndexHtml } from "./html.ts";
import { classSlug } from "./slug.ts";
import { toIcs } from "./toIcs.ts";
import type {
  CalendarFeed,
  SchoolAdapter,
  SchoolPayload,
} from "./types.ts";

export type GenerateOptions = {
  outputDir: string;
  className?: string;
  groupId?: string;
};

export type GenerateResult = {
  adapter: SchoolAdapter;
  source: string;
  validFrom: string;
  feeds: CalendarFeed[];
  written: string[];
};

function cleanSchoolIcs(outputDir: string, schoolId: string): void {
  const schoolDir = join(outputDir, schoolId);
  if (!existsSync(schoolDir)) return;
  for (const file of globSync("**/*.ics", { cwd: schoolDir })) {
    rmSync(join(schoolDir, file));
  }
}

function matchesClass(feed: CalendarFeed, className: string): boolean {
  return (
    feed.className.toLowerCase() === className.toLowerCase() ||
    feed.classLabel.toLowerCase().startsWith(className.toLowerCase())
  );
}

export function filterFeeds(
  feeds: CalendarFeed[],
  options: { className?: string; groupId?: string },
): CalendarFeed[] {
  return feeds.filter((feed) => {
    if (options.className && !matchesClass(feed, options.className)) return false;
    if (options.groupId && feed.groupId !== options.groupId) return false;
    return true;
  });
}

export async function generateSchool(
  adapter: SchoolAdapter,
  payload: SchoolPayload,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const allFeeds = await adapter.parse(payload);
  const feeds = filterFeeds(allFeeds, options);
  if (feeds.length === 0) {
    throw new Error(
      options.className || options.groupId
        ? `Nie znaleziono kalendarzy dla ${adapter.displayName}` +
          (options.className ? ` klasa ${options.className}` : "") +
          (options.groupId ? ` grupa ${options.groupId}` : "")
        : `Nie znaleziono żadnej klasy w planie ${adapter.displayName}`,
    );
  }

  mkdirSync(options.outputDir, { recursive: true });
  const filtered = Boolean(options.className || options.groupId);
  if (!filtered) cleanSchoolIcs(options.outputDir, adapter.id);

  const written: string[] = [];
  for (const feed of feeds) {
    const ics = toIcs(feed, {
      planStart: payload.validFrom,
      schoolId: adapter.id,
      displayName: adapter.displayName,
      config: adapter.config,
    });
    const classDir = join(
      options.outputDir,
      adapter.id,
      classSlug(feed.className),
    );
    mkdirSync(classDir, { recursive: true });
    const outputPath = join(classDir, `${feed.groupId}.ics`);
    writeFileSync(outputPath, ics, "utf8");
    written.push(outputPath);
    console.error(
      `Zapisano ${feed.lessons.length} lekcji ${feed.title} → ${outputPath}`,
    );
  }

  if (!filtered) {
    writeFileSync(
      join(options.outputDir, adapter.id, "index.html"),
      schoolIndexHtml(adapter, feeds),
      "utf8",
    );
  }

  return {
    adapter,
    source: payload.source,
    validFrom: payload.validFrom,
    feeds,
    written,
  };
}

export function writeRootIndex(
  outputDir: string,
  results: GenerateResult[],
): void {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, ".nojekyll"), "");
  writeFileSync(
    join(outputDir, "index.html"),
    rootIndexHtml(
      results.map((result) => ({
        adapter: result.adapter,
        feedCount: result.feeds.length,
      })),
    ),
    "utf8",
  );
}
