import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "./config.ts";
import {
  fetchLatestPlan,
  validFromFromFilename,
} from "./fetchLatestPlan.ts";
import { parsePlan } from "./parsePlan.ts";
import { toIcs } from "./toIcs.ts";

type Args = {
  fetch: boolean;
  input?: string;
  output: string;
  className: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    fetch: false,
    output: "docs/plan-4b.ics",
    className: config.className,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fetch") args.fetch = true;
    else if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--class") args.className = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`Konwerter planu SP143 → ICS

Użycie:
  npx tsx src/cli.ts --fetch --output docs/plan-4b.ics
  npx tsx src/cli.ts --input plan.xlsx --output docs/plan-4b.ics

Opcje:
  --fetch           Pobierz najnowszy XLSX ze strony szkoły
  --input <plik>    Użyj lokalnego XLSX
  --output <plik>   Ścieżka ICS (domyślnie docs/plan-4b.ics)
  --class <nazwa>   Klasa (domyślnie ${config.className})
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.fetch && !args.input) {
    printHelp();
    process.exit(1);
  }

  let buffer: Buffer;
  let source: string;
  let planStart: string;

  if (args.fetch) {
    const latest = await fetchLatestPlan();
    buffer = latest.buffer;
    source = latest.url;
    planStart = latest.validFrom;
    console.error(`Pobrano ${latest.url} (od ${latest.validFrom})`);
  } else {
    const inputPath = resolve(args.input!);
    buffer = readFileSync(inputPath);
    source = inputPath;
    planStart = validFromFromFilename(inputPath);
  }

  const parsed = await parsePlan(buffer, args.className);
  const ics = toIcs(parsed.lessons, {
    planStart,
    className: args.className,
  });

  const outputPath = resolve(args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, ics, "utf8");

  console.error(
    `Zapisano ${parsed.lessons.length} lekcji klasy ${parsed.classLabel} → ${outputPath}`,
  );
  for (const lesson of parsed.lessons) {
    console.error(
      `  ${lesson.weekdayName.padEnd(12)} ${String(lesson.lessonNo).padStart(2)} ${lesson.start}-${lesson.end}  ${lesson.subject}  (${lesson.teacher}, ${lesson.roomLabel || lesson.room})`,
    );
  }
  console.error(`Źródło: ${source}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
