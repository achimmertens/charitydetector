const fs = require('fs').promises;
const { Client, PrivateKey } = require('@hiveio/dhive');
const config = require('./hiveConfig.js');
const path = require('path');

// Hive client initialisieren
const client = new Client('https://api.hive.blog');

// Dynamischer Import von chalk
async function loadChalk() {
  const chalk = await import('chalk');
  return chalk.default;
}

async function readMarkdownFile(filename) {
  try {
    return await fs.readFile(filename, 'utf8');
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return null;
  }
}

async function postToHive(title, body, tags, chalk) {
  try {
    const privateKey = PrivateKey.from(config.privateKey);
    const permlink = `charity-heroes-report-${Date.now()}`;

    const operations = [
      ['comment',
        {
          parent_author: '',
          parent_permlink: 'hive-149312',
          author: 'charitychecker',
          permlink: permlink,
          title: title,
          body: body,
          json_metadata: JSON.stringify({ tags: tags, community: 'hive-149312' })
        }
      ],
      ['comment_options', {
        author: 'charitychecker',
        permlink: permlink,
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [
          [0, {
            beneficiaries: [
              { account: 'achimmertens', weight: 5000 }
            ]
          }]
        ]
      }]
    ];

    await client.broadcast.sendOperations(operations, privateKey);

    console.log(chalk.green(`Post published successfully: https://peakd.com/@charitychecker/${permlink}`));
  } catch (error) {
    console.error(chalk.red('Error posting to Hive:', error.message));
  }
}

async function main() {
  const chalk = await loadChalk();

  if (process.argv.length < 3) {
    console.log(chalk.red('Error: No input file specified. Please start the process like this: "node postReportToHive.js reports/20241119_report.md"'));
    console.log(chalk.yellow('Usage: node postReportToHive.js <input-file>'));
    process.exit(1);
  }

  const inputFile = path.resolve(process.argv[2]);
  console.log(chalk.cyan(`Processing file: ${inputFile}`));

  const content = await readMarkdownFile(inputFile);
  if (!content) {
    console.log(chalk.red('Error: Could not read input file.'));
    process.exit(1);
  }

  const title = content.split('\n')[0].replace('# ', '');
  const tags = ['charity', 'charitychecker', 'hive-149312', 'report'];

  await postToHive(title, content, tags, chalk);
}

main().catch(error => console.error('Error in main process:', error.message));