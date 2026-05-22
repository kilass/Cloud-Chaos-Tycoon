const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js', 'utf8');
const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('const CATALOG') || line.includes('let CATALOG') || line.includes('var CATALOG') || (line.includes('CATALOG = {') && idx < 500)) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
