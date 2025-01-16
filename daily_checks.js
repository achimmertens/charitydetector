const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptName, args = []) {
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

async function runDailyChecks() {
    const tags = ['charity', 'help'];
    try {
        for (const tag of tags) {
            console.log(`\n--- Processing tag: ${tag} ---\n`);
            
            console.log('Running fetchHive.js...');
            await runScript('fetchHive.js', [tag]);
            
            const date = new Date();
            const formattedDate = date.toISOString().slice(2, 10).replace(/-/g, '');
            const filePath = path.join(__dirname, `./reports/posts_${formattedDate}_${tag}.json`);
            
            console.log('Running processContents.js...');
            await runScript('processContents.js', [filePath]);
        }
    } catch (error) {
        console.error(`Error in daily checks: ${error.message}`);
    }
}

runDailyChecks();

