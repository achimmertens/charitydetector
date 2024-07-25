const fs = require('fs');
const allreadyUpvotedJSON = fs.readFileSync('./allreadyUpvoted.json');

// Load the existing JSON file
let rawdata = fs.readFileSync('results_02.json');
let results = JSON.parse(rawdata);
let allreadyUpvoted = JSON.parse(allreadyUpvotedJSON);

// Initialize an array to store the filtered entries
let replies = [];

// Iterieren Sie durch jeden Eintrag in den Ergebnissen
results.forEach(entry => {
  let permlink = entry.content.permlink.split('/').pop();
  if (!allreadyUpvoted.find((upvoted) => upvoted.permlink === permlink)) {

    // Check if the keyword "CHARY" is present in the result content
    if (entry.secondResult.includes("CHARY")) {
      // Extract the author and permlink
      let author = entry.content.author;

      // Extract the reply content
      let reply = entry.secondResult

      // Push the filtered entry into the replies array
      const cleanedSecondResult = entry.secondResult.replace(/!CHARY:\s+/, '!CHARY:');
    
      // Extrahieren Sie den !CHARY Score aus dem bereinigten secondResult
      const charyScoreMatch = cleanedSecondResult.match(/!CHARY:(\d+)/);
      if (charyScoreMatch) {
        const charyScore = parseInt(charyScoreMatch[1], 10);

        // Überprüfen Sie, ob der Score größer als 4 ist
        if (charyScore > 4) {
          replies.push({
            "author": author,
            "permlink": entry.content.permlink,
            "Reply": cleanedSecondResult
          });
        }
      }
    }
  }
});

// Save the new JSON file with the filtered entries
fs.writeFileSync('replies.json', JSON.stringify(replies, null, 2));

console.log("New JSON file 'replies.json' has been created.");
