const axios = require('axios');
const fs = require('fs').promises;

async function fetchPosts() {
    try {
        // API-Anfrage, um die letzten 10 Posts zu erhalten
        const response = await axios.post('https://api.hive.blog', {
            jsonrpc: '2.0',
            method: 'bridge.get_ranked_posts',
            params: {
                sort: 'created',
                tag: 'hive-149312',
                limit: 10
            },
            id: 1
        });

        const posts = response.data.result;
        const contents = posts.map(post => ({
            author: post.author,
            permlink: post.permlink,
            body: post.body
        }));

        // JSON-Datei speichern
        await fs.writeFile('contents.json', JSON.stringify(contents, null, 2), 'utf8');
        console.log('Die Inhalte wurden erfolgreich in contents.json gespeichert.');
    } catch (error) {
        console.error('Ein Fehler ist aufgetreten:', error);
    }
}

fetchPosts();
