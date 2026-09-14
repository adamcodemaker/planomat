import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { generateCalendar, writeRootIndex } from "./core/pipeline.ts";
import type { CalendarAdapter } from "./core/types.ts";
import { getCalendar, listCalendars } from "./calendars/registry.ts";

type Args = {
  fetch: boolean;
  all: boolean;
  input?: string;
  outputDir: string;
  calendarId?: string;
  path?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    fetch: false,
    all: false,
    outputDir: "docs",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fetch") args.fetch = true;
    else if (arg === "--all") args.all = true;
    else if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output-dir") args.outputDir = argv[++i];
    else if (arg === "--calendar") args.calendarId = argv[++i];
    else if (arg === "--path") args.path = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  const calendarIds = listCalendars()
    .map((calendar) => calendar.id)
    .join(", ");
  console.log(`Planomat — konwerter kalendarzy → ICS

Użycie:
  npx tsx src/cli.ts --all --fetch --output-dir docs
  npx tsx src/cli.ts --calendar sp143 --fetch --output-dir docs
  npx tsx src/cli.ts --calendar sp143-rok --fetch --output-dir docs
  npx tsx src/cli.ts --calendar sp143 --input plan.xlsx --output-dir docs

Zapisuje docs/{kalendarz}/{ścieżka}.ics, np. docs/sp143/4b/1.ics.

Opcje:
  --all                Wszystkie zarejestrowane kalendarze
  --calendar <id>      Kalendarz (${calendarIds}; domyślnie sp143)
  --fetch              Pobierz najnowsze dane ze źródła kalendarza
  --input <plik>       Użyj lokalnego pliku (nie łączy się z --all)
  --output-dir <dir>   Katalog ICS (domyślnie docs)
  --path <ścieżka>     Tylko ta ścieżka lub jej prefiks (np. 4b albo 4b/1)
`);
}

function adaptersFromArgs(args: Args): CalendarAdapter[] {
  if (args.all && args.calendarId) {
    throw new Error("Nie łącz --all z --calendar");
  }
  if (args.all && args.input) {
    throw new Error("--input wymaga jednego kalendarza (--calendar), nie --all");
  }
  if (args.all) return listCalendars();
  return [getCalendar(args.calendarId ?? "sp143")];
}

async function payloadFor(
  adapter: CalendarAdapter,
  args: Args,
): Promise<{ source: string; validFrom: string; data: unknown }> {
  if (args.fetch) {
    const payload = await adapter.fetch();
    console.error(
      `Pobrano ${adapter.displayName}: ${payload.source} (od ${payload.validFrom})`,
    );
    return payload;
  }
  if (!adapter.loadFile) {
    throw new Error(
      `${adapter.displayName} nie obsługuje --input (brak loadFile)`,
    );
  }
  const inputPath = resolve(args.input!);
  if (!existsSync(inputPath)) {
    throw new Error(`Nie znaleziono pliku ${inputPath}`);
  }
  return adapter.loadFile(inputPath);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.fetch && !args.input) {
    printHelp();
    process.exit(1);
  }

  const adapters = adaptersFromArgs(args);
  const outputDir = resolve(args.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const adapter of adapters) {
    const payload = await payloadFor(adapter, args);
    const result = await generateCalendar(adapter, payload, {
      outputDir,
      path: args.path,
    });
    results.push(result);
    console.error(`Źródło ${adapter.displayName}: ${result.source}`);
  }

  if (!args.path) {
    writeRootIndex(outputDir, results);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
