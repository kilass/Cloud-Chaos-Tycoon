const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js', 'utf8');
const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('currentQps')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
