const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js', 'utf8');
const lines = code.split('\n');

let foundTick = false;
let startLine = 2860;
for (let idx = startLine; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line.includes('components.forEach') || line.includes('load') || line.includes('sla')) {
        if (idx < 3200) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
}
