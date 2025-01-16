const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function runScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const process = spawn('node', [scriptName, ...args], { stdio: 'inherit' });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`${scriptName} exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function filterAndAddToReport(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const entries = JSON.parse(data);
        const reportPath = path.join(__dirname, './reports/next_report.json');
        let reportEntries = [];

        try {
            const reportData = await fs.readFile(reportPath, 'utf8');
            reportEntries = JSON.parse(reportData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        const existingPermlinks = new Set(reportEntries.map(entry => entry.permlink));

        for (const entry of entries) {
            const secondResultMatch = entry.secondResult.match(/!CHARY:\s*(\d+)/);
            if (secondResultMatch && parseInt(secondResultMatch[1], 10) > 0) {
                if (entry.content && !existingPermlinks.has(entry.content.permlink)) {
                    reportEntries.push({
                        author: entry.content.author,
                        permlink: entry.content.permlink,
                        Reply: entry.secondResult,
                        firstResult: entry.firstResult
                    });
                }
            }
        }

        await fs.writeFile(reportPath, JSON.stringify(reportEntries, null, 2), 'utf8');
        console.log(`Filtered entries added to ${reportPath}`);
    } catch (error) {
        console.error(`Error filtering and adding to report: ${error.message}`);
    }
}

async function runDailyChecks() {
    const tags = ['charity', 'help'];
    try {
        for (const tag of tags) {
            console.log(`\n--- Processing tag: ${tag} ---\n`);
            
            console.log('Running fetchHive.js...');
            await runScript('fetchHive.js', [tag]);
            
            const date = new Date();
            const formattedDate = date.toISOString().slice(2, 10).replace(/-/g, '');
            const postsFilePath = path.join(__dirname, `./reports/posts_${formattedDate}_${tag}.json`);
            const resultsFilePath = path.join(__dirname, `./reports/results_${formattedDate}_${tag}.json`);
            
            console.log('Running processContents.js...');
            await runScript('processContents.js', [postsFilePath]);

            console.log(`Filtering and adding entries from ${resultsFilePath} to next_report.json...`);
            await filterAndAddToReport(resultsFilePath);
        }
    } catch (error) {
        console.error(`Error in daily checks: ${error.message}`);
    }
}

runDailyChecks();