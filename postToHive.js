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

async function readJsonFile(filename) {
  try {
    const data = await fs.readFile(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
}

async function writeJsonFile(filename, data) {
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
}

function cleanReply(reply) {
  return reply.replace(/\\n/g, ' ')
    .replace(/^['"]|['"]$/g, '')
    .replace(/'\s*\+\s*'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split('},')[0];
}

async function alreadyUpvoted(permlink) {
  const allreadyUpvotedData = await readJsonFile('./reports/allreadyUpvoted.json');
  return allreadyUpvotedData.some(entry => 
    entry.content.permlink.replace('https://peakd.com/@', '') === permlink
  );
}

async function postComment(author, permlink, body, chalk) {
  try {
    const privateKey = PrivateKey.from(config.privateKey);
    const parentPermlink = permlink.split('/').pop();
    const commentPermlink = `re-${parentPermlink}-${Date.now()}`;

    await client.broadcast.comment({
      author: 'charitychecker',
      body,
      json_metadata: '{}',
      parent_author: author,
      parent_permlink: parentPermlink,
      permlink: commentPermlink,
      title: ''
    }, privateKey);

    console.log(chalk.green(`Comment posted successfully: permlink=${permlink}`));
  } catch (error) {
    console.error(chalk.red(`Error posting comment: permlink=${permlink}`, error.message));
  }
}

async function sendUpvote(author, permlink, weight, chalk) {
  try {
    newPermlink = permlink.replace(/^[@/]+/, '');
    const parts = newPermlink.split('/');
    const actualPermlink = parts.pop();
    const actualAuthor = parts.join('/');

    console.log(chalk.blue(`Attempting to upvote: author=${actualAuthor}, permlink=${permlink}`));

    const privateKey = PrivateKey.from(config.privateKey);
    await client.broadcast.vote({
      voter: 'charitychecker',
      author,
      permlink: actualPermlink,
      weight
    }, privateKey);

    console.log(chalk.green(`Upvote sent successfully: author=${author}, permlink=${permlink}`));
  } catch (error) {
    console.error(chalk.red(`Error sending upvote: author=${author}, permlink=${permlink}`, error.message));
  }
}

async function processReply(reply, chalk) {
  const author = reply.author;
  const permlink = reply.permlink.split('@')[1];
  const body = reply.Reply;

  if (await alreadyUpvoted(permlink)) {
    console.log(chalk.yellow(`Entry already processed: permlink=${reply.permlink}`));
    return null;
  }

  console.log(chalk.cyan(`Processing new entry: author=${author}, permlink=${permlink}`));
  await postComment(author, permlink, body, chalk);
  await sendUpvote(author, permlink, 1000, chalk);
  await new Promise(resolve => setTimeout(resolve, 3000));

  return {
    content: { author, permlink },
    Upvotedate: new Date().toISOString()
  };
}

async function processReplies(inputFile) {
  const chalk = await loadChalk();
  const replies = await readJsonFile(inputFile);
  const newReplies = [];

  for (const reply of replies) {
    const processedReply = await processReply(reply, chalk);
    if (processedReply) newReplies.push(processedReply);
  }

  if (newReplies.length > 0) {
    const existingData = await readJsonFile('reports/allreadyUpvoted.json');
    await writeJsonFile('allreadyUpvoted.json', existingData.concat(newReplies));
  }

  console.log(chalk.magenta('All comments have been processed.'));
}

async function main() {
  const chalk = await loadChalk();

  if (process.argv.length < 3) {
    console.log(chalk.red('Error: No input file specified. Please start the process i.e. like this: "node postToHive.js reports/20241119_report.json"'));
    console.log(chalk.yellow('Usage: node postToHive.js <input-file>'));
    process.exit(1);
  }

  const inputFile = path.resolve(process.argv[2]);
  console.log(chalk.cyan(`Processing file: ${inputFile}`));

  await processReplies(inputFile);
}

main().catch(error => console.error('Error in main process:', error.message));
