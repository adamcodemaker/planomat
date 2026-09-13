# Plan lekcji SP143 → Google Calendar

Konwerter planu lekcji ze [strony SP143](https://www.sp143.waw.pl/) do plików ICS, osobno dla każdej klasy i grupy (`1` albo `2`). Extra zajęcia (korepetycje, basen) trzymaj w **innym** kalendarzu Google — te pliki dotyczą tylko lekcji szkolnych.

## Jak dodać kalendarz (raz)

1. Włącz GitHub Pages: Settings → Pages → Deploy from a branch → `main` / folder `/docs`.
2. Adres pliku: `https://<user>.github.io/planlekcji/{klasa}/{grupa}.ics`
   - grupa 1, klasa 4B: `https://<user>.github.io/planlekcji/4b/1.ics`
   - grupa 2, klasa 4B: `https://<user>.github.io/planlekcji/4b/2.ics`
3. W [Google Calendar](https://calendar.google.com): **Inne kalendarze** → **+** → **Z URL** → wklej ten link.
4. Nie używaj „Importuj” — import tylko dodaje wydarzenia i przy kolejnej aktualizacji je zdubluje.

Kalendarz z URL jest tylko do odczytu. Google sam go odświeża, zwykle co 12–48 godzin.

Query string (`?klasa=4B`) na GitHub Pages nie zadziała — Google Calendar pobiera gotowy plik ICS.

### Żeby zobaczyć zmianę od razu

Usuń kalendarz z Google Calendar i dodaj **ten sam URL** ponownie.

## Gdzie i kiedy to się uruchamia

Nic nie musi działać na Twoim komputerze.

| Gdzie | Kiedy | Co robi |
| --- | --- | --- |
| Twój laptop | Tylko gdy odpalisz CLI | Jednorazowa konwersja |
| GitHub Actions | 05:00 i 14:00 UTC (7:00 i 16:00 latem w Warszawie) oraz ręcznie *Run workflow* | Pobiera XLSX ze szkoły, nadpisuje `docs/{klasa}/{1\|2}.ics` jeśli plan się zmienił |
| GitHub Pages | Cały czas | Serwuje stałe URL plików ICS |
| Google Calendar | Kiedy Google zechce (często 12–48 h) | Pobiera ICS i pokazuje lekcje |

Menu szkoły czasem wskazuje stary plik. Skrypt szuka najnowszego `Plan-oddzialow*.xlsx` po dacie w nazwie (`od-DD.MM.YYYY`).

## Uruchomienie lokalne

```bash
npm install
npm run fetch
```

Zapisuje `docs/4b/1.ics`, `docs/4b/2.ics` i analogicznie dla pozostałych klas z arkusza.

Albo ze ściągniętego XLSX:

```bash
npx tsx src/cli.ts --input Plan-oddzialow-indywidualny-od-14.09.2026.xlsx --output-dir docs
```

Tylko jedna klasa albo grupa:

```bash
npx tsx src/cli.ts --fetch --class 4B --group 2 --output-dir docs
```

Konfiguracja (święta, aliasy przedmiotów, dzwonki): [`config/plan.json`](config/plan.json).

## Co trafia do wydarzenia

- **Tytuł:** tylko przedmiot (bez nauczyciela i sali). Przy podziale klasy brany jest wariant grupy z URL (`1` → `1/2`, `2` → `2/2`); lekcje bez podziału są w obu kalendarzach.
- **Szczegóły:** nauczyciel, sala, numer lekcji, dzień, klasa, grupa (pełny tag z planu, np. `2/2`).
- **Powtarzanie:** co tydzień od daty obowiązywania planu do 25.06.2027, z wyłączeniem ferii i świąt z configu.

Dni dyrektorskie dopisz w `config/plan.json` → `holidays`.
