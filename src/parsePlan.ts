import ExcelJS from "exceljs";
import { config } from "./config.ts";
import type { Lesson, LessonVariant, ParseResult, Weekday } from "./types.ts";

const LESSON_ROW_RE =
  /^\s*(\d+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;

const CLASS_HEADER_RE = /^\d{1,2}[A-Ha-h]\b/;

const DAY_NAMES: Record<string, Weekday> = {
  poniedziałek: 1,
  wtorek: 2,
  środa: 3,
  czwartek: 4,
  piątek: 5,
};

const WEEKDAY_LABEL: Record<Weekday, string> = {
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
};

function cellText(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return (record.richText as { text?: string }[])
        .map((part) => part.text ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }
    if (typeof record.text === "string") return record.text.replace(/\s+/g, " ").trim();
    if (typeof record.result === "string" || typeof record.result === "number") {
      return String(record.result).replace(/\s+/g, " ").trim();
    }
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function sheetToGrid(worksheet: ExcelJS.Worksheet): string[][] {
  const grid: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellText(cell.value);
    });
    grid[rowNumber - 1] = cells;
  });
  return grid;
}

function getCell(grid: string[][], row: number, col: number): string {
  return grid[row]?.[col] ?? "";
}

function normalizeTime(raw: string): string {
  const [hours, minutes] = raw.split(":");
  return `${hours.padStart(2, "0")}:${minutes}`;
}

function isClassHeader(text: string): boolean {
  return CLASS_HEADER_RE.test(text);
}

function matchesClass(text: string, className: string): boolean {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\b`, "i").test(text);
}

type DayColumn = {
  weekday: Weekday;
  n: number;
  p: number;
  s: number;
};

function findDayColumns(grid: string[][], headerRow: number): DayColumn[] {
  const npsRow = headerRow + 1;
  const days: DayColumn[] = [];
  const width = Math.max(
    grid[headerRow]?.length ?? 0,
    grid[npsRow]?.length ?? 0,
    16,
  );

  for (let col = 0; col < width - 2; col++) {
    const n = getCell(grid, npsRow, col);
    const p = getCell(grid, npsRow, col + 1);
    const s = getCell(grid, npsRow, col + 2);
    if (n !== "N" || p !== "P" || s !== "S") continue;

    const dayRaw = getCell(grid, headerRow, col).toLowerCase();
    const weekday = DAY_NAMES[dayRaw];
    if (!weekday) continue;

    days.push({ weekday, n: col, p: col + 1, s: col + 2 });
    col += 2;
  }

  return days;
}

function parseLessonRow(
  text: string,
): { lessonNo: number; start: string; end: string } | null {
  const match = text.match(LESSON_ROW_RE);
  if (!match) return null;
  return {
    lessonNo: Number(match[1]),
    start: normalizeTime(match[2]),
    end: normalizeTime(match[3]),
  };
}

function extractGroup(subjectRaw: string): string | undefined {
  const match = subjectRaw.match(/-(\d\/\d)\s*$/);
  return match?.[1];
}

function displaySubject(subjectRaw: string): string {
  const base = subjectRaw.replace(/-\d\/\d\s*$/, "").trim();
  return config.subjectAliases[base] ?? base;
}

function displayRoom(room: string): string {
  return config.roomAliases[room] ?? (room ? `sala ${room}` : "");
}

export function pickVariant(variants: LessonVariant[]): LessonVariant | null {
  const nonempty = variants.filter((v) => v.subjectRaw);
  if (nonempty.length === 0) return null;

  const group1 = nonempty.filter((v) => /1\/2/.test(v.subjectRaw));
  if (group1.length > 0) return group1[0];

  const noGroup = nonempty.filter((v) => !/\d\/\d/.test(v.subjectRaw));
  if (noGroup.length > 0) return noGroup[0];

  return null;
}

function readVariant(grid: string[][], row: number, day: DayColumn): LessonVariant | null {
  const teacher = getCell(grid, row, day.n);
  const subjectRaw = getCell(grid, row, day.p);
  const room = getCell(grid, row, day.s);
  if (!subjectRaw) return null;
  return { teacher, subjectRaw, room };
}

export async function parsePlan(
  input: Buffer | string,
  className = config.className,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  if (typeof input === "string") {
    await workbook.xlsx.readFile(input);
  } else {
    await workbook.xlsx.load(input as unknown as ExcelJS.Buffer);
  }

  const worksheet =
    workbook.worksheets.find((sheet) => /plan/i.test(sheet.name)) ??
    workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Brak arkusza w pliku XLSX");
  }

  const grid = sheetToGrid(worksheet);
  let classRow = -1;
  let classLabel = "";

  for (let row = 0; row < grid.length; row++) {
    const text = getCell(grid, row, 0);
    if (isClassHeader(text) && matchesClass(text, className)) {
      classRow = row;
      classLabel = text;
      break;
    }
  }

  if (classRow < 0) {
    throw new Error(`Nie znaleziono klasy ${className} w planie`);
  }

  const dayColumns = findDayColumns(grid, classRow + 1);
  if (dayColumns.length === 0) {
    throw new Error(`Nie znaleziono kolumn N/P/S dla ${classLabel}`);
  }

  type Slot = {
    lessonNo: number;
    start: string;
    end: string;
    variants: Map<Weekday, LessonVariant[]>;
  };

  const slots: Slot[] = [];
  let current: Slot | null = null;

  for (let row = classRow + 3; row < grid.length; row++) {
    const first = getCell(grid, row, 0);
    if (isClassHeader(first) && row > classRow) break;

    const parsed = parseLessonRow(first);
    if (parsed) {
      const bells = config.bells[String(parsed.lessonNo)];
      current = {
        lessonNo: parsed.lessonNo,
        start: bells?.[0] ?? parsed.start,
        end: bells?.[1] ?? parsed.end,
        variants: new Map(),
      };
      slots.push(current);
    } else if (!current) {
      continue;
    }

    for (const day of dayColumns) {
      const variant = readVariant(grid, row, day);
      if (!variant || !current) continue;
      const list = current.variants.get(day.weekday) ?? [];
      list.push(variant);
      current.variants.set(day.weekday, list);
    }
  }

  const lessons: Lesson[] = [];
  for (const slot of slots) {
    for (const day of dayColumns) {
      const chosen = pickVariant(slot.variants.get(day.weekday) ?? []);
      if (!chosen) continue;
      lessons.push({
        weekday: day.weekday,
        weekdayName: WEEKDAY_LABEL[day.weekday],
        lessonNo: slot.lessonNo,
        start: slot.start,
        end: slot.end,
        subject: displaySubject(chosen.subjectRaw),
        subjectRaw: chosen.subjectRaw,
        teacher: chosen.teacher,
        room: chosen.room,
        roomLabel: displayRoom(chosen.room),
        group: extractGroup(chosen.subjectRaw),
        classLabel,
      });
    }
  }

  lessons.sort((a, b) => a.weekday - b.weekday || a.lessonNo - b.lessonNo);
  return { classLabel, lessons };
}
