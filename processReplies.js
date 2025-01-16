const fs = require('fs');
const path = require('path');

// Utility function to read JSON file
function readJsonFile(filePath) {
    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath);
        return JSON.parse(rawData);
    }
    return [];
}

// Utility function to write JSON file
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
    const allRepliesPath = 'reports/allreplies.json';
    const allReplies = readJsonFile(allRepliesPath);

    // Get the oldest date from allreplies.json
    const oldestReplyDate = new Date(allReplies[allReplies.length - 1].replyDate);
    console.log(`Oldest Reply Date: ${oldestReplyDate}`);

    // Read all reply files in the ./reports directory
    const resultsDir = './reports';
    const replyFiles = fs.readdirSync(resultsDir).filter(file => {
        const match = file.match(/^replies_(\d{6})\.json$/);
        if (match) {
            const fileDate = new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
            console.log(`Found file: ${file} with date: ${fileDate}`);
            return fileDate > oldestReplyDate;
        }
        return false;
    });
    console.log(`Reply Files: ${replyFiles}`);

    // Combine the replies from all matching files
    let replies = [];
    replyFiles.forEach(file => {
        const rawData = fs.readFileSync(path.join(resultsDir, file));
        const parsedData = JSON.parse(rawData);
        console.log(`Parsed ${file}: ${parsedData.length} entries`);
        replies = replies.concat(parsedData);
    });
    console.log(`Combined Replies: ${replies.length} entries`);

    const dailyReportPath = `reports/${getCurrentDate()}_report.json`;
    const dailyReport = readJsonFile(dailyReportPath);

    const newEntries = replies.filter(reply => {
        return !allReplies.some(existingReply => existingReply.content && existingReply.content.permlink === reply.permlink);
    });

    console.log(`New Entries: ${newEntries.length} entries`);

    // Update allreplies.json and daily report
    const updatedAllReplies = allReplies.concat(newEntries.map(reply => ({
        content: {
            author: reply.author,
            permlink: reply.permlink,
            Reply: reply.reply,
            firstResult: reply.firstResult
        },
        replyDate: new Date().toISOString()
    })));
    writeJsonFile(allRepliesPath, updatedAllReplies);
    writeJsonFile(dailyReportPath, newEntries);

    console.log(`Replies processed and saved to ${allRepliesPath} and ${dailyReportPath}`);
}

processReplies();