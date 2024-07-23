const fs = require('fs').promises;
const util = require('util');
const exec = require('child_process').exec;
const execPromise = util.promisify(exec);

async function processContents() {
    try {
        // Lese contents.json
        console.log('Lese contents.json...');
        const contentsRaw = await fs.readFile('results.json', 'utf8');
        const contents = JSON.parse(contentsRaw);
        
        // Datei für Ergebnisse erstellen
        const resultsFile = 'results_02.json';
        let results = [];

        // Iteriere durch jeden Eintrag
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const summary = content.content.body; // Hier wird kein JSON.parse benötigt, da content bereits ein Objekt ist
            console.log(`Verarbeite Eintrag ${i + 1} von ${contents.length}...`);

            // Schreibe content.json
            const contentJson = { content: summary };
            console.log('Schreibe content.json...');
            console.log("ContentJSON: ", contentJson);
            await fs.writeFile('content.json', JSON.stringify(contentJson), 'utf8');

            // Rufe ask_ollama.js mit prompt.json auf
            console.log('Starte ask_ollama.js mit prompt.json...');
            try {
                const { stdout: stdout1, stderr: stderr1 } = await execPromise('node ask_ollama.js prompt.json');
                console.log('ask_ollama.js Ausgabe:', stdout1);
                if (stderr1) console.error('ask_ollama.js Fehler:', stderr1);

                // Ergebnis speichern
                results.push({
                    entry: i + 1,
                    content: {
                        body: summary,
                        author: content.author,
                        permlink: content.permlink
                    },
                    firstResult: stdout1.trim()
                });

                // Zweites Mal ask_ollama.js mit prompt_02.json aufrufen
                const contentJson2 = { content: stdout1.trim() };
                await fs.writeFile('content.json', JSON.stringify(contentJson2), 'utf8');
                console.log('Starte ask_ollama.js mit prompt_02.json...');
                const { stdout: stdout2, stderr: stderr2 } = await execPromise('node ask_ollama.js prompt_02.json');
                console.log('ask_ollama.js Ausgabe:', stdout2);
                if (stderr2) console.error('ask_ollama.js Fehler:', stderr2);

                // Zweites Ergebnis speichern
                results[results.length - 1].secondResult = stdout2.trim();

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
