// This script reads reply files, fetches additional post data, and generates a Markdown report.
// It combines replies, sorts them, and includes author reputation and image URL in the report.
// The final report is saved as a Markdown file in the reports directory.
// Die Reply Files, die gelesen werden, sind die Dateien im Verzeichnis reports, die dem Muster replies_YYMMDD.json entsprechen und deren Datum jünger ist als das Last-Report-Datum. 


const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Dynamischer Import von chalk
async function loadChalk() {
  const chalk = await import('chalk');
  return chalk.default;
}

// Utility function to read JSON file
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

// Utility function to write JSON file
async function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Get the latest report date from the report files
async function getLastReportDate(reportsDir) {
  const reportFiles = await fs.readdir(reportsDir);
  const reportDates = reportFiles
    .filter(file => file.match(/^report_(\d{6})\.json$/))
    .map(file => {
      const match = file.match(/^report_(\d{6})\.json$/);
      return new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
    });
  return new Date(Math.max.apply(null, reportDates));
}

// Function to get the current week number
function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = (now - start + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000) / 86400000;
  return Math.floor((diff + start.getDay() + 1) / 7);
}

// Get Image and Reputation from author
async function fetchPostData(permlink) {
  return new Promise((resolve, reject) => {
    const jsonUrl = `https://hive.blog/${permlink.replace('peakd.com', 'hive.blog')}.json`;

    https.get(jsonUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          const postBody = jsonData.post.body;
          const authorReputation = Math.floor(jsonData.post.author_reputation / 1000000000);

          // First, try to find an image in the ![](url) format
          let imageUrl = null;
          let imageUrlMatch = postBody.match(/!\[.*?\]\((.*?)\)/);
          if (imageUrlMatch && imageUrlMatch[1]) {
            imageUrl = imageUrlMatch[1];
          } else {
            imageUrlMatch = postBody.match(/(https:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp))/i);
            if (imageUrlMatch && imageUrlMatch[1]) {
              imageUrl = imageUrlMatch[1];
            }
          }

          resolve({
            imageUrl: imageUrl,
            authorReputation: authorReputation
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Main function
async function createCharityReport() {
  const chalk = await loadChalk();
  const reportsDir = './reports';
  const lastReportDate = await getLastReportDate(reportsDir);
  console.log(`Last Report Date: ${lastReportDate}`);

  // Read all reply files in the ./reports directory
  const replyFiles = (await fs.readdir(reportsDir)).filter(file => {
    const match = file.match(/^replies_(\d{6})\.json$/);
    if (match) {
      const fileDate = new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
      return fileDate > lastReportDate;
    }
    return false;
  });
  console.log(`Reply Files: ${replyFiles}`);

  // Combine the replies from all matching files
  let combinedReplies = [];
  for (const file of replyFiles) {
    const replies = await readJsonFile(path.join(reportsDir, file));
    combinedReplies = combinedReplies.concat(replies);
  }
  console.log(`Combined Replies: ${combinedReplies.length} entries`);

  // Use the combined replies directly
  const reportData = combinedReplies;

  // Sort the report data if needed
  reportData.sort((a, b) => {
    return new Date(a.replyDate) - new Date(b.replyDate);
  });

  // Get the current week number
  const currentWeek = getCurrentWeek();

  // Fetch post data for each entry
  for (const entry of reportData) {
    const postData = await fetchPostData(entry.permlink);
    entry.imageUrl = postData.imageUrl;
    entry.authorReputation = postData.authorReputation;
    console.log(chalk.green(`AuthorReputation for ${entry.author} is ${entry.authorReputation}`));
  }

  // Generate Markdown report
  const markdown = generateMarkdownReport(reportData, currentWeek);

  // Generate output file name based on current date
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(2, 10).replace(/-/g, '');
  const outputFileName = `report_${formattedDate}.md`;
  const outputFilePath = path.join(reportsDir, outputFileName);

  // Write the Markdown to a file
  await fs.writeFile(outputFilePath, markdown);

  console.log(`Markdown report generated: ${outputFilePath}`);
  console.log(markdown);
}

// Function to generate Markdown report from report data
function generateMarkdownReport(reportData, currentWeek) {
  let markdown = `# Charity Heroes Report Week ${currentWeek}\n\n`;
  markdown += `Hello everyone,\n\n`;
  markdown += `Here are the charity heroes of week ${currentWeek}:\n\n`;
  markdown += `![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/23wzWzqvLFLeh8FziFFqjgJkn7wkA2qrXdS5JJj9u69c5Fm5X4hVbeHf5KyKqSxrKQAeg.png)\n\n`;
  markdown += `# Charity Heroes Of Week ${currentWeek}:\n`;
  markdown += `|Nr.|Chary Score|Author|Reputation|url|image|\n`;
  markdown += `|-|-|-|-|-|-|\n`;

  reportData.forEach((entry, index) => {
    markdown += `|${index + 1}|${entry.reply.match(/!CHARY:(\d+)/)[1]}|${entry.author}|${entry.authorReputation}|[Link](${entry.permlink})|![image](${entry.imageUrl})|\n`;
  });

  markdown += `\n\n# What did they do?\n\n`;

  reportData.forEach(entry => {
    markdown += `## @${entry.author}\n`;
    markdown += `${entry.reply}\n\n`;
  });

  markdown += `# Call to action\n\n`;
  markdown += `![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/Eo2BSgYeC4RZVPxTbUwe7PLwA9TAYhDwgqTRvFucPpWbop9KqwSm9UMJSakh24ojRUd.png)\n\n`;
  markdown += `# What's about this report?\n\n`;
  markdown += `![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/Eo2BSgYeC4RZVPxTbUwe7PLwA9TAYhDwgqTRvFucPpWbop9KqwSm9UMJSakh24ojRUd.png)\n\n`;
  markdown += `# Links to follow:\n\n`;
  markdown += `* [Achim Mertens](https://peakd.com/@achimmertens)\n`;
  markdown += `* [CharityChecker](https://peakd.com/@charitychecker)\n`;
  markdown += `* [About Charitychecker](https://peakd.com/hive-149312/@charitychecker/charitychecker-my-introducemyself-deutschenglish)\n`;
  markdown += `* [Hive Marketing](https://peakd.com/c/hive-154303/trending)\n`;
  markdown += `* [Advertisingbot2](https://peakd.com/@advertisingbot2)\n\n`;
  markdown += `Let's make the world a little bit better.\n\n`;
  markdown += `Regards,\n`;
  markdown += `CharityChecker (alias @achimmertens)\n`;

  return markdown;
}

createCharityReport().catch(console.error);