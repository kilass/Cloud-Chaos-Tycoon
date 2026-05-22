const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\index.html', 'utf8');
const lines = html.split('\n');

let found = false;
let count = 0;
lines.forEach((line, idx) => {
    if (line.includes('objectives-panel')) {
        found = true;
    }
    if (found && count < 25) {
        console.log(`${idx + 1}: ${line.trim()}`);
        count++;
    }
});
