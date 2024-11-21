const fs = require('fs');
const path = require('path');

// Function to read JSON file
function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Function to write JSON file
function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Get current date in YYYYMMDD format
function getCurrentDate() {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0');
}

// Main function
function processReplies() {
    const repliesPath = 'replies.json';
    const allRepliesPath = 'reports/allreplies.json';
    const dailyReportPath = `reports/${getCurrentDate()}_report.json`;

    const replies = readJsonFile(repliesPath);
    const allReplies = readJsonFile(allRepliesPath);
    const dailyReport = readJsonFile(dailyReportPath);

    const newEntries = replies.filter(reply => 
        !allReplies.some(existingReply => 
            existingReply.author === reply.author && 
            existingReply.permlink === reply.permlink &&
            existingReply.firstResult === reply.firstResult
        )
    );

    if (newEntries.length > 0) {
        allReplies.push(...newEntries);
        dailyReport.push(...newEntries);

        writeJsonFile(allRepliesPath, allReplies);
        writeJsonFile(dailyReportPath, dailyReport);

        console.log(`Added ${newEntries.length} new entries.`);
    } else {
        console.log('No new entries to add.');
    }
}

// Run the process
processReplies();