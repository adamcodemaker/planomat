# Plan lekcji → Google Calendar

Konwerter planów lekcji do plików ICS. Każda szkoła ma własne źródło i parser; na razie jest [SP143](https://www.sp143.waw.pl/). Extra zajęcia (korepetycje, basen) trzymaj w **innym** kalendarzu Google — te pliki dotyczą tylko lekcji szkolnych.

Wygenerowane ICS **nie są w gicie**. GitHub Actions pobiera plan, buduje `docs/` i wdraża GitHub Pages z artefaktu.

## Jak dodać kalendarz (raz)

1. Włącz GitHub Pages: Settings → Pages → Source → **GitHub Actions**.
2. Adres pliku: `https://<user>.github.io/planlekcji/{szkoła}/{klasa}/{grupa}.ics`
   - SP143, grupa 1, klasa 4B: `https://<user>.github.io/planlekcji/sp143/4b/1.ics`
   - SP143, grupa 2, klasa 4B: `https://<user>.github.io/planlekcji/sp143/4b/2.ics`
3. W [Google Calendar](https://calendar.google.com): **Inne kalendarze** → **+** → **Z URL** → wklej ten link.
4. Nie używaj „Importuj” — import tylko dodaje wydarzenia i przy kolejnej aktualizacji je zdubluje.

Kalendarz z URL jest tylko do odczytu. Google sam go odświeża, zwykle co 12–48 godzin.

Stare adresy bez prefiksu szkoły (`/4b/1.ics`) już nie obowiązują — dodaj kalendarz ponownie z nowego URL.

### Żeby zobaczyć zmianę od razu

Usuń kalendarz z Google Calendar i dodaj **ten sam URL** ponownie.

## Gdzie i kiedy to się uruchamia

Nic nie musi działać na Twoim komputerze.

| Gdzie | Kiedy | Co robi |
| --- | --- | --- |
| Twój laptop | Tylko gdy odpalisz CLI | Jednorazowa konwersja do `docs/` (lokalny podgląd, nie commituj ICS) |
| GitHub Actions | 05:00 i 14:00 UTC (7:00 i 16:00 latem w Warszawie) oraz ręcznie *Run workflow* | Pobiera plany, generuje ICS, wdraża Pages |
| GitHub Pages | Cały czas | Serwuje stałe URL plików ICS |
| Google Calendar | Kiedy Google zechce (często 12–48 h) | Pobiera ICS i pokazuje lekcje |

Dla SP143 menu szkoły czasem wskazuje stary plik. Parser szuka najnowszego `Plan-oddzialow*.xlsx` po dacie w nazwie (`od-DD.MM.YYYY`).

## Uruchomienie lokalne

```bash
npm install
npm run fetch
```

Zapisuje `docs/sp143/4b/1.ics`, `docs/sp143/4b/2.ics` i analogicznie dla pozostałych klas.

Albo ze ściągniętego XLSX:

```bash
npx tsx src/cli.ts --school sp143 --input Plan-oddzialow-indywidualny-od-14.09.2026.xlsx --output-dir docs
```

Tylko jedna klasa albo grupa:

```bash
npx tsx src/cli.ts --school sp143 --fetch --class 4B --group 2 --output-dir docs
```

Konfiguracja SP143 (święta, aliasy przedmiotów, dzwonki): [`src/schools/sp143/config.json`](src/schools/sp143/config.json).

## Co trafia do wydarzenia (SP143)

- **Tytuł:** tylko przedmiot (bez nauczyciela i sali). Przy podziale klasy brany jest wariant grupy z URL (`1` → `1/2`, `2` → `2/2`); lekcje bez podziału są w obu kalendarzach.
- **Szczegóły:** nauczyciel, sala, numer lekcji, dzień, klasa, grupa (pełny tag z planu, np. `2/2`).
- **Powtarzanie:** co tydzień od daty obowiązywania planu do końca roku szkolnego z configu, z wyłączeniem ferii i świąt.

Dni dyrektorskie dopisz w `src/schools/sp143/config.json` → `holidays`.

## Jak dodać szkołę

1. Utwórz `src/schools/{id}/` z `config.json`, `fetch` (źródło), `parse` (do `CalendarFeed[]`) i `index.ts` eksportującym `SchoolAdapter`.
2. Dopisz szkołę w [`src/schools/registry.ts`](src/schools/registry.ts).
3. ICS pojawią się pod `docs/{id}/{klasa}/{grupa}.ics` (lokalnie i na Pages).
