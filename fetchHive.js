const axios = require('axios');
const fs = require('fs').promises;

const tag = process.argv[2] || 'charity'; // Get tag from command line arguments or default to 'charity'

async function fetchPosts() {
    try {
        // API-Anfrage, um die letzten n (siehe "limit") Posts zu erhalten
        const response = await axios.post('https://api.hive.blog', {
            jsonrpc: '2.0',
            method: 'bridge.get_ranked_posts',
            params: {
                sort: 'created',
                tag: tag, // Use the tag from command line arguments
                limit: 15 // Anzahl der Posts, die abgerufen werden sollen
            },
            id: 1
        });

        const posts = response.data.result;
        const contents = posts.map(post => ({
            author: post.author,
            permlink: post.permlink,
            body: post.body
        }));

        // Save the posts to a file
        const date = new Date();
        const formattedDate = date.toISOString().slice(2, 10).replace(/-/g, '');
        const filePath = `./reports/posts_${formattedDate}_${tag}.json`;
        await fs.writeFile(filePath, JSON.stringify(contents, null, 2));
        console.log(`Posts saved to ${filePath}`);
    } catch (error) {
        console.error(`Error fetching posts: ${error.message}`);
    }
}

fetchPosts();
