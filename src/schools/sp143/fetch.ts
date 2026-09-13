import { sp143Config } from "./config.ts";

const DATE_IN_NAME_RE = /od-(\d{2})\.(\d{2})\.(\d{4})/;
const USER_AGENT =
  "Mozilla/5.0 (compatible; planlekcji/1.0; +https://github.com/)";

export type LatestPlan = {
  url: string;
  validFrom: string;
  buffer: Buffer;
};

function absoluteUrl(href: string, base: string): string {
  return new URL(href, base).toString();
}

function dateFromFilename(url: string): string | null {
  const match = url.match(DATE_IN_NAME_RE);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function collectPlanUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /https?:\/\/[^"'\\\s>]+\.xlsx/gi,
    /["']([^"']*\/wp-content\/uploads\/[^"']*\.xlsx)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = (match[1] ?? match[0]).replace(/&amp;/g, "&");
      if (!/Plan-oddzialow/i.test(raw)) continue;
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

async function discoverCandidatePages(site: string): Promise<string[]> {
  const pages = new Set<string>([
    site,
    `${site}/`,
    `${site}/feed/`,
    `${site}/?s=plan+lekcji`,
  ]);

  try {
    const feed = await fetchText(`${site}/feed/`);
    const links = [...feed.matchAll(/<link>([^<]+)<\/link>/gi)].map((m) => m[1]);
    const titles = [...feed.matchAll(/<title>([^<]+)<\/title>/gi)].map((m) =>
      m[1].toLowerCase(),
    );
    for (let i = 0; i < links.length; i++) {
      const title = titles[i] ?? "";
      if (/plan lekcji|plan-lekcji/.test(title) || /plan lekcji/i.test(links[i])) {
        pages.add(links[i]);
      }
    }
    for (const link of links.slice(0, 8)) pages.add(link);
  } catch {
    /* RSS jest pomocniczy */
  }

  return [...pages];
}

export async function findLatestPlanUrl(
  site = sp143Config.schoolSite,
): Promise<{ url: string; validFrom: string }> {
  const pages = await discoverCandidatePages(site);
  const found = new Set<string>();

  for (const page of pages) {
    try {
      const html = await fetchText(page);
      for (const url of collectPlanUrls(html, site)) found.add(url);
    } catch {
      /* pomiń niedostępne strony */
    }
  }

  if (found.size === 0) {
    throw new Error("Nie znaleziono pliku Plan-oddzialow*.xlsx na stronie szkoły");
  }

  const ranked = [...found].map((url) => ({
    url,
    validFrom: dateFromFilename(url) ?? "1970-01-01",
  }));
  ranked.sort((a, b) => b.validFrom.localeCompare(a.validFrom) || a.url.localeCompare(b.url));
  return ranked[0];
}

export async function fetchLatestPlan(
  site = sp143Config.schoolSite,
): Promise<LatestPlan> {
  const latest = await findLatestPlanUrl(site);
  const response = await fetch(latest.url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać planu ${latest.url}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { ...latest, buffer };
}

export function validFromFromFilename(
  filename: string,
  fallback = sp143Config.defaultPlanStart,
): string {
  return dateFromFilename(filename) ?? fallback;
}
