import { readFileSync } from "node:fs";
import type {
  CalendarAdapter,
  CalendarFeed,
  SourcePayload,
} from "../../core/types.ts";
import { sp143RokConfig } from "./config.ts";
import { fetchYearCalendar } from "./fetch.ts";
import { parseYearCalendarDocx } from "./parse.ts";

export const sp143Rok: CalendarAdapter<Buffer> = {
  id: "sp143-rok",
  displayName: "SP143 — rok szkolny",
  config: {
    timezone: sp143RokConfig.timezone,
  },

  async fetch(): Promise<SourcePayload<Buffer>> {
    const latest = await fetchYearCalendar();
    const parsed = await parseYearCalendarDocx(latest.buffer, latest.url);
    return {
      source: latest.url,
      validFrom: parsed.validFrom,
      data: latest.buffer,
      holidays: parsed.holidays,
    };
  },

  async loadFile(path: string): Promise<SourcePayload<Buffer>> {
    const data = readFileSync(path);
    const parsed = await parseYearCalendarDocx(data, path);
    return {
      source: path,
      validFrom: parsed.validFrom,
      data,
      holidays: parsed.holidays,
    };
  },

  async parse(payload: SourcePayload<Buffer>): Promise<CalendarFeed[]> {
    const parsed = await parseYearCalendarDocx(payload.data, payload.source);
    return [
      {
        path: ["rok"],
        title: `SP143 — kalendarz roku szkolnego ${parsed.yearLabel}`,
        events: parsed.events,
      },
    ];
  },
};
