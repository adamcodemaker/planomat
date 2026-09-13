# Plan 4B → Google Calendar

Konwerter planu lekcji **4B N.Kalicka** ze [strony SP143](https://www.sp143.waw.pl/) do pliku ICS. Extra zajęcia (korepetycje, basen) trzymaj w **innym** kalendarzu Google — ten plik dotyczy tylko lekcji szkolnych.

## Jak dodać kalendarz (raz)

1. Włącz GitHub Pages: Settings → Pages → Deploy from a branch → `main` / folder `/docs`.
2. Po publikacji skopiuj URL pliku, np. `https://<user>.github.io/planlekcji/plan-4b.ics`.
3. W [Google Calendar](https://calendar.google.com): **Inne kalendarze** → **+** → **Z URL** → wklej ten link.
4. Nie używaj „Importuj” — import tylko dodaje wydarzenia i przy kolejnej aktualizacji je zdubluje.

Kalendarz z URL jest tylko do odczytu. Google sam go odświeża, zwykle co 12–48 godzin.

### Żeby zobaczyć zmianę od razu

Usuń kalendarz „Plan 4B” z Google Calendar i dodaj **ten sam URL** ponownie.

## Gdzie i kiedy to się uruchamia

Nic nie musi działać na Twoim komputerze.

| Gdzie | Kiedy | Co robi |
| --- | --- | --- |
| Twój laptop | Tylko gdy odpalisz CLI | Jednorazowa konwersja |
| GitHub Actions | 05:00 i 14:00 UTC (7:00 i 16:00 latem w Warszawie) oraz ręcznie *Run workflow* | Pobiera XLSX ze szkoły, nadpisuje `docs/plan-4b.ics` jeśli plan się zmienił |
| GitHub Pages | Cały czas | Serwuje stały URL pliku ICS |
| Google Calendar | Kiedy Google zechce (często 12–48 h) | Pobiera ICS i pokazuje lekcje |

Menu szkoły czasem wskazuje stary plik. Skrypt szuka najnowszego `Plan-oddzialow*.xlsx` po dacie w nazwie (`od-DD.MM.YYYY`).

## Uruchomienie lokalne

```bash
npm install
npm run fetch
```

Albo ze ściągniętego XLSX:

```bash
npx tsx src/cli.ts --input Plan-oddzialow-indywidualny-od-14.09.2026.xlsx --output docs/plan-4b.ics
```

Konfiguracja (klasa, święta, aliasy przedmiotów, dzwonki): [`config/plan.json`](config/plan.json).

## Co trafia do wydarzenia

- **Tytuł:** tylko przedmiot (bez nauczyciela i sali). Przy podziale klasy brana jest grupa `1/2`.
- **Szczegóły:** nauczyciel, sala, numer lekcji, dzień, klasa, grupa.
- **Powtarzanie:** co tydzień od daty obowiązywania planu do 25.06.2027, z wyłączeniem ferii i świąt z configu.

Dni dyrektorskie dopisz w `config/plan.json` → `holidays`.
