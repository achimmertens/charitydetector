const fs = require('fs');

// Load the existing JSON file
let rawdata = fs.readFileSync('results.json');
let results = JSON.parse(rawdata);

// Initialize an array to store the filtered entries
let replies = [];

// Iterate through each entry in the results
results.forEach(entry => {
  // Check if the keyword "CHARY" is present in the result content
  if (entry.result.includes("CHARY")) {
    // Extract the author, permlink, and reply content
    let author = entry.content.author;
    let permlink = entry.content.permlink;
    let reply = entry.result.split('content: ')[1].trim();
    reply = reply.substring(1, reply.length - 2); // Remove the enclosing single quotes and the comma at the end

    // Push the filtered entry into the replies array
    replies.push({
      "author": author,
      "permlink": permlink,
      "Reply": reply
    });
  }
});

// Save the new JSON file with the filtered entries
fs.writeFileSync('replies.json', JSON.stringify(replies, null, 2));

console.log("New JSON file 'replies.json' has been created.");
