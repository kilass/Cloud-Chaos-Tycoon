const fs = require('fs');
const path = 'C:\\Users\\loice\\.gemini\\antigravity\\scratch\\cloud-chaos-tycoon\\app.js';
const code = fs.readFileSync(path, 'utf8');
const lines = code.split('\n');

const terms = ['startGame', 'updateUIElements', 'simulationTick', 'checkTutorial', 'tutorial', 'objectives', 'contract', 'activeContractId'];

terms.forEach(term => {
    console.log(`=== Matches for "${term}": ===`);
    let count = 0;
    lines.forEach((line, idx) => {
        if (line.includes(term)) {
            count++;
            if (count <= 10) {
                console.log(`${idx + 1}: ${line.trim()}`);
            }
        }
    });
    if (count > 10) {
        console.log(`... and ${count - 10} more matches`);
    }
});
