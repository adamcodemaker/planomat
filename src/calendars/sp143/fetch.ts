import { searchWpMedia, USER_AGENT } from "../../core/wpMedia.ts";
import { sp143Config } from "./config.ts";

const DATE_IN_NAME_RE = /od-(\d{2})\.(\d{2})\.(\d{4})/;
const PLAN_FILE_RE = /Plan-oddzialow/i;

export type LatestPlan = {
  url: string;
  validFrom: string;
  buffer: Buffer;
};

function dateFromFilename(name: string): string | null {
  const match = name.match(DATE_IN_NAME_RE);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

export async function findLatestPlanUrl(
  site = sp143Config.schoolSite,
): Promise<{ url: string; validFrom: string }> {
  const files = await searchWpMedia(site, "Plan-oddzialow");
  const plans = files.filter(
    (file) => PLAN_FILE_RE.test(file.filename) && /\.xlsx$/i.test(file.filename),
  );

  if (plans.length === 0) {
    throw new Error(
      "Nie znaleziono pliku Plan-oddzialow*.xlsx w bibliotece mediów szkoły",
    );
  }

  const ranked = plans.map((file) => ({
    url: file.url,
    validFrom: dateFromFilename(file.filename) ?? "1970-01-01",
    uploadedAt: file.uploadedAt,
  }));
  ranked.sort(
    (a, b) =>
      b.validFrom.localeCompare(a.validFrom) ||
      b.uploadedAt.localeCompare(a.uploadedAt) ||
      a.url.localeCompare(b.url),
  );
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
