const fs = require('fs');
const { Client } = require('@hiveio/dhive');
const config = require('./hiveConfig.js');
const { PrivateKey } = require('@hiveio/dhive');

// Hive client initialisieren
const client = new Client('https://api.hive.blog');

// JSON-Datei lesen
const rawData = fs.readFileSync('replies.json');
const replies = JSON.parse(rawData);

function cleanReply(reply) {
  // Entfernen Sie Zeilenumbrüche, zusätzliche Anführungszeichen und Pluszeichen
  let cleaned = reply.replace(/\\n/g, ' ')
    .replace(/^['"]|['"]$/g, '')
    .replace(/'\s*\+\s*'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Entfernen Sie alles nach dem ersten Vorkommen von '},
  const endIndex = cleaned.indexOf('},');
  if (endIndex !== -1) {
    cleaned = cleaned.substring(0, endIndex);
  }

  return cleaned;
}



// Funktion zum Posten eines Kommentars
async function postComment(author, permlink, body) {
  try {
    const privateKeyString = config.privateKey;
    if (!privateKeyString) {
      throw new Error('Privater Schlüssel ist nicht definiert');
    }

    // Konvertieren Sie den String in ein PrivateKey-Objekt
    const privateKey = PrivateKey.from(privateKeyString);

    const parentAuthor = author;
    const parentPermlink = permlink.split('/').pop();
    const commentPermlink = 're-' + parentPermlink + '-' + Date.now();

    // Bereinigen Sie die Antwort
    // const cleanedBody = cleanReply(body);

    await client.broadcast.comment({
      author: 'charitychecker',
      body: body,
      json_metadata: JSON.stringify({}),
      parent_author: parentAuthor,
      parent_permlink: parentPermlink,
      permlink: commentPermlink,
      title: ''
    }, privateKey);

    console.log(`Kommentar erfolgreich gepostet: ${permlink}`);
  } catch (error) {
    console.error(`Fehler beim Posten des Kommentars: ${permlink}`, error);
    console.error('Fehler Details:', error.stack);
  }
}

// Funktion zum Senden eines Upvotes
async function sendUpvote(author, permlink, weight) {
  try {
    // Entfernen Sie eventuelle führende '@' oder '/'
    permlink = '@' + permlink //.replace(/^[@/]+/, '');

    // Teilen Sie den Permlink in Autor und eigentlichen Permlink
    const parts = permlink.split('/');

    if (parts.length < 2) {
      throw new Error('Ungültiges Permlink-Format');
    }

    // Der letzte Teil ist der eigentliche Permlink
    const actualPermlink = parts.pop();
    // Der Rest ist der Autor (falls der Autor einen '/' im Namen hat)
    const actualAuthor = parts.join('/');

    console.log(`Versuche Upvote zu senden für: ${actualAuthor}/${actualPermlink}`);

    const privateKey = PrivateKey.from(config.privateKey);

    await client.broadcast.vote({
      voter: 'charitychecker',  // Neuen Account 'charitychecker' erstellen und hier einfügen
      author: author,
      permlink: actualPermlink,
      weight: weight // 1000 entspricht 10%
    }, privateKey);

    console.log(`Upvote erfolgreich gesendet: ${author}/${permlink}`);
  } catch (error) {
    console.error(`Fehler beim Senden des Upvotes: ${author}/${permlink}`, error);
  }
}


// Funktion zum Erstellen des JSON-Objekts für die Upvotes
function createUpvotedJSON(replies) {
  const upvotedJSON = [];
  for (const reply of replies) {
    const entry = {};
    //entry.entry = upvotedJSON.length + 1;
    entry.content = { author: reply.author, permlink: reply.permlink };
    entry.Upvotedate = new Date().toISOString();
    upvotedJSON.push(entry);
  }
  return JSON.stringify(upvotedJSON, null, 2);
}

// Funktion zum Lesen der bestehenden Daten
function readExistingData(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Wenn die Datei nicht existiert oder leer ist, geben Sie ein leeres Array zurück
    return [];
  }
}


// Funktion zum Schreiben der aktualisierten Daten
function appendToFile(filename, newData) {
  // Lesen Sie die bestehenden Daten
  let existingData = readExistingData(filename);
  // Wenn existingData kein Array ist, machen Sie es zu einem
  if (!Array.isArray(existingData)) {
    existingData = [existingData];
  }
  // Wenn newData ein String ist, parsen Sie es
  if (typeof newData === 'string') {
    try {
      newData = JSON.parse(newData);
    } catch (error) {
      console.error('Fehler beim Parsen der neuen Daten:', error);
      return;
    }
  }
  // Stellen Sie sicher, dass newData ein Array ist
  if (!Array.isArray(newData)) {
    newData = [newData];
  }
  // Fügen Sie die neuen Daten hinzu
  const updatedData = existingData.concat(newData);

  // Schreiben Sie die aktualisierten Daten zurück in die Datei
  fs.writeFileSync(filename, JSON.stringify(updatedData, null, 2));
}

// Durch die Antworten iterieren und Kommentare posten
async function processReplies() {
  for (const reply of replies) {
    const author = reply.author;
    const permlink = reply.permlink.split('@')[1];
    const body = reply.Reply;

    console.log(author, permlink, body);

    // Kommentar posten
    //await postComment(author, permlink, body);

    // 10% Upvote senden
    //await sendUpvote(author, permlink, 1000);

    // Optional: Pause zwischen den Kommentaren, um Rate-Limits zu vermeiden
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Skript ausführen
processReplies().then(() => console.log('Alle Kommentare wurden verarbeitet.'));


// JSON-Datei mit den bereits geupvoteten Kommentaren erstellen
const upvotedJSONStr = createUpvotedJSON(replies);
appendToFile('allreadyUpvoted.json', upvotedJSONStr);