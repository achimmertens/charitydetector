const fs = require('fs').promises;
const util = require('util');
const exec = require('child_process').exec;
const execPromise = util.promisify(exec);
const path = require('path');

function extractContent(output) {
    const startMarker = "content: '";
    const endMarker = " },\n  done_reason:";
    const startIndex = output.indexOf(startMarker) + startMarker.length;
    const endIndex = output.indexOf(endMarker, startIndex);
    if (startIndex >= 0 && endIndex >= 0) {
        return output.substring(startIndex, endIndex).trim().replace(/\\n/g, '\n');
    }
    return '';
}

function formatPermlink(author, oldPermlink) {
    return `https://peakd.com/@${author}/${oldPermlink}`;
}

async function processContents(filePath) {
    try {
        // Lese die angegebene Datei
        console.log(`Lese ${filePath}...`);
        const contentsRaw = await fs.readFile(filePath, 'utf8');
        const contents = JSON.parse(contentsRaw);
        
        // Datei für Ergebnisse erstellen
        const tag = path.basename(filePath).split('_')[2].split('.')[0];
        const resultsFile = `results_${tag}.json`;
        let results = [];

        // Iteriere durch jeden Eintrag
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const summary = content.body; // Hier wird kein JSON.parse benötigt, da content bereits ein Objekt ist
            const author = content.author; 
            const oldpermlink = content.permlink;
            const permlink = formatPermlink(author, oldpermlink);
            console.log(`Verarbeite Eintrag ${i + 1} von ${contents.length}...`);

            // Schreibe content.json
            const contentJson = { content: summary };
            console.log('Schreibe content.json...');
            console.log("ContentJSON: ", contentJson);
            await fs.writeFile('content.json', JSON.stringify(contentJson), 'utf8');

            // Rufe ask_ollama.js mit prompt.json auf
            console.log('Starte ask_ollama.js mit prompt_01.json...');
            try {
                const { stdout: stdout1, stderr: stderr1 } = await execPromise('node ask_ollama.js prompt_01.json');
                
                if (stderr1) console.error('ask_ollama.js Fehler:', stderr1);

                const extractedContent1 = extractContent(stdout1);
                console.log('ask_ollama.js exctracted Ausgabe:', extractedContent1);

                // Ergebnis speichern
                results.push({
                    entry: i + 1,
                    content: {
                        body: summary,
                        author: author,
                        permlink: permlink
                    },
                    firstResult: extractedContent1
                });

                // Zweites Mal ask_ollama.js mit prompt_02.json aufrufen
                const contentJson2 = { content: extractedContent1 };
                await fs.writeFile('content.json', JSON.stringify(contentJson2), 'utf8');
                console.log('Starte ask_ollama.js mit prompt_02.json...');
                const { stdout: stdout2, stderr: stderr2 } = await execPromise('node ask_ollama.js prompt_02.json');
                console.log('ask_ollama.js Ausgabe:', stdout2);
                if (stderr2) console.error('ask_ollama.js Fehler:', stderr2);

                const extractedContent2 = extractContent(stdout2);

                // Zweites Ergebnis speichern
                results[results.length - 1].secondResult = extractedContent2;

                // Ergebnisse in Datei speichern
                await fs.writeFile(resultsFile, JSON.stringify(results, null, 2), 'utf8');
            } catch (error) {
                console.error('Fehler beim Ausführen von ask_ollama.js:', error);
            }

            console.log(`Eintrag ${i + 1} abgeschlossen.`);
            console.log('------------------------------------');
        }

        // Speichere die Ergebnisse
        await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
        console.log(`Ergebnisse gespeichert in ${resultsFile}`);
    } catch (error) {
        console.error(`Error processing contents: ${error.message}`);
    }
}

// Hole den Dateipfad aus den Kommandozeilenargumenten
const filePath = process.argv[2];
if (filePath) {
    processContents(filePath);
} else {
    console.error('Bitte geben Sie den Pfad zur Datei als Parameter an.');
}
