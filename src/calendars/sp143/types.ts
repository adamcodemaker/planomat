import type { HolidayRange, Weekday } from "../../core/types.ts";

export type Sp143Config = {
  timezone: string;
  yearEnd: string;
  defaultPlanStart: string;
  schoolSite: string;
  address: string;
  subjectAliases: Record<string, string>;
  roomAliases: Record<string, string>;
  bells: Record<string, [string, string]>;
  holidays: HolidayRange[];
};

export type Group = "1" | "2";

export const GROUPS: Group[] = ["1", "2"];

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
