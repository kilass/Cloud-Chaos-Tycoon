const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js', 'utf8');
const lines = code.split('\n');

let foundTick = false;
let count = 0;
lines.forEach((line, idx) => {
    if (line.includes('function simulationTick()')) {
        foundTick = true;
    }
    if (foundTick && count < 100) {
        console.log(`${idx + 1}: ${line}`);
        count++;
    }
});
