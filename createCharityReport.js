const fs = require('fs');

// Read the JSON file
const jsonData = fs.readFileSync('replies.json', 'utf8');
const data = JSON.parse(jsonData);

// Sort the data by CHARY score in descending order
data.sort((a, b) => {
  const scoreA = parseInt(a.Reply.split(':')[1]) || 0;
  const scoreB = parseInt(b.Reply.split(':')[1]) || 0;
  return scoreB - scoreA;
});

// Generate the Markdown report
let markdown = `# Charity Heroes Of Week 47:

|Nr.|Author|url|image|
|-|-|-|-|
`;

data.forEach((item, index) => {
  const imageUrl = `https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/${item.author}/image.jpg`;
  markdown += `|${index + 1}. |@${item.author}|${item.permlink}|${imageUrl}|\n`;
});

markdown += `\n# What did they do?\n\n`;

data.forEach(item => {
  const replyParts = item.Reply.split(':');
  let description = item.Reply;
  if (replyParts.length > 2) {
    description = replyParts.slice(2).join(':').trim();
  }
  markdown += `## @${item.author} 
${description}\n\n`;
});

// Write the Markdown to a file
fs.writeFileSync('charity_heroes_report.md', markdown);

console.log('Markdown report generated:');
console.log(markdown);