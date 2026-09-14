import { readFileSync } from "node:fs";
import { pathSlug } from "../../core/slug.ts";
import type {
  CalendarAdapter,
  CalendarFeed,
  SourcePayload,
  WeeklyEvent,
} from "../../core/types.ts";
import { sp143Config } from "./config.ts";
import { fetchLatestPlan, validFromFromFilename } from "./fetch.ts";
import { lessonsForGroup, parseWorkbook } from "./parse.ts";
import { GROUPS, type Lesson } from "./types.ts";
import { fetchYearCalendar } from "../sp143-rok/fetch.ts";
import { parseYearCalendarDocx } from "../sp143-rok/parse.ts";

function eventDescription(lesson: Lesson): string {
  const lines = [
    `Nauczyciel: ${lesson.teacher || "—"}`,
    `Sala: ${lesson.roomLabel || lesson.room || "—"}`,
    `Lekcja: ${lesson.lessonNo}`,
    `Dzień: ${lesson.weekdayName}`,
    `Klasa: ${lesson.classLabel}`,
  ];
  if (lesson.group) lines.push(`Grupa: ${lesson.group}`);
  return lines.join("\n");
}

function toWeeklyEvent(lesson: Lesson): WeeklyEvent {
  return {
    kind: "weekly",
    weekday: lesson.weekday,
    start: lesson.start,
    end: lesson.end,
    summary: lesson.subject,
    description: eventDescription(lesson),
    location: lesson.roomLabel || undefined,
    uidKey: `${lesson.weekday}-${lesson.lessonNo}`,
  };
}

export const sp143: CalendarAdapter<Buffer> = {
  id: "sp143",
  displayName: "SP143",
  config: {
    timezone: sp143Config.timezone,
    yearEnd: sp143Config.yearEnd,
    holidays: sp143Config.holidays,
  },

  async fetch(): Promise<SourcePayload<Buffer>> {
    const latest = await fetchLatestPlan();
    let holidays = sp143Config.holidays;
    try {
      const yearCal = await fetchYearCalendar();
      const parsed = await parseYearCalendarDocx(yearCal.buffer, yearCal.url);
      holidays = parsed.holidays;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Nie pobrano kalendarza roku szkolnego dla EXDATE planu lekcji: ${message}`,
      );
    }
    return {
      source: latest.url,
      validFrom: latest.validFrom,
      data: latest.buffer,
      holidays,
    };
  },

  async loadFile(path: string): Promise<SourcePayload<Buffer>> {
    return {
      source: path,
      validFrom: validFromFromFilename(path),
      data: readFileSync(path),
    };
  },

  async parse(payload: SourcePayload<Buffer>): Promise<CalendarFeed[]> {
    const workbook = await parseWorkbook(payload.data);
    const feeds: CalendarFeed[] = [];
    for (const block of workbook.classes) {
      for (const group of GROUPS) {
        feeds.push({
          path: [pathSlug(block.className), group],
          section: block.className,
          title: `Plan ${block.className} (grupa ${group})`,
          events: lessonsForGroup(block, group).map(toWeeklyEvent),
        });
      }
    }
    return feeds;
  },
};
