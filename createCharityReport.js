const fs = require('fs');

// Read the JSON files
const repliesData = JSON.parse(fs.readFileSync('replies.json', 'utf8'));
const resultsData = JSON.parse(fs.readFileSync('results_02.json', 'utf8'));

// Function to extract Chary score
function extractCharyScore(reply) {
  const match = reply.match(/!CHARY:(\d+)/);
  return match ? match[1] : 'N/A';
}

// Function to clean and format the text
function cleanAndFormatText(text) {
  return text
    .replace(/^['"]|['"]$/g, '') // Remove leading and trailing quotes
    .replace(/'\s*\+\s*'/g, '\n') // Replace ' + ' with newline
    .replace(/"\s*\+\s*"/g, '\n') // Replace " + " with newline
    .replace(/\\t/g, '  ') // Replace \t with two spaces
    .replace(/\\n/g, '\n') // Replace \n with actual newline
    .replace(/\s*\+\s*/g, '') // Remove any remaining '+' with spaces around them
    .split('\n') // Split into lines
    .map(line => line.trim()) // Trim each line
    .filter(line => line !== '') // Remove empty lines
    .map(line => {
      line = line.replace(/['"]$/, ''); // Remove trailing quotes
      if (line.startsWith('*')) {
        return '  ' + line; // Add two spaces before bullet points
      }
      return line;
    })
    .join('\n') // Join back into a single string
    .replace(/([.:])(\S)/g, '$1 $2') // Add space after periods and colons if missing
    .replace(/\*\*/g, '') // Remove any remaining asterisks used for bold formatting
    .trim(); // Final trim
}

// Create a map of authors to their firstResult
const authorResults = {};
resultsData.forEach(item => {
  authorResults[item.content.author] = cleanAndFormatText(item.firstResult);
});

// Sort the data by CHARY score in descending order
repliesData.sort((a, b) => {
  const scoreA = parseInt(extractCharyScore(a.Reply)) || 0;
  const scoreB = parseInt(extractCharyScore(b.Reply)) || 0;
  return scoreB - scoreA;
});

// Generate the Markdown report
let markdown = `# Charity Heroes Of Week 47:

|Nr.|Chary Score|Author|url|image|
|-|-|-|-|-|
`;

repliesData.forEach((item, index) => {
  const imageUrl = `https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/${item.author}/image.jpg`;
  const charyScore = extractCharyScore(item.Reply);
  markdown += `|${index + 1}.|${charyScore}|@${item.author}|${item.permlink}|${imageUrl}|\n`;
});

markdown += `\n# What did they do?\n\n`;

repliesData.forEach(item => {
  const description = authorResults[item.author] || item.Reply.replace(/!CHARY:\d+\s*/, '').trim();
  markdown += `## @${item.author} 
${description}\n\n`;
});

// Write the Markdown to a file
fs.writeFileSync('charity_heroes_report.md', markdown);

console.log('Markdown report generated:');
console.log(markdown);