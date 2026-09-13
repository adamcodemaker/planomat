import type { CalendarFeed, SchoolAdapter } from "./types.ts";
import { classSlug } from "./slug.ts";

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

export function rootIndexHtml(
  schools: { adapter: SchoolAdapter; feedCount: number }[],
): string {
  const items = schools
    .map(
      ({ adapter, feedCount }) =>
        `      <li><a href="./${escapeHtml(adapter.id)}/">${escapeHtml(adapter.displayName)}</a> — ${feedCount} kalendarzy</li>`,
    )
    .join("\n");

  return page(
    "Plan lekcji — ICS",
    `    <h1>Plan lekcji</h1>
    <p>
      Kalendarze ICS do subskrypcji w Google Calendar. Adres:
      <code>/{szkoła}/{klasa}/{grupa}.ics</code>.
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

export function schoolIndexHtml(
  adapter: SchoolAdapter,
  feeds: CalendarFeed[],
): string {
  const byClass = new Map<string, CalendarFeed[]>();
  for (const feed of feeds) {
    const key = feed.className;
    const list = byClass.get(key) ?? [];
    list.push(feed);
    byClass.set(key, list);
  }

  const classes = [...byClass.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "pl", { numeric: true }),
  );

  const sections = classes
    .map(([className, classFeeds]) => {
      const slug = classSlug(className);
      const links = [...classFeeds]
        .sort((a, b) => a.groupId.localeCompare(b.groupId, "pl", { numeric: true }))
        .map((feed) => {
          const href = `./${escapeHtml(slug)}/${escapeHtml(feed.groupId)}.ics`;
          return `        <li><a href="${href}">${escapeHtml(slug)}/${escapeHtml(feed.groupId)}.ics</a> — ${escapeHtml(feed.title)}</li>`;
        })
        .join("\n");
      return `    <h2>${escapeHtml(className)}</h2>
    <ul>
${links}
    </ul>`;
    })
    .join("\n");

  return page(
    `Plan lekcji ${adapter.displayName} — ICS`,
    `    <p><a href="../">← szkoły</a></p>
    <h1>Plan lekcji ${escapeHtml(adapter.displayName)}</h1>
    <p>
      Adres pliku:
      <code>/${escapeHtml(adapter.id)}/{klasa}/{grupa}.ics</code>
      — klasa małymi literami.
    </p>
${sections}
    <p>
      W Google Calendar: Inne kalendarze → plus → Z URL → wklej pełny adres
      wybranego pliku <code>.ics</code>.
    </p>
`,
  );
}
