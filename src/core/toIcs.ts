import ical, { ICalEventRepeatingFreq } from "ical-generator";
import { getVtimezoneComponent } from "@touch4it/ical-timezones";
import { DateTime } from "luxon";
import { pathSlug } from "./slug.ts";
import type {
  CalendarConfig,
  CalendarEvent,
  CalendarFeed,
  HolidayRange,
  OneOffEvent,
  WeeklyEvent,
} from "./types.ts";

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
  return dates;
}

function parseHm(hm: string): { hour: number; minute: number } {
  const [hour, minute] = hm.split(":").map(Number);
  return { hour, minute };
}

function firstOccurrence(planStart: DateTime, weekday: number): DateTime {
  const delta = (weekday - planStart.weekday + 7) % 7;
  return planStart.plus({ days: delta });
}

function feedPathKey(feed: CalendarFeed): string {
  return feed.path.map(pathSlug).join("-");
}

function eventId(
  calendarId: string,
  feed: CalendarFeed,
  event: CalendarEvent,
): string {
  return `${calendarId}-${feedPathKey(feed)}-${event.uidKey}@planomat`;
}

function addWeeklyEvent(
  calendar: ReturnType<typeof ical>,
  feed: CalendarFeed,
  event: WeeklyEvent,
  options: {
    calendarId: string;
    zone: string;
    planStart: DateTime;
    until: DateTime;
    holidays: DateTime[];
  },
): void {
  const startHm = parseHm(event.start);
  const endHm = parseHm(event.end);
  const first = firstOccurrence(options.planStart, event.weekday);
  const start = first.set(startHm);
  const end = first.set(endHm);
  const exclude = options.holidays
    .filter((date) => date.weekday === event.weekday)
    .map((date) => date.set(startHm));

  calendar.createEvent({
    id: eventId(options.calendarId, feed, event),
    start,
    end,
    stamp: options.planStart.toUTC(),
    timezone: options.zone,
    summary: event.summary,
    description: event.description,
    location: event.location,
    repeating: {
      freq: ICalEventRepeatingFreq.WEEKLY,
      until: options.until.toUTC(),
      exclude,
    },
  });
}

function addOneOffEvent(
  calendar: ReturnType<typeof ical>,
  feed: CalendarFeed,
  event: OneOffEvent,
  options: { calendarId: string; zone: string; stamp: DateTime },
): void {
  const day = DateTime.fromISO(event.date, { zone: options.zone }).startOf("day");
  const allDay = !event.start || !event.end;
  const start = allDay ? day : day.set(parseHm(event.start!));
  const end = allDay ? day : day.set(parseHm(event.end!));

  calendar.createEvent({
    id: eventId(options.calendarId, feed, event),
    start,
    end,
    stamp: options.stamp.toUTC(),
    ...(allDay ? { allDay: true } : { timezone: options.zone }),
    summary: event.summary,
    description: event.description,
    location: event.location,
  });
}

export function toIcs(
  feed: CalendarFeed,
  options: {
    planStart: string;
    calendarId: string;
    displayName: string;
    config: CalendarConfig;
  },
): string {
  const { config, calendarId, displayName } = options;
  const zone = config.timezone;
  const planStart = DateTime.fromISO(options.planStart, { zone }).startOf("day");
  const hasWeekly = feed.events.some((event) => event.kind === "weekly");
  if (hasWeekly && !config.yearEnd) {
    throw new Error(
      `Kalendarz ${displayName} ma wydarzenia cotygodniowe, ale brak yearEnd w konfiguracji`,
    );
  }
  const until = config.yearEnd
    ? DateTime.fromISO(config.yearEnd, { zone }).endOf("day")
    : planStart;
  const holidays = expandHolidays(config.holidays ?? [], zone);

  const calendar = ical({
    name: feed.title,
    prodId: { company: "planomat", product: displayName, language: "PL" },
    timezone: {
      name: zone,
      generator: getVtimezoneComponent,
    },
    ttl: 3600,
  });

  for (const event of feed.events) {
    if (event.kind === "weekly") {
      addWeeklyEvent(calendar, feed, event, {
        calendarId,
        zone,
        planStart,
        until,
        holidays,
      });
      continue;
    }
    addOneOffEvent(calendar, feed, event, {
      calendarId,
      zone,
      stamp: planStart,
    });
  }

  return calendar.toString();
}
