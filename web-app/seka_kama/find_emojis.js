const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (stat && stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('e:\\Main\\Projects\\opensource\\seka\\Seka_Kama\\web-app\\seka_kama');
const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    let found = false;
    while ((match = emojiRegex.exec(content)) !== null) {
        if (!found) {
            console.log('\nFile:', file);
            found = true;
        }
        console.log(`Found emoji: ${match[0]} at index ${match.index}`);
    }
});
