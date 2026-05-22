const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\index.html', 'utf8');
console.log('btn-start-game present:', html.includes('btn-start-game'));
