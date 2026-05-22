const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\index.html', 'utf8');
const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('onboarding-modal') || line.includes('tutorial') || line.includes('selectStartMode')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
