import JSZip from "jszip";
import type { HolidayRange, OneOffEvent } from "../../core/types.ts";
import { pathSlug } from "../../core/slug.ts";
import type { SchoolYearBounds } from "./types.ts";

const MONTH_RE =
  /^(wrzesień|październik|listopad|grudzień|styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień)$/i;

const SKIP_LESSONS_RE =
  /dzień wolny|dni wolne|opiekuńczo-wychowawcz|ferie zimowe|przerwa świąteczna/i;

const UPDATE_RE = /Ostatnia aktualizacja\s*:\s*(\d{1,2})\.(\d{2})\.(\d{4})/i;

const YEAR_IN_NAME_RE = /(\d{4})-(\d{2})/;

const FROM_TO_FULL =
  /od\s+(\d{1,2})\.(\d{2})\.(\d{4})(?:\s*r\.?)?(?:\s*\([^)]*\))?\s+do\s+(\d{1,2})\.(\d{2})\.(\d{4})/i;

const FROM_TO_MONTH_DOT =
  /od\s+(\d{1,2})\.(\d{2})\.?\s+do\s+(\d{1,2})\.(\d{2})\.(\d{4})/i;

const FROM_TO_MONTH =
  /od\s+(\d{1,2})\.(\d{2})\s+do\s+(\d{1,2})\.(\d{2})\.?\s*(\d{4})/i;

const RANGE_DAYS = /(\d{1,2})-(\d{1,2})\.(\d{2})\.(\d{4})/;

const UNTIL = /(?:^|\b)do\s+(\d{1,2})\.(\d{2})\.?\s*(\d{4})/i;

const SINGLE = /(\d{1,2})\.(\d{2})\.(\d{4})/;

export type ParsedYearCalendar = {
  events: OneOffEvent[];
  holidays: HolidayRange[];
  validFrom: string;
  yearLabel: string;
};

type DateSpan = {
  date: string;
  endDate?: string;
};

function decodeXml(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function schoolYearFromSource(source: string): SchoolYearBounds | null {
  const match = source.match(YEAR_IN_NAME_RE);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYearShort = Number(match[2]);
  const endYear = endYearShort < 100 ? 2000 + endYearShort : endYearShort;
  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-08-31`,
    label: `${startYear}/${String(endYear).slice(2)}`,
  };
}

function correctIso(date: string, bounds: SchoolYearBounds | null): string {
  if (!bounds) return date;
  if (date >= bounds.start && date <= bounds.end) return date;
  const [year, month, day] = date.split("-").map(Number);
  const plus = iso(year + 1, month, day);
  const minus = iso(year - 1, month, day);
  if (plus >= bounds.start && plus <= bounds.end) return plus;
  if (minus >= bounds.start && minus <= bounds.end) return minus;
  return date;
}

function normalizeDateText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/do(?=\d)/gi, "do ")
    .replace(/od(?=\d)/gi, "od ")
    .trim();
}

function parseDateSpan(
  raw: string,
  bounds: SchoolYearBounds | null,
): DateSpan | null {
  const text = normalizeDateText(raw);
  if (!text || MONTH_RE.test(text) || /[?]/.test(text)) return null;

  const fromToFull = text.match(FROM_TO_FULL);
  if (fromToFull) {
    const from = correctIso(
      iso(Number(fromToFull[3]), Number(fromToFull[2]), Number(fromToFull[1])),
      bounds,
    );
    const to = correctIso(
      iso(Number(fromToFull[6]), Number(fromToFull[5]), Number(fromToFull[4])),
      bounds,
    );
    return from === to ? { date: from } : { date: from, endDate: to };
  }

  const fromToDot = text.match(FROM_TO_MONTH_DOT);
  if (fromToDot) {
    const endYear = Number(fromToDot[5]);
    const startMonth = Number(fromToDot[2]);
    const endMonth = Number(fromToDot[4]);
    const startYear = startMonth > endMonth ? endYear - 1 : endYear;
    const from = correctIso(iso(startYear, startMonth, Number(fromToDot[1])), bounds);
    const to = correctIso(iso(endYear, endMonth, Number(fromToDot[3])), bounds);
    return from === to ? { date: from } : { date: from, endDate: to };
  }

  const fromToMonth = text.match(FROM_TO_MONTH);
  if (fromToMonth) {
    const endYear = Number(fromToMonth[5]);
    const startMonth = Number(fromToMonth[2]);
    const endMonth = Number(fromToMonth[4]);
    const startYear = startMonth > endMonth ? endYear - 1 : endYear;
    const from = correctIso(
      iso(startYear, startMonth, Number(fromToMonth[1])),
      bounds,
    );
    const to = correctIso(iso(endYear, endMonth, Number(fromToMonth[3])), bounds);
    return from === to ? { date: from } : { date: from, endDate: to };
  }

  const rangeDays = text.match(RANGE_DAYS);
  if (rangeDays) {
    const from = correctIso(
      iso(Number(rangeDays[4]), Number(rangeDays[3]), Number(rangeDays[1])),
      bounds,
    );
    const to = correctIso(
      iso(Number(rangeDays[4]), Number(rangeDays[3]), Number(rangeDays[2])),
      bounds,
    );
    return from === to ? { date: from } : { date: from, endDate: to };
  }

  if (/^\s*do\b/i.test(text)) {
    const until = text.match(UNTIL);
    if (until) {
      return {
        date: correctIso(
          iso(Number(until[3]), Number(until[2]), Number(until[1])),
          bounds,
        ),
      };
    }
  }

  const single = text.match(SINGLE);
  if (single && !/^\s*(od|do)\b/i.test(text)) {
    return {
      date: correctIso(
        iso(Number(single[3]), Number(single[2]), Number(single[1])),
        bounds,
      ),
    };
  }

  return null;
}

function cellText(cellXml: string): string {
  const paragraphs: string[] = [];
  for (const paragraph of cellXml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const xml = paragraph[0]
      .replace(/<w:tab\b[^/]*\/>/g, "<w:t> </w:t>")
      .replace(/<w:br\b[^/]*\/>/g, "<w:t>\n</w:t>");
    const parts: string[] = [];
    for (const run of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
      parts.push(decodeXml(run[1]));
    }
    const line = parts.join("").replace(/[ \t]+/g, " ").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs.join("\n").trim();
}

const LABEL_LINE_RE =
  /^(dzień wolny|dni wolne|dzień opiekuńczo|dni opiekuńczo)/i;

function titleParts(text: string): { summary: string; description?: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { summary: text };
  const summaryParts = [lines[0]];
  const descParts: string[] = [];
  for (const line of lines.slice(1)) {
    if (LABEL_LINE_RE.test(line) || /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(line)) {
      descParts.push(line);
    } else {
      summaryParts.push(line);
    }
  }
  return {
    summary: summaryParts.join(" "),
    description: descParts.join("\n") || undefined,
  };
}

function extractBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "g");
  return [...xml.matchAll(re)].map((match) => match[0]);
}

function documentPlainText(xml: string): string {
  const parts: string[] = [];
  for (const run of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
    parts.push(decodeXml(run[1]));
  }
  return parts.join("").replace(/\s+/g, " ");
}

function uidKey(span: DateSpan, summary: string, used: Set<string>): string {
  const base = [
    span.date,
    span.endDate ?? "",
    pathSlug(summary).replace(/[^a-z0-9]+/gi, ""),
  ]
    .filter(Boolean)
    .join("-");
  let key = base || span.date;
  let n = 2;
  while (used.has(key)) {
    key = `${base}-${n}`;
    n += 1;
  }
  used.add(key);
  return key;
}

function skipLessons(summary: string, description?: string): boolean {
  return SKIP_LESSONS_RE.test(`${summary}\n${description ?? ""}`);
}

function toHoliday(event: OneOffEvent): HolidayRange {
  if (event.endDate && event.endDate !== event.date) {
    return { from: event.date, to: event.endDate, name: event.summary };
  }
  return { date: event.date, name: event.summary };
}

export async function parseYearCalendarDocx(
  buffer: Buffer,
  source: string,
): Promise<ParsedYearCalendar> {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("Brak word/document.xml w pliku kalendarza");
  }
  const xml = await documentFile.async("string");
  const bounds = schoolYearFromSource(source);
  const yearLabel = bounds?.label ?? "rok szkolny";
  const usedKeys = new Set<string>();
  const events: OneOffEvent[] = [];

  for (const table of extractBlocks(xml, "w:tbl")) {
    for (const row of extractBlocks(table, "w:tr")) {
      const cells = extractBlocks(row, "w:tc").map(cellText);
      if (cells.length === 0) continue;
      const dateText = cells[0] ?? "";
      const titleText = cells.slice(1).join("\n").trim();
      if (MONTH_RE.test(normalizeDateText(dateText))) continue;

      const body = titleText || dateText;
      if (!body) continue;

      const span = parseDateSpan(dateText, bounds);
      if (!span) {
        if (!MONTH_RE.test(normalizeDateText(body))) {
          console.error(
            `Pominięto wiersz bez daty w kalendarzu roku szkolnego: ${normalizeDateText(
              `${dateText} ${titleText}`,
            ).slice(0, 120)}`,
          );
        }
        continue;
      }

      const { summary, description } = titleParts(body);
      const event: OneOffEvent = {
        kind: "oneOff",
        date: span.date,
        ...(span.endDate ? { endDate: span.endDate } : {}),
        summary,
        description,
        uidKey: uidKey(span, summary, usedKeys),
      };
      events.push(event);
    }
  }

  if (events.length === 0) {
    throw new Error("Nie znaleziono wydarzeń w kalendarzu roku szkolnego");
  }

  const holidays = events.filter((event) => skipLessons(event.summary, event.description));
  const update = documentPlainText(xml).match(UPDATE_RE);
  const validFrom = update
    ? iso(Number(update[3]), Number(update[2]), Number(update[1]))
    : (bounds?.start ?? events[0].date);

  return {
    events,
    holidays: holidays.map(toHoliday),
    validFrom,
    yearLabel,
  };
}
