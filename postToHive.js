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
      const cleanedBody = cleanReply(body);
  
      await client.broadcast.comment({
        author: 'anobel',
        body: cleanedBody,
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
    permlink = '@'+permlink //.replace(/^[@/]+/, '');
    
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
        voter: 'anobel',
        author: author,
        permlink: actualPermlink,
        weight: weight // 1000 entspricht 10%
      }, privateKey);
  
      console.log(`Upvote erfolgreich gesendet: ${author}/${permlink}`);
    } catch (error) {
      console.error(`Fehler beim Senden des Upvotes: ${author}/${permlink}`, error);
    }
  }

// Durch die Antworten iterieren und Kommentare posten
async function processReplies() {
  for (const reply of replies) {
    const author = reply.author;
    const permlink = reply.permlink.split('@')[1];
    const body = reply.Reply;

    // await postComment(author, permlink, body);

    // 10% Upvote senden
    await sendUpvote(author, permlink, 1000);
    
    // Optional: Pause zwischen den Kommentaren, um Rate-Limits zu vermeiden
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Skript ausführen
processReplies().then(() => console.log('Alle Kommentare wurden verarbeitet.'));
