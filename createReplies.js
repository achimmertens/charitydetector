const fs = require('fs');
const path = require('path');

// Load the existing JSON files
const allreadyUpvotedJSON = fs.readFileSync('./reports/allreadyUpvoted.json');
const allreadyUpvoted = JSON.parse(allreadyUpvotedJSON);

// Get the latest Upvotedate
const latestUpvoteDate = new Date(allreadyUpvoted[allreadyUpvoted.length - 1].Upvotedate);

// Get the current date formatted as YYMMDD
const date = new Date();
const formattedDate = date.toISOString().slice(2, 10).replace(/-/g, '');

// Read all results files in the ./reports directory
const resultsDir = './reports';
const resultFiles = fs.readdirSync(resultsDir).filter(file => {
    const match = file.match(/^results_(\d{6})_(charity|help)\.json$/);
    if (match) {
        const fileDate = new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
        return fileDate <= latestUpvoteDate;
    }
    return false;
});

// Combine the results from all matching files
let results = [];
resultFiles.forEach(file => {
    const rawData = fs.readFileSync(path.join(resultsDir, file));
    const parsedData = JSON.parse(rawData);
    results = results.concat(parsedData);
});

// Initialize an array to store the filtered entries
let replies = [];

function cleanReply(reply) {
    // Entfernen Sie Zeilenumbrüche, zusätzliche Anführungszeichen und Pluszeichen
    let cleaned = reply
        .replace(/\\n/g, ' ')  // Ersetze Zeilenumbrüche durch Leerzeichen
        .replace(/^['"]|['"]$/g, '')  // Entferne Anführungszeichen am Anfang und Ende
        .replace(/'\s*\+\s*'/g, '')  // Entferne Verkettungsoperatoren
        .replace(/"\s*\+\s*"/g, '')  // Entferne auch doppelte Anführungszeichen bei Verkettung
        .replace(/\s+/g, ' ')  // Reduziere mehrere Leerzeichen auf eines
        .trim();  // Entferne Leerzeichen am Anfang und Ende

    // Entferne verbleibende einzelne Anführungszeichen
    cleaned = cleaned.replace(/'/g, '');

    // Entferne verbleibende doppelte Anführungszeichen
    cleaned = cleaned.replace(/"/g, '');

    return cleaned;
}

// Filter the results and create replies
results.forEach(entry => {
    if (entry.secondResult) {
        const cleanedReply = cleanReply(entry.secondResult);
        replies.push({
            author: entry.content.author,
            permlink: entry.content.permlink,
            reply: cleanedReply
        });
    }
});

// Write the replies to a new file
const repliesFilePath = path.join(resultsDir, `replies_${formattedDate}.json`);
fs.writeFileSync(repliesFilePath, JSON.stringify(replies, null, 2), 'utf8');
console.log(`Replies saved to ${repliesFilePath}`);
