# Planomat

ICS calendars for Google Calendar. GitHub Actions fetches sources, writes `docs/`, and deploys Pages. Do not commit ICS files.

Subscribe (From URL, not Import): `https://<user>.github.io/planomat/{calendar}/{path}.ics`

Example: `https://<user>.github.io/planomat/sp143/4b/1.ics`

```bash
npm install
npm run fetch
npx tsx src/cli.ts --calendar sp143 --fetch --path 4b/2 --output-dir docs
```

Add a calendar: implement `CalendarAdapter` in `src/calendars/{id}/`, register it in `src/calendars/registry.ts`. Feeds use `path` plus `weekly` or `oneOff` events.
