const fs = require('fs');
const path = require('path');
const https = require('https');

// Function to get the current week number
function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil((diff + start.getTimezoneOffset() * 60 * 1000) / oneWeek);
  }

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
    console.error('Error: No input file specified. Please start the process i.e. like this: "node createCharityReport.js reports/next_report.json"');
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

                    // First, try to find an image in the ![](url) format
                    let imageUrlMatch = postBody.match(/!\[.*?\]\((.*?)\)/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                        resolve(imageUrlMatch[1]);
                        return;
                    }

                    // If not found, search for https://*.jpg
                    imageUrlMatch = postBody.match(/(https:\/\/[^\s]+\.jpg)/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                        resolve(imageUrlMatch[1]);
                        return;
                    }
                    // If not found, search for https://*.png
                    imageUrlMatch = postBody.match(/(https:\/\/[^\s]+\.png)/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                        resolve(imageUrlMatch[1]);
                        return;
                    }

                    // If not found, search for https://*.gif
                    imageUrlMatch = postBody.match(/(https:\/\/[^\s]+\.gif)/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                        resolve(imageUrlMatch[1]);
                        return;
                    }
                    

                    // If still not found, resolve with null
                    resolve(null);
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
const currentWeek = getCurrentWeek();
let markdown = `# Charity Heroes Report
Hello everyone,

Here are the 

![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/23wzWzqvLFLeh8FziFFqjgJkn7wkA2qrXdS5JJj9u69c5Fm5X4hVbeHf5KyKqSxrKQAeg.png)

# Charity Heroes Of Week ${currentWeek}:
|Nr.|Chary Score|Author|url|image|
|-|-|-|-|-|
`;

(async () => {
    for (let [index, item] of reportData.entries()) {
        try {
            const imageUrl = await fetchImageUrlFromPost(item.permlink);
           // const imageUrl = await extractFirstImageUrl(item.permlink);
            const charyScore = extractCharyScore(item.Reply);//-
            markdown += `|${index + 1}.|${charyScore}|@${item.author}|${item.permlink}|![](${imageUrl || 'No image found'})|\n`;//-
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

    markdown += `\n# Call to action\n\n`
    markdown += "![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/Eo2BSgYeC4RZVPxTbUwe7PLwA9TAYhDwgqTRvFucPpWbop9KqwSm9UMJSakh24ojRUd.png)";
    markdown += `\n# What's about this report?\n\n`
    markdown += "![grafik.png](https://files.peakd.com/file/peakd-hive/charitychecker/Eo2BSgYeC4RZVPxTbUwe7PLwA9TAYhDwgqTRvFucPpWbop9KqwSm9UMJSakh24ojRUd.png)";
    markdown += `\n# Links to follow:
    \n* [Achim Mertens](https://peakd.com/@achimmertens)
    \n* [CharityChecker](https://peakd.com/@charitychecker)
    \n* [About Charitychecker](https://peakd.com/hive-149312/@charitychecker/charitychecker-my-introducemyself-deutschenglish)
    \n* [Hive Marketing](https://peakd.com/c/hive-154303/trending)
    \n* [Advertisingbot2](https://peakd.com/@advertisingbot2)
    \n\n Let's make the world a little bit better.
    \nRegards,
    CharityChecker (alias @achimmertens)
    `;

    // Generate output file name based on input file name
    const outputFileName = path.basename(inputFilePath, '.json') + '_report.md';
    const outputFilePath = path.join(path.dirname(inputFilePath), outputFileName);
    // Write the Markdown to a file
    fs.writeFileSync(outputFilePath, markdown);

    console.log(`Markdown report generated: ${outputFilePath}`);
    console.log(markdown);
})();
