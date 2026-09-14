export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type HolidayRange = {
  date?: string;
  from?: string;
  to?: string;
  name?: string;
};

export type CalendarConfig = {
  timezone: string;
  yearEnd?: string;
  holidays?: HolidayRange[];
};

export type SourcePayload<T = unknown> = {
  source: string;
  validFrom: string;
  data: T;
};

type CalendarEventBase = {
  summary: string;
  description?: string;
  location?: string;
  uidKey: string;
};

export type WeeklyEvent = CalendarEventBase & {
  kind: "weekly";
  weekday: Weekday;
  start: string;
  end: string;
};

export type OneOffEvent = CalendarEventBase & {
  kind: "oneOff";
  date: string;
  start?: string;
  end?: string;
};

export type CalendarEvent = WeeklyEvent | OneOffEvent;

export type CalendarFeed = {
  path: string[];
  title: string;
  section?: string;
  events: CalendarEvent[];
};

export interface CalendarAdapter<T = unknown> {
  readonly id: string;
  readonly displayName: string;
  readonly config: CalendarConfig;
  fetch(): Promise<SourcePayload<T>>;
  loadFile?(path: string): Promise<SourcePayload<T>>;
  parse(payload: SourcePayload<T>): Promise<CalendarFeed[]>;
}
