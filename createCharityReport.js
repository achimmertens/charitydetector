const fs = require('fs').promises;
const path = require('path');

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

// Main function
async function createCharityReport() {
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

  // Process the report data as needed
  // Example: Print the report data
  console.log('Report Data:', JSON.stringify(reportData, null, 2));

  // Generate Markdown report
  const markdown = generateMarkdownReport(reportData);

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
function generateMarkdownReport(reportData) {
  let markdown = '# Charity Report\n\n';
  reportData.forEach(entry => {
    markdown += `## ${entry.author}\n\n`;
    markdown += `**Permlink:** [${entry.permlink}](${entry.permlink})\n\n`;
    markdown += `**Reply:** ${entry.reply}\n\n`;
    markdown += `**First Result:**\n\n\`\`\`\n${entry.firstResult}\n\`\`\`\n\n`;
  });
  markdown += `\n\n Let's make the world a little bit better.\n\n Regards,\n CharityChecker (alias @achimmertens)\n`;
  return markdown;
}

createCharityReport().catch(console.error);