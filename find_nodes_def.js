const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js', 'utf8');
const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('const nodes =') || line.includes('let nodes =') || (line.includes('nodes = {') && idx < 1000)) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
