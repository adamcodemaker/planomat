export const USER_AGENT =
  "Mozilla/5.0 (compatible; planomat/1.0; +https://github.com/)";

export type WpMediaFile = {
  url: string;
  uploadedAt: string;
  filename: string;
};

const MAX_PAGES = 5;

function mediaFile(item: unknown): WpMediaFile | null {
  if (!item || typeof item !== "object") return null;
  const record = item as { date?: unknown; source_url?: unknown };
  if (typeof record.source_url !== "string" || !record.source_url) return null;

  let filename = "";
  try {
    const pathname = new URL(record.source_url).pathname;
    filename = decodeURIComponent(pathname.split("/").pop() ?? "");
  } catch {
    return null;
  }
  if (!filename) return null;

  return {
    url: record.source_url,
    uploadedAt: typeof record.date === "string" ? record.date : "",
    filename,
  };
}

export async function searchWpMedia(
  site: string,
  search: string,
): Promise<WpMediaFile[]> {
  const files: WpMediaFile[] = [];
  const seen = new Set<string>();
  let totalPages = 1;

  for (let page = 1; page <= totalPages && page <= MAX_PAGES; page++) {
    const endpoint = new URL("/wp-json/wp/v2/media", site);
    endpoint.searchParams.set("search", search);
    endpoint.searchParams.set("orderby", "date");
    endpoint.searchParams.set("order", "desc");
    endpoint.searchParams.set("per_page", "100");
    endpoint.searchParams.set("page", String(page));

    const response = await fetch(endpoint, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) {
      if (page > 1) break;
      throw new Error(
        `Nie udało się przeszukać biblioteki mediów: HTTP ${response.status}`,
      );
    }

    const reportedPages = Number(response.headers.get("x-wp-totalpages") ?? "1");
    if (Number.isFinite(reportedPages) && reportedPages > 0) {
      totalPages = reportedPages;
    }

    const items: unknown = await response.json();
    if (!Array.isArray(items)) {
      throw new Error("Biblioteka mediów zwróciła nieoczekiwany format");
    }

    for (const item of items) {
      const file = mediaFile(item);
      if (!file || seen.has(file.url)) continue;
      seen.add(file.url);
      files.push(file);
    }
  }

  return files;
}
