import type { CalendarAdapter, CalendarFeed } from "./types.ts";
import { pathSlug } from "./slug.ts";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const PAGE_STYLE = `
      body {
        font-family: system-ui, sans-serif;
        max-width: 40rem;
        margin: 2rem auto;
        padding: 0 1rem;
        line-height: 1.5;
      }
      code {
        font-size: 0.95em;
      }
`;

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${PAGE_STYLE}    </style>
  </head>
  <body>
${body}  </body>
</html>
`;
}

function feedPathLabel(feed: CalendarFeed): string {
  return feed.path.map(pathSlug).join("/");
}

function feedHref(feed: CalendarFeed): string {
  const href = `./${feedPathLabel(feed)}.ics`;
  return escapeHtml(href);
}

function feedListItems(feeds: CalendarFeed[]): string {
  return [...feeds]
    .sort((a, b) =>
      feedPathLabel(a).localeCompare(feedPathLabel(b), "pl", { numeric: true }),
    )
    .map(
      (feed) =>
        `        <li><a href="${feedHref(feed)}">${escapeHtml(feedPathLabel(feed))}.ics</a> — ${escapeHtml(feed.title)}</li>`,
    )
    .join("\n");
}

export function rootIndexHtml(
  calendars: { adapter: CalendarAdapter; feedCount: number }[],
): string {
  const items = calendars
    .map(
      ({ adapter, feedCount }) =>
        `      <li><a href="./${escapeHtml(adapter.id)}/">${escapeHtml(adapter.displayName)}</a> — ${feedCount} kalendarzy</li>`,
    )
    .join("\n");

  return page(
    "Planomat — ICS",
    `    <h1>Planomat</h1>
    <p>
      Kalendarze ICS do subskrypcji w Google Calendar. Adres:
      <code>/{kalendarz}/{ścieżka}.ics</code>.
    </p>
    <ul>
${items}
    </ul>
    <p>
      W Google Calendar: Inne kalendarze → plus → Z URL → wklej pełny adres
      wybranego pliku <code>.ics</code>.
    </p>
`,
  );
}

export function calendarIndexHtml(
  adapter: CalendarAdapter,
  feeds: CalendarFeed[],
): string {
  const bySection = new Map<string, CalendarFeed[]>();
  const unsectioned: CalendarFeed[] = [];
  for (const feed of feeds) {
    if (feed.section) {
      const list = bySection.get(feed.section) ?? [];
      list.push(feed);
      bySection.set(feed.section, list);
    } else {
      unsectioned.push(feed);
    }
  }

  const sections = [...bySection.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "pl", { numeric: true }),
  );

  const sectionHtml = sections
    .map(
      ([section, sectionFeeds]) => `    <h2>${escapeHtml(section)}</h2>
    <ul>
${feedListItems(sectionFeeds)}
    </ul>`,
    )
    .join("\n");

  const unsectionedHtml =
    unsectioned.length === 0
      ? ""
      : `${sections.length > 0 ? "\n" : ""}    <ul>
${feedListItems(unsectioned)}
    </ul>`;

  return page(
    `${adapter.displayName} — Planomat`,
    `    <p><a href="../">← kalendarze</a></p>
    <h1>${escapeHtml(adapter.displayName)}</h1>
    <p>
      Adres pliku:
      <code>/${escapeHtml(adapter.id)}/{ścieżka}.ics</code>
    </p>
${sectionHtml}${unsectionedHtml}
    <p>
      W Google Calendar: Inne kalendarze → plus → Z URL → wklej pełny adres
      wybranego pliku <code>.ics</code>.
    </p>
`,
  );
}
