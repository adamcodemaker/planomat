import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { generateSchool, writeRootIndex } from "./core/pipeline.ts";
import type { SchoolAdapter } from "./core/types.ts";
import { getSchool, listSchools } from "./schools/registry.ts";

type Args = {
  fetch: boolean;
  all: boolean;
  input?: string;
  outputDir: string;
  schoolId?: string;
  className?: string;
  groupId?: string;
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
    else if (arg === "--school") args.schoolId = argv[++i];
    else if (arg === "--class") args.className = argv[++i];
    else if (arg === "--group") args.groupId = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  const schoolIds = listSchools()
    .map((school) => school.id)
    .join(", ");
  console.log(`Konwerter planu lekcji → ICS

Użycie:
  npx tsx src/cli.ts --all --fetch --output-dir docs
  npx tsx src/cli.ts --school sp143 --fetch --output-dir docs
  npx tsx src/cli.ts --school sp143 --input plan.xlsx --output-dir docs

Zapisuje docs/{szkoła}/{klasa}/{grupa}.ics, np. docs/sp143/4b/1.ics.

Opcje:
  --all                Wszystkie zarejestrowane szkoły
  --school <id>        Szkoła (${schoolIds}; domyślnie sp143)
  --fetch              Pobierz najnowszy plan ze źródła szkoły
  --input <plik>       Użyj lokalnego pliku (nie łączy się z --all)
  --output-dir <dir>   Katalog ICS (domyślnie docs)
  --class <nazwa>      Tylko ta klasa (domyślnie wszystkie)
  --group <id>         Tylko ta grupa (domyślnie wszystkie)
`);
}

function adaptersFromArgs(args: Args): SchoolAdapter[] {
  if (args.all && args.schoolId) {
    throw new Error("Nie łącz --all z --school");
  }
  if (args.all && args.input) {
    throw new Error("--input wymaga jednej szkoły (--school), nie --all");
  }
  if (args.all) return listSchools();
  return [getSchool(args.schoolId ?? "sp143")];
}

async function payloadFor(
  adapter: SchoolAdapter,
  args: Args,
): Promise<{ source: string; validFrom: string; data: unknown }> {
  if (args.fetch) {
    const payload = await adapter.fetch();
    console.error(
      `Pobrano ${adapter.displayName}: ${payload.source} (od ${payload.validFrom})`,
    );
    return payload;
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
    const result = await generateSchool(adapter, payload, {
      outputDir,
      className: args.className,
      groupId: args.groupId,
    });
    results.push(result);
    console.error(`Źródło ${adapter.displayName}: ${result.source}`);
  }

  if (!args.className && !args.groupId) {
    writeRootIndex(outputDir, results);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
