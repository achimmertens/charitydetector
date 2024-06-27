const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

async function processContents() {
    try {
        // Lese contents.json
        console.log('Lese contents.json...');
        const contentsRaw = await fs.readFile('contents.json', 'utf8');
        const contents = JSON.parse(contentsRaw);

        // Datei für Ergebnisse erstellen
        const resultsFile = 'results.json';
        let results = [];

        // Iteriere durch jeden Eintrag
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            console.log(`Verarbeite Eintrag ${i + 1} von ${contents.length}...`);

            // Schreibe content.json
            const contentJson = { content: content.body };
            console.log('Schreibe content.json...');
            await fs.writeFile('content.json', JSON.stringify(contentJson), 'utf8');

            // Rufe ask_ollama.js auf
            console.log('Starte ask_ollama.js...');
            try {
                const { stdout, stderr } = await execPromise('node ask_ollama.js');
                console.log('ask_ollama.js Ausgabe:', stdout);
                if (stderr) console.error('ask_ollama.js Fehler:', stderr);

                // Ergebnis speichern
                results.push({
                    entry: i + 1,
                    content: {
                        body: content.body,
                        author: content.author,
                        permlink: content.permlink
                    },
                    result: stdout.trim()
                });

                // Ergebnisse in Datei speichern
                await fs.writeFile(resultsFile, JSON.stringify(results, null, 2), 'utf8');
            } catch (error) {
                console.error('Fehler beim Ausführen von ask_ollama.js:', error);
            }

            console.log(`Eintrag ${i + 1} abgeschlossen.`);
            console.log('------------------------------------');
        }

        console.log('Alle Einträge wurden verarbeitet.');
    } catch (error) {
        console.error('Ein Fehler ist aufgetreten:', error);
    }
}

processContents();
