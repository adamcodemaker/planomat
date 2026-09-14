import type { CalendarAdapter } from "../core/types.ts";
import { sp143 } from "./sp143/index.ts";

const calendars: Record<string, CalendarAdapter> = {
  sp143,
};

export function listCalendars(): CalendarAdapter[] {
  return Object.values(calendars);
}

export function getCalendar(id: string): CalendarAdapter {
  const calendar = calendars[id.toLowerCase()];
  if (!calendar) {
    const available = listCalendars()
      .map((item) => item.id)
      .join(", ");
    throw new Error(`Nieznany kalendarz: ${id}. Dostępne: ${available}`);
  }
  return calendar;
}
