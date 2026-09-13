export type Weekday = 1 | 2 | 3 | 4 | 5;

export type HolidayRange = {
  date?: string;
  from?: string;
  to?: string;
  name?: string;
};

export type PlanConfig = {
  className: string;
  calendarName: string;
  timezone: string;
  yearEnd: string;
  defaultPlanStart: string;
  schoolSite: string;
  subjectAliases: Record<string, string>;
  roomAliases: Record<string, string>;
  bells: Record<string, [string, string]>;
  holidays: HolidayRange[];
};

export type LessonVariant = {
  teacher: string;
  subjectRaw: string;
  room: string;
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

export type ParseResult = {
  classLabel: string;
  lessons: Lesson[];
};
