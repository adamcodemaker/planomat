import ical, { ICalEventRepeatingFreq } from "ical-generator";
import { getVtimezoneComponent } from "@touch4it/ical-timezones";
import { DateTime } from "luxon";
import { config } from "./config.ts";
import { classSlug } from "./parsePlan.ts";
import type { Group, HolidayRange, Lesson } from "./types.ts";

function expandHolidays(ranges: HolidayRange[], zone: string): DateTime[] {
  const dates: DateTime[] = [];
  for (const range of ranges) {
    if (range.date) {
      dates.push(DateTime.fromISO(range.date, { zone }).startOf("day"));
      continue;
    }
    if (!range.from || !range.to) continue;
    let cursor = DateTime.fromISO(range.from, { zone }).startOf("day");
    const end = DateTime.fromISO(range.to, { zone }).startOf("day");
    while (cursor <= end) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }
  }
  return dates.filter((date) => date.weekday >= 1 && date.weekday <= 5);
}

function parseHm(hm: string): { hour: number; minute: number } {
  const [hour, minute] = hm.split(":").map(Number);
  return { hour, minute };
}

function firstOccurrence(planStart: DateTime, weekday: number): DateTime {
  const delta = (weekday - planStart.weekday + 7) % 7;
  return planStart.plus({ days: delta });
}

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

export function toIcs(
  lessons: Lesson[],
  options: { planStart: string; className: string; group: Group },
): string {
  const zone = config.timezone;
  const { className, group } = options;
  const planStart = DateTime.fromISO(options.planStart, { zone }).startOf("day");
  const until = DateTime.fromISO(config.yearEnd, { zone }).endOf("day");
  const holidays = expandHolidays(config.holidays, zone);
  const slug = classSlug(className);

  const calendar = ical({
    name: `Plan ${className} (grupa ${group})`,
    prodId: { company: "planlekcji", product: "SP143", language: "PL" },
    timezone: {
      name: zone,
      generator: getVtimezoneComponent,
    },
    ttl: 3600,
  });

  for (const lesson of lessons) {
    const startHm = parseHm(lesson.start);
    const endHm = parseHm(lesson.end);
    const first = firstOccurrence(planStart, lesson.weekday);
    const start = first.set(startHm);
    const end = first.set(endHm);
    const exclude = holidays
      .filter((date) => date.weekday === lesson.weekday)
      .map((date) => date.set(startHm));

    calendar.createEvent({
      id: `sp143-${slug}-${group}-${lesson.weekday}-${lesson.lessonNo}@planlekcji`,
      start,
      end,
      stamp: planStart.toUTC(),
      timezone: zone,
      summary: lesson.subject,
      description: eventDescription(lesson),
      location: lesson.roomLabel || undefined,
      repeating: {
        freq: ICalEventRepeatingFreq.WEEKLY,
        until: until.toUTC(),
        exclude,
      },
    });
  }

  return calendar.toString();
}
