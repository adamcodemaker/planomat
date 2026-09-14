# Planomat

ICS calendars for Google Calendar. GitHub Actions fetches sources, writes `docs/`, and deploys Pages. Do not commit ICS files.

Subscribe (From URL, not Import): `https://<user>.github.io/planomat/{calendar}/{path}.ics`

Examples:

- `https://<user>.github.io/planomat/sp143/4b/1.ics` — plan lekcji
- `https://<user>.github.io/planomat/sp143-rok/rok.ics` — kalendarz roku szkolnego SP143

```bash
npm install
npm run fetch
npx tsx src/cli.ts --calendar sp143 --fetch --path 4b/2 --output-dir docs
npx tsx src/cli.ts --calendar sp143-rok --fetch --output-dir docs
```

Add a calendar: implement `CalendarAdapter` in `src/calendars/{id}/`, register it in `src/calendars/registry.ts`. Feeds use `path` plus `weekly` or `oneOff` events.
