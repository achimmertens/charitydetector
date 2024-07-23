const fs = require('fs').promises;
const axios = require('axios');

async function main() {
    try {
        // Prompt aus prompt.json laden
        const promptData = JSON.parse(await fs.readFile('prompt.json', 'utf8'));
        const prompt = promptData.prompt;

        // Content aus content.json laden
        const contentData = JSON.parse(await fs.readFile('content.json', 'utf8'));
        const content = contentData.content;

        // Zeitstempel vor der API-Abfrage
        const startTime = new Date();
        console.log(`Start Zeit: ${startTime.toLocaleString()}`);

        // POST-Daten zusammenstellen
        const postData = {
            "model": "charyllama3",
            "messages": [
                {
                    "role": "user",
                    "content": `${prompt} ${content}`
                }
            ],
            "stream": false
        };

        // POST-Anfrage senden
        const url = 'http://127.0.0.1:11434/api/chat';
        const headers = {'Content-Type': 'application/json'};
        const response = await axios.post(url, postData, { headers });

        // Zeitstempel nach der API-Abfrage
        const endTime = new Date();
        console.log(`Ende Zeit: ${endTime.toLocaleString()}`);

        // Antwort ausgeben
        console.log(response.data);
        
    } catch (error) {
        console.error('Ein Fehler ist aufgetreten:', error);
    }
}

main();
