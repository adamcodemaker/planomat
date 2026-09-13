import { readFileSync } from "node:fs";
import type { CalendarFeed, SchoolAdapter, SchoolPayload } from "../../core/types.ts";
import { sp143Config } from "./config.ts";
import { fetchLatestPlan, validFromFromFilename } from "./fetch.ts";
import { lessonsForGroup, parseWorkbook } from "./parse.ts";
import { GROUPS } from "./types.ts";

export const sp143: SchoolAdapter<Buffer> = {
  id: "sp143",
  displayName: "SP143",
  config: {
    timezone: sp143Config.timezone,
    yearEnd: sp143Config.yearEnd,
    holidays: sp143Config.holidays,
  },

  async fetch(): Promise<SchoolPayload<Buffer>> {
    const latest = await fetchLatestPlan();
    return {
      source: latest.url,
      validFrom: latest.validFrom,
      data: latest.buffer,
    };
  },

  async loadFile(path: string): Promise<SchoolPayload<Buffer>> {
    return {
      source: path,
      validFrom: validFromFromFilename(path),
      data: readFileSync(path),
    };
  },

  async parse(payload: SchoolPayload<Buffer>): Promise<CalendarFeed[]> {
    const workbook = await parseWorkbook(payload.data);
    const feeds: CalendarFeed[] = [];
    for (const block of workbook.classes) {
      for (const group of GROUPS) {
        feeds.push({
          className: block.className,
          classLabel: block.classLabel,
          groupId: group,
          title: `Plan ${block.className} (grupa ${group})`,
          lessons: lessonsForGroup(block, group),
        });
      }
    }
    return feeds;
  },
};
