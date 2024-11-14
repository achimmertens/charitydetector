const fs = require('fs');

// Read the JSON file
const jsonData = fs.readFileSync('replies.json', 'utf8');
const data = JSON.parse(jsonData);

// Function to extract Chary score
function extractCharyScore(reply) {
  const match = reply.match(/!CHARY:(\d+)/);
  return match ? match[1] : 'N/A';
}

// Sort the data by CHARY score in descending order
data.sort((a, b) => {
  const scoreA = parseInt(extractCharyScore(a.Reply)) || 0;
  const scoreB = parseInt(extractCharyScore(b.Reply)) || 0;
  return scoreB - scoreA;
});

// Generate the Markdown report
let markdown = `
Hello everyone,

Here are the 

![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/23wzWzqvLFLeh8FziFFqjgJkn7wkA2qrXdS5JJj9u69c5Fm5X4hVbeHf5KyKqSxrKQAeg.png)

# Charity Heroes Of Week 47:

|Nr.|Chary Score|Author|url|image|
|-|-|-|-|-|
`;

data.forEach((item, index) => {
  const imageUrl = `https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/${item.author}/image.jpg`;
  const charyScore = extractCharyScore(item.Reply);
  markdown += `|${index + 1}.|${charyScore}|@${item.author}|${item.permlink}|${imageUrl}|\n`;
});

markdown += `\n# What did they do?\n\n`;

data.forEach(item => {
  const description = item.Reply.replace(/!CHARY:\d+\s*/, '').trim();
  markdown += `## @${item.author} 
${description}\n\n`;
});

markdown += `\n
# What you can do
You can support the authors or the people, who are mentioned by the authors, with donations, upvotes, rebloggs, good comments, prayers and whatever you may think of.
I want to, based on this report, start an advertising campaign in the next days. If you want to join, please follow @advertisingbot2 or the community [Hive Marketing](https://peakd.com/c/hive-154303/trending). There you can get a chance to earn a bit Hive by writing a sentence about these people. So stay tuned.

![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/23tSzWXZGdpaNXLfximVDLkYdX5rR1jUiQZpyTU4bvPAW2k1BRwq9XJ8jv48va3WqKJEZ.png)


# What's About This Report
I (@achimmertens) have created a few scripts, that download some posts from the Hive blockchain, read them with an AI bot and check them for charity content. If the score is high enough, then my bot @charitychecker writes a comment below the post. 
One can use this comment to further process it, i.e. creating (regular) reports like this. Also everyone can see, that this post has been checked by an AI and by me (as a curator) for charity content ([More details see here](https://peakd.com/hive-149312/@charitychecker/charitychecker-my-introducemyself-deutschenglish)).


![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/23tSyz4YxBQNJcHeuR5JWdWDbJsWaGXvGNhRR6QtPg4R9SBvCBUDPK4VGRjwWYPuvzM8K.png)

Let's make the world a little bit better.

Regards,
CharityChecker (alias @achimmertens)
`

// Write the Markdown to a file
fs.writeFileSync('charity_heroes_report.md', markdown);

console.log('Markdown report generated:');
console.log(markdown);