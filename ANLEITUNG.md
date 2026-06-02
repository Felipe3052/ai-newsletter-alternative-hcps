# AI-Newsletter-Alternative (HCP Demo)
## Anleitung zum lokalen Starten des Prototyps

Diese Anleitung führt Sie Schritt für Schritt durch die Installation und den Start der Demo auf Ihrem Computer (**Windows** oder **macOS**). Es sind keine technischen Vorkenntnisse erforderlich.

---

### 📋 Voraussetzung (Nur einmalig nötig)

Die Demo benötigt **Node.js** (eine Laufzeitumgebung für JavaScript), um lokal auf Ihrem PC zu laufen. Bitte prüfen Sie zuerst, ob Sie dies installiert haben:

1. Gehen Sie auf die offizielle Website: **[nodejs.org/en/download](https://nodejs.org/en/download)**
2. Laden Sie die Version herunter, die als **LTS** (Long Term Support, meist die linke Schaltfläche) gekennzeichnet ist.
3. Öffnen Sie die heruntergeladene Datei und führen Sie die Installation aus. Sie können alle Standardeinstellungen einfach mit "Weiter" (Next) bestätigen.
4. *Hinweis:* Falls Sie währenddessen bereits ein Terminal/Eingabefenster geöffnet hatten, schließen Sie dieses und öffnen Sie es nach der Installation neu, damit die Änderungen wirksam werden.

---

### 🚀 Schritt-für-Schritt-Anleitung

#### 1. Projektordner entpacken
*   **Windows**: Klicken Sie mit der rechten Maustaste auf die Datei `ai-newsletter-alternative-hcps-new-version-2026-06-02.zip` und wählen Sie **"Alle extrahieren..."** (Extract All). Wählen Sie einen Speicherort (z. B. den Desktop) und klicken Sie auf "Extrahieren". 
    *   *Wichtig:* Doppelklicken Sie nicht einfach nur, um hineinzusehen. Der Ordner muss richtig entpackt werden!
*   **Mac (macOS)**: Doppelklicken Sie auf die ZIP-Datei. Ein Ordner namens `ai-newsletter-alternative-hcps` wird automatisch am selben Ort erstellt.

#### 2. Terminal / Eingabeaufforderung öffnen
*   **Windows**: Drücken Sie die **Windows-Taste** auf Ihrer Tastatur, tippen Sie `cmd` ein und drücken Sie die **Eingabetaste (Enter)**. Ein schwarzes Fenster (die Eingabeaufforderung) öffnet sich.
*   **Mac (macOS)**: Halten Sie die **Command-Taste (cmd)** gedrückt und drücken Sie die **Leertaste**, tippen Sie `Terminal` ein und drücken Sie die **Eingabetaste (Enter)**.

#### 3. In den Demo-Ordner wechseln (cd)
Der einfachste und sicherste Weg, in den richtigen Ordner zu wechseln, ist die Drag-and-Drop-Methode:
1. Tippen Sie im Terminal-Fenster den Befehl `cd` ein, gefolgt von einem **Leerzeichen** (drücken Sie noch nicht Enter!).
2. Ziehen Sie den entpackten Ordner `ai-newsletter-alternative-hcps` per Drag-and-Drop aus Ihrem Datei-Explorer (Windows Explorer / Mac Finder) direkt in das Terminal-Fenster. Der Pfad wird automatisch eingetragen.
3. Drücken Sie nun die **Eingabetaste (Enter)**.

#### 4. Abhängigkeiten installieren
Geben Sie folgenden Befehl im Terminal ein und drücken Sie **Eingabetaste (Enter)**:
```bash
npm install
```
*   *Was passiert hier?* Der Computer lädt die benötigten Software-Pakete herunter. Dies dauert ca. 10 bis 30 Sekunden. Sobald es fertig ist, erscheint wieder die normale Eingabezeile. (Warnmeldungen/Warnings können Sie einfach ignorieren).

#### 5. Demo starten
Geben Sie folgenden Befehl ein und drücken Sie **Eingabetaste (Enter)**:
```bash
npm run dev
```
*   Das Terminal startet nun einen kleinen lokalen Server auf Ihrem Rechner.
*   Sie sollten eine Meldung wie diese sehen: 
    `Relevance Engine demo running at http://127.0.0.1:5173`
*   **Wichtig:** Lassen Sie dieses Terminal-Fenster während des gesamten Tests geöffnet! Wenn Sie es schließen, stoppt die Demo.

#### 6. Demo im Browser öffnen
Öffnen Sie Ihren bevorzugten Webbrowser (Chrome, Safari, Edge, Firefox) und rufen Sie folgende Adresse auf:
👉 **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

*(Alternativ können Sie im Terminal bei gedrückter `Strg`-Taste (Windows) oder `Cmd`-Taste (Mac) direkt auf den Link klicken).*

---

### ⚠️ Wichtige Hinweise & Fehlerbehebung

*   **Verbindungsdaten:** Der Ordner enthält bereits eine Datei `.env.local` mit einem Demo-API-Schlüssel für OpenAI. Sie müssen keine eigenen Schlüssel eintragen, damit die Live-KI funktioniert.
    *   *Sicherheitshinweis:* Dieser API-Schlüssel ist nur für diesen Test gedacht. Bitte teilen oder veröffentlichen Sie diesen Ordner nicht im Internet.
*   **Fehler: "npm: command not found"**: Das bedeutet, dass Node.js (Voraussetzung oben) nicht oder nicht richtig installiert wurde, oder dass Sie das Terminal nach der Installation nicht neu geöffnet haben. Schließen Sie das Terminal, installieren Sie Node.js noch einmal und öffnen Sie ein neues Terminal.
*   **Fehler: "Port 5173 already in use"**: Ein anderes Programm oder ein alter Testlauf belegt diesen Kanal. Schließen Sie alle Terminal-Fenster und starten Sie Schritt 5 erneut.
*   **Demo beenden:** Wenn Sie fertig sind, schließen Sie einfach das Browser-Tab. Gehen Sie ins Terminal-Fenster, drücken Sie `Strg + C` (oder `Ctrl + C`), um den Server zu stoppen, und schließen Sie das Fenster.
*   **Nur Testdaten:** Die App arbeitet ausschließlich mit fiktiven, synthetischen Patientendaten.
