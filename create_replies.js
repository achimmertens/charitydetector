const fs = require('fs');
const allreadyUpvotedJSON = fs.readFileSync('./allreadyUpvoted.json');

// Load the existing JSON file
let rawdata = fs.readFileSync('results.json');
let results = JSON.parse(rawdata);
let allreadyUpvoted = JSON.parse(allreadyUpvotedJSON);

// Initialize an array to store the filtered entries
let replies = [];

// Iterate through each entry in the results
results.forEach(entry => {

  let permlink = entry.content.permlink;
  if (!allreadyUpvoted.find((entry) => entry.permlink.split('/').pop() === permlink)) {

    // Check if the keyword "CHARY" is present in the result content
    if (entry.result.includes("CHARY")) {
      // Extract the author and permlink
      let author = entry.content.author;
      
      // Construct the new permlink
      let fullPermlink = `https://peakd.com/@${author}/${permlink}`;

      // Extract the reply content
      let reply = entry.result.split('content: ')[1].trim();
      reply = reply.substring(1, reply.length - 2); // Remove the enclosing single quotes and the comma at the end

      // Push the filtered entry into the replies array
      replies.push({
        "author": author,
        "permlink": fullPermlink,
        "Reply": reply
      });
    }
  }
});

// Save the new JSON file with the filtered entries
fs.writeFileSync('replies.json', JSON.stringify(replies, null, 2));

console.log("New JSON file 'replies.json' has been created.");
