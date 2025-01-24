// This script reads replies from a JSON file and posts them to the Hive blockchain.
// It initializes a Hive client, processes each reply, and sends comments and upvotes.
// The script ensures that each reply is posted only once by checking an already upvoted list.

// Inputfile Kriterien: Es wird replies_YYMMDD.json gelesen wo YYMMDD jünger ist als das latestUpvoteDate aus allreadyUpvoted.json.

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

async function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function postRepliesToHive() {
  const chalk = await loadChalk();
  const alreadyUpvotedPath = './reports/allreadyUpvoted.json';

  // Read the already upvoted list
  const alreadyUpvoted = await readJsonFile(alreadyUpvotedPath);
  const latestUpvoteDate = new Date(alreadyUpvoted[alreadyUpvoted.length - 1].Upvotedate);
  console.log(`Latest Upvote Date: ${latestUpvoteDate}`);

  // Read all reply files in the ./reports directory
  const repliesDir = './reports';
  const replyFiles = (await fs.readdir(repliesDir)).filter(file => {
    const match = file.match(/^replies_(\d{6})\.json$/);
    if (match) {
      const fileDate = new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
      return fileDate > latestUpvoteDate;
    }
    return false;
  });
  console.log(`Reply Files: ${replyFiles}`);

  // Combine the replies from all matching files
  let combinedReplies = [];
  for (const file of replyFiles) {
    const replies = await readJsonFile(path.join(repliesDir, file));
    combinedReplies = combinedReplies.concat(replies);
  }
  console.log(`Combined Replies: ${combinedReplies.length} entries`);

  if (combinedReplies.length === 0) {
    console.log(chalk.red('No replies to post.'));
    return;
  }

  console.log(chalk.green(`Posting ${combinedReplies.length} replies to Hive...`));

  // Process each reply and post to Hive
  for (const reply of combinedReplies) {
    const { author, permlink, reply: comment } = reply;

    // Send comment
    await sendComment(author, permlink, comment, chalk);

    // Send upvote
    await sendUpvote(author, permlink, 10000, chalk); // 10000 represents 100% upvote

    // Add to already upvoted list
    alreadyUpvoted.push({
      author,
      permlink,
      Upvotedate: new Date().toISOString()
    });
    // Delay for 3 seconds
   await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Write the updated already upvoted list
  await writeJsonFile(alreadyUpvotedPath, alreadyUpvoted);

  console.log(chalk.green('All replies posted successfully.'));
}

async function sendComment(author, permlink, body, chalk) {
  try {
    console.log(chalk.blue('Attempting to post comment with body:'));
    console.log(chalk.blue(JSON.stringify(body)));

    // Check if body is a string
    if (typeof body !== 'string') {
      throw new Error(`Invalid body type: ${typeof body}. Expected string.`);
    }

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
    console.error(chalk.red('Error details:', error));
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

postRepliesToHive().catch(console.error);