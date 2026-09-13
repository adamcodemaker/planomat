export type Weekday = 1 | 2 | 3 | 4 | 5;

export type HolidayRange = {
  date?: string;
  from?: string;
  to?: string;
  name?: string;
};

export type Lesson = {
  weekday: Weekday;
  weekdayName: string;
  lessonNo: number;
  start: string;
  end: string;
  subject: string;
  subjectRaw: string;
  teacher: string;
  room: string;
  roomLabel: string;
  group?: string;
  classLabel: string;
};

export type SchoolCalendarConfig = {
  timezone: string;
  yearEnd: string;
  holidays: HolidayRange[];
};

export type SchoolPayload<T = unknown> = {
  source: string;
  validFrom: string;
  data: T;
};

export type CalendarFeed = {
  className: string;
  classLabel: string;
  groupId: string;
  title: string;
  lessons: Lesson[];
};

export interface SchoolAdapter<T = unknown> {
  readonly id: string;
  readonly displayName: string;
  readonly config: SchoolCalendarConfig;
  fetch(): Promise<SchoolPayload<T>>;
  loadFile(path: string): Promise<SchoolPayload<T>>;
  parse(payload: SchoolPayload<T>): Promise<CalendarFeed[]>;
}
