import {
  globSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  fetchLatestPlan,
  validFromFromFilename,
} from "./fetchLatestPlan.ts";
import {
  classSlug,
  lessonsForGroup,
  parseWorkbook,
} from "./parsePlan.ts";
import { toIcs } from "./toIcs.ts";
import { GROUPS, type Group } from "./types.ts";

type Args = {
  fetch: boolean;
  input?: string;
  outputDir: string;
  className?: string;
  group?: Group;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    fetch: false,
    outputDir: "docs",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fetch") args.fetch = true;
    else if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output-dir") args.outputDir = argv[++i];
    else if (arg === "--class") args.className = argv[++i];
    else if (arg === "--group") args.group = parseGroup(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function parseGroup(raw: string | undefined): Group {
  if (raw === "1" || raw === "2") return raw;
  throw new Error("Grupa musi być 1 albo 2");
}

function printHelp(): void {
  console.log(`Konwerter planu SP143 → ICS

Użycie:
  npx tsx src/cli.ts --fetch --output-dir docs
  npx tsx src/cli.ts --input plan.xlsx --output-dir docs

Zapisuje docs/{klasa}/{grupa}.ics, np. docs/4b/1.ics i docs/4b/2.ics.

Opcje:
  --fetch              Pobierz najnowszy XLSX ze strony szkoły
  --input <plik>       Użyj lokalnego XLSX
  --output-dir <dir>   Katalog ICS (domyślnie docs)
  --class <nazwa>      Tylko ta klasa (domyślnie wszystkie)
  --group <1|2>        Tylko ta grupa (domyślnie obie)
`);
}

function cleanIcsTree(outputDir: string): void {
  for (const file of globSync("**/*.ics", { cwd: outputDir })) {
    rmSync(join(outputDir, file));
  }
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

  const workbook = await parseWorkbook(buffer);
  const blocks = args.className
    ? workbook.classes.filter(
        (item) => item.className.toLowerCase() === args.className!.toLowerCase(),
      )
    : workbook.classes;
  if (blocks.length === 0) {
    throw new Error(
      args.className
        ? `Nie znaleziono klasy ${args.className} w planie`
        : "Nie znaleziono żadnej klasy w planie",
    );
  }

  const groups = args.group ? [args.group] : GROUPS;
  const outputDir = resolve(args.outputDir);
  mkdirSync(outputDir, { recursive: true });
  if (!args.className && !args.group) {
    cleanIcsTree(outputDir);
  }

  for (const block of blocks) {
    const slug = classSlug(block.className);
    const classDir = join(outputDir, slug);
    mkdirSync(classDir, { recursive: true });

    for (const group of groups) {
      const lessons = lessonsForGroup(block, group);
      const ics = toIcs(lessons, {
        planStart,
        className: block.className,
        group,
      });
      const outputPath = join(classDir, `${group}.ics`);
      writeFileSync(outputPath, ics, "utf8");
      console.error(
        `Zapisano ${lessons.length} lekcji ${block.classLabel} grupa ${group} → ${outputPath}`,
      );
    }
  }

  console.error(`Źródło: ${source}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
