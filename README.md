# Castlevania: Der Aschenmond

Ein eigenständiges 8-Bit-Fanabenteuer mit prozedural gezeichneter Pixelgrafik und originaler Synth-Musik. Mira Belmont reist durch den verfluchten Wald, die Krypta und den Burghof, um den Nachtgrafen aufzuhalten.

## Start

index.html direkt im Browser öffnen. Es werden keine Pakete oder Builds benötigt. Der Start versucht, den Browser in den Vollbildmodus zu schalten. Browser erlauben Vollbild erst nach einer Nutzergeste; der Vollbildknopf bleibt immer verfügbar.

## Steuerung

- Pfeiltasten oder A/D: laufen
- Leertaste oder Pfeil hoch: springen
- Z: Peitsche
- X: Wurfmesser (kostet Herzen)
- C: Mondsturm (nach drei blauen Sigillen)
- P oder Esc: pausieren
- M: Ton an/aus
- F: Vollbild umschalten
- Enter: starten oder nach einem Ende neu beginnen

Xbox-Controller im Edge-Browser: A springt, B entfesselt den Mondsturm, X schlägt mit der Peitsche, Y wirft ein Messer, Steuerkreuz oder linker Stick bewegt Mira, Start pausiert oder startet. Auf Touch-Geräten erscheinen große Bildschirmknöpfe; beim Start wird Querformat angefordert.

## Neue Ideen im Spiel

- Drei Regionen mit eigenen Farben und Kulissen: Wald, Krypta und Burg.
- Drei versteckte Mondsigillen laden einen bildschirmfüllenden Flächenangriff auf und verletzen auch den Boss.
- Gebietseinblendungen und eigene Übergangsstinger machen den Weg vom Wald bis zur Krypta und Burg lesbarer.
- Neue Grabeshunde kündigen ihren Sprung an und preschen dann durch die Stage.
- Die Peitsche kann Feuerkugeln im richtigen Moment zurückschlagen; Treffer geben Bonuspunkte und können den Boss treffen.
- Relikte aus Kerzen verbessern die Peitsche bis Stufe III.
- Schnelle Treffer bauen einen Punkte-Kombozähler auf.
- Der Nachtgraf wechselt bei halber Energie in eine schnellere zweite Phase mit eigener Melodie und digitalem Schlagzeug.
- Die Bestpunktzahl bleibt lokal im Browser gespeichert.

Die Grafik und Musik entstehen direkt im Code. Es werden keine externen Assets oder Audiodienste benötigt.

## GitHub Pages

Der Workflow unter .github/workflows/pages.yml veröffentlicht den Repository-Stamm bei jedem Push auf main. Es ist eine statische Seite ohne Build-Schritt.

Das Spiel füllt im Browser immer die größte verfügbare 16:9-Fläche aus. Auf Displays mit anderem Seitenverhältnis bleiben schmale Balken sichtbar, damit Pixelgrafik und Spiellogik nicht verzerrt werden. Vollbild wird beim Spielstart angefragt; der Browser verlangt dafür eine Nutzergeste.
