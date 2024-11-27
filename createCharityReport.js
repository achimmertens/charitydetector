const fs = require('fs');
const path = require('path');
const https = require('https');

// Function to read the JSON file
function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        process.exit(1);
    }
}

// Check if a file path is provided as an argument
if (process.argv.length < 3) {
    console.error('Error: No input file specified.');
    console.log('Usage: node createCharityReport.js <path-to-report-file>');
    process.exit(1);
}

// Get the file path from command line argument
const inputFilePath = path.resolve(process.argv[2]);

// Read the JSON file
const reportData = readJsonFile(inputFilePath);
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

// Sort the data by CHARY score in descending order
reportData.sort((a, b) => {
    const scoreA = parseInt(extractCharyScore(a.Reply)) || 0;
    const scoreB = parseInt(extractCharyScore(b.Reply)) || 0;
    return scoreB - scoreA;
});
// Function to fetch the image URL from the post content
function fetchImageUrlFromPost(permlink) {
    return new Promise((resolve, reject) => {
        const imageSource = permlink;
        const jsonUrl = `https://hive.blog/${imageSource.replace('peakd.com', 'hive.blog')}.json`;

        https.get(jsonUrl, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    const postBody = jsonData.post.body;
                    const imageUrlMatch = postBody.match(/!\[.*?\]\((.*?)\)/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                        resolve(imageUrlMatch[1]);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Generate the Markdown report
let markdown = `# Charity Heroes Report

|Nr.|Chary Score|Author|url|image|
|-|-|-|-|-|
`;

(async () => {
    for (let [index, item] of reportData.entries()) {
        try {
            const imageUrl = await fetchImageUrlFromPost(item.permlink);
            const charyScore = extractCharyScore(item.Reply);
            markdown += `|${index + 1}.|${charyScore}|@${item.author}|${item.permlink}|![](${imageUrl || 'No image found'})|\n`;
        } catch (error) {
            console.error(`Error fetching image for ${item.author}:`, error);
            markdown += `|${index + 1}.|${extractCharyScore(item.Reply)}|@${item.author}|${item.permlink}|Error fetching image|\n`;
        }
    }

    markdown += `\n# What did they do?\n\n`;

    reportData.forEach(item => {
        const description = item.Reply.replace(/!CHARY:\d+\s*/, '').trim();
        markdown += `## @${item.author}
${cleanAndFormatText(description)}\n\n`;
    });

    // Generate output file name based on input file name
    const outputFileName = path.basename(inputFilePath, '.json') + '_report.md';
    const outputFilePath = path.join(path.dirname(inputFilePath), outputFileName);
    // Write the Markdown to a file
    fs.writeFileSync(outputFilePath, markdown);

    console.log(`Markdown report generated: ${outputFilePath}`);
    console.log(markdown);
})();
