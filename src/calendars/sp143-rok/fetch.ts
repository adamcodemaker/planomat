import { sp143RokConfig } from "./config.ts";

export const USER_AGENT =
  "Mozilla/5.0 (compatible; planomat/1.0; +https://github.com/)";

export type YearCalendarDoc = {
  url: string;
  buffer: Buffer;
};

function absoluteUrl(href: string, base: string): string {
  return new URL(href, base).toString();
}

function collectDocxUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /https?:\/\/[^"'\\\s>]+\.docx/gi,
    /["']([^"']*\/wp-content\/uploads\/[^"']*\.docx)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = (match[1] ?? match[0]).replace(/&amp;/g, "&");
      if (!/Kalendarz-roku-szkolnego/i.test(raw)) continue;
      try {
        urls.add(absoluteUrl(raw, base));
      } catch {
        /* ignore malformed */
      }
    }
  }

  return [...urls];
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml" },
  });
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

export async function findYearCalendarUrl(
  page = sp143RokConfig.calendarPage,
  site = sp143RokConfig.schoolSite,
): Promise<string> {
  try {
    const html = await fetchText(page);
    const found = collectDocxUrls(html, site);
    if (found.length > 0) {
      found.sort((a, b) => b.localeCompare(a));
      return found[0];
    }
  } catch {
    /* strona pomocnicza */
  }
  return sp143RokConfig.fallbackDocx;
}

export async function fetchYearCalendar(): Promise<YearCalendarDoc> {
  const url = await findYearCalendarUrl();
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać kalendarza ${url}: HTTP ${response.status}`);
  }
  return { url, buffer: Buffer.from(await response.arrayBuffer()) };
}
