export type Weekday = 1 | 2 | 3 | 4 | 5;

export type Group = "1" | "2";

export const GROUPS: Group[] = ["1", "2"];

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

export type LessonSlot = {
  lessonNo: number;
  start: string;
  end: string;
  variants: Map<Weekday, LessonVariant[]>;
};

export type ClassBlock = {
  className: string;
  classLabel: string;
  weekdays: Weekday[];
  slots: LessonSlot[];
};

export type WorkbookPlan = {
  classes: ClassBlock[];
};

export type ParseResult = {
  classLabel: string;
  lessons: Lesson[];
};
