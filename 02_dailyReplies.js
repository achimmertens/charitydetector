const { spawn } = require('child_process');

// Utility function to run a script and wait for it to finish
function runScript(script) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', [script]);

    process.stdout.on('data', (data) => {
      console.log(`Output of ${script}: ${data}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`Error output of ${script}: ${data}`);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script ${script} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

// Main function to run the scripts in sequence
async function runDailyReplies() {
  try {
    console.log('Running createReplies.js...');
    await runScript('createReplies.js');
    console.log('createReplies.js finished.');

    console.log('Running processReplies.js...');
    await runScript('processReplies.js');
    console.log('processReplies.js finished.');

    console.log('Running postRepliesToHive.js...');
    await runScript('postRepliesToHive.js');
    console.log('postRepliesToHive.js finished.');

    console.log('All scripts finished successfully.');
  } catch (error) {
    console.error('An error occurred while running the scripts:', error);
  }
}

runDailyReplies();