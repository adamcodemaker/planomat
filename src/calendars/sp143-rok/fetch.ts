import { searchWpMedia, USER_AGENT } from "../../core/wpMedia.ts";
import { sp143RokConfig } from "./config.ts";

export { USER_AGENT };

export type YearCalendarDoc = {
  url: string;
  buffer: Buffer;
};

const YEAR_FILE_RE = /Kalendarz-roku-szkolnego/i;
const SCHOOL_YEAR_RE = /Kalendarz-roku-szkolnego-(\d{4})-(\d{2})/i;

function absoluteUrl(href: string, base: string): string {
  return new URL(href, base).toString();
}

function schoolYearKey(filename: string): string {
  const match = filename.match(SCHOOL_YEAR_RE);
  if (!match) return "0000-00";
  return `${match[1]}-${match[2]}`;
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
      if (!YEAR_FILE_RE.test(raw)) continue;
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

async function findYearCalendarOnPage(
  page: string,
  site: string,
): Promise<string | null> {
  const html = await fetchText(page);
  const found = collectDocxUrls(html, site);
  if (found.length === 0) return null;
  found.sort((a, b) => b.localeCompare(a));
  return found[0];
}

export async function findYearCalendarUrl(
  page = sp143RokConfig.calendarPage,
  site = sp143RokConfig.schoolSite,
): Promise<string> {
  try {
    const files = await searchWpMedia(site, "Kalendarz-roku-szkolnego");
    const docs = files.filter(
      (file) => YEAR_FILE_RE.test(file.filename) && /\.docx$/i.test(file.filename),
    );
    if (docs.length > 0) {
      docs.sort(
        (a, b) =>
          schoolYearKey(b.filename).localeCompare(schoolYearKey(a.filename)) ||
          b.uploadedAt.localeCompare(a.uploadedAt) ||
          b.url.localeCompare(a.url),
      );
      return docs[0].url;
    }
  } catch {
    /* strona kalendarza jest zapasowym źródłem */
  }

  try {
    const fromPage = await findYearCalendarOnPage(page, site);
    if (fromPage) return fromPage;
  } catch {
    /* zostaje ostatni znany plik */
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
