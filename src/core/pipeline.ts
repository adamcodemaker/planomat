import {
  existsSync,
  globSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { calendarIndexHtml, rootIndexHtml } from "./html.ts";
import { pathSlug } from "./slug.ts";
import { toIcs } from "./toIcs.ts";
import type {
  CalendarAdapter,
  CalendarFeed,
  SourcePayload,
} from "./types.ts";

export type GenerateOptions = {
  outputDir: string;
  path?: string;
};

export type GenerateResult = {
  adapter: CalendarAdapter;
  source: string;
  validFrom: string;
  feeds: CalendarFeed[];
  written: string[];
};

function assertSafePath(segments: string[]): string[] {
  if (segments.length === 0) {
    throw new Error("Feed kalendarza musi mieć niepustą ścieżkę");
  }
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("/")) {
      throw new Error(`Nieprawidłowy segment ścieżki kalendarza: ${segment}`);
    }
  }
  return segments;
}

function feedPath(feed: CalendarFeed): string[] {
  return assertSafePath(feed.path.map(pathSlug));
}

function matchesPath(feed: CalendarFeed, pathFilter: string): boolean {
  const filter = pathFilter
    .split("/")
    .filter(Boolean)
    .map(pathSlug);
  if (filter.length === 0) return true;
  const segments = feedPath(feed);
  return filter.every((segment, index) => segments[index] === segment);
}

function cleanCalendarIcs(outputDir: string, calendarId: string): void {
  const calendarDir = join(outputDir, calendarId);
  if (!existsSync(calendarDir)) return;
  for (const file of globSync("**/*.ics", { cwd: calendarDir })) {
    rmSync(join(calendarDir, file));
  }
}

export function filterFeeds(
  feeds: CalendarFeed[],
  options: { path?: string },
): CalendarFeed[] {
  return feeds.filter((feed) => {
    if (options.path && !matchesPath(feed, options.path)) return false;
    return true;
  });
}

export async function generateCalendar(
  adapter: CalendarAdapter,
  payload: SourcePayload,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const allFeeds = await adapter.parse(payload);
  const feeds = filterFeeds(allFeeds, options);
  if (feeds.length === 0) {
    throw new Error(
      options.path
        ? `Nie znaleziono kalendarzy dla ${adapter.displayName} (ścieżka ${options.path})`
        : `Nie znaleziono żadnego kalendarza w ${adapter.displayName}`,
    );
  }

  mkdirSync(options.outputDir, { recursive: true });
  const filtered = Boolean(options.path);
  if (!filtered) cleanCalendarIcs(options.outputDir, adapter.id);

  const written: string[] = [];
  for (const feed of feeds) {
    const ics = toIcs(feed, {
      planStart: payload.validFrom,
      calendarId: adapter.id,
      displayName: adapter.displayName,
      config: adapter.config,
    });
    const segments = feedPath(feed);
    const dir = join(options.outputDir, adapter.id, ...segments.slice(0, -1));
    mkdirSync(dir, { recursive: true });
    const outputPath = join(dir, `${segments.at(-1)}.ics`);
    writeFileSync(outputPath, ics, "utf8");
    written.push(outputPath);
    console.error(
      `Zapisano ${feed.events.length} wydarzeń ${feed.title} → ${outputPath}`,
    );
  }

  if (!filtered) {
    writeFileSync(
      join(options.outputDir, adapter.id, "index.html"),
      calendarIndexHtml(adapter, feeds),
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
