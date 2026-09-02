# Puente – Prototyp v0.4

Mobile-first, zweisprachige HTML/PWA für aufsuchende Bürokratiehilfe in spanischsprachigen Communities in Deutschland.

## Neu in v0.4
- druckfertige Fallakte mit Deckblatt, Fallübersicht, Nachweis-Checkliste und Fehlstellenliste
- bestätigte OCR-Angaben und vorbereitete Formularfelder werden automatisch in die Fallakte übernommen
- sortiertes Nachweisverzeichnis mit Nummerierung N1, N2, …
- Bildnachweise können direkt in die Druck-/PDF-Fallakte aufgenommen werden
- lokaler Antragssatz-Export als ZIP: Fallakte + Falldaten + Checkliste + noch im Tab verfügbare Originalnachweise
- Hinweisdatei im ZIP, wenn Originaldateien nach einem Reload nicht mehr im Arbeitsspeicher verfügbar sind

## Bereits aus v0.3: Fall-Arbeitsbereich
- Kamera/Dateiupload für JPG, PNG, WebP und PDF
- Dokumente bleiben im Browser; keine Puente-Cloud
- clientseitige Dokumenttyp-Erkennung
- clientseitige PDF-Textauslese mit PDF.js
- clientseitiges OCR für Bilder und gescannte PDFs mit Tesseract.js
- automatische Erkennung von typischen Angaben wie Steuer-ID, Renten-/SV-Nummer, IBAN, Krankenkasse, Wohnfläche sowie Miet- und Einkommensbeträgen
- erkannte Angaben werden als Vorschläge mit Konfidenz angezeigt
- erst nach Bestätigung werden Angaben in verknüpfte Formularfelder übernommen
- Dokumentgruppen werden bei hoher Erkennung automatisch als vorhanden markiert
- manuelle Dokumenttyp-Korrektur
- manuelle Textanalyse als Offline-/Fallback-Weg
- Export einer Fallübersicht als JSON ohne Originaldokumente

## Datenschutzmodell
- Originaldateien: nur im Arbeitsspeicher des geöffneten Tabs
- vollständiger OCR-Text: wird nach der Analyse nicht gespeichert
- erkannte Vorschläge und bestätigte Werte: nur `sessionStorage`
- Fallklassifikation und reine Dokumentstatus: `localStorage`
- keine Analytics, kein Tracking, kein Puente-Backend
- „Fall löschen“ entfernt lokale/sessionbezogene Daten

Wichtig: Für OCR/PDF-Auslese lädt der Browser bei Bedarf Tesseract.js bzw. PDF.js über öffentliche CDNs. Die hochgeladenen Dokumente werden dabei lokal im Browser verarbeitet und nicht an die CDNs übertragen. Für vollständig offline arbeitende Installationen sollten diese Bibliotheken später lokal mit dem Projekt ausgeliefert werden.

## Bereits enthalten
- Spanisch/Deutsch
- geführter Fall-Assistent
- Grundsicherungsgeld und Wohngeld
- automatische Jobcenter-Anlagenlogik
- formularfeldgenaue Vorbereitung HA/KDU/EK/VM sowie Berliner Mietzuschuss
- Dokumentverlust-Modus
- Beschaffungswege nach Komplexität 1–4
- Musterschreiben
- Druck/PDF

## Starten
```bash
cd burokratie_navigator_prototyp_v04
python -m http.server 8080
```
Dann `http://localhost:8080` öffnen.

## Grenzen des Prototyps
OCR und RegEx-Erkennung können Fehler machen. Deshalb werden erkannte persönliche Angaben nicht stillschweigend als wahr übernommen, sondern müssen bestätigt werden. Die App ist praktische Orientierung, keine Rechtsberatung.
