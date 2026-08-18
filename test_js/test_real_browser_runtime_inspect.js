const fs = require('fs');
const path = require('path');

console.log('🔍 Simulating Browser Runtime Environment for markdown_viewer.html...\n');

const htmlPath = path.join(__dirname, '../markdown_viewer.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Script tags extracted in order
const scriptMatches = [...htmlContent.matchAll(/<script src="([^"]+)"><\/script>/g)];
const scriptFiles = scriptMatches.map(m => m[1]);

console.log('📜 Loading Script Sequence:');
scriptFiles.forEach((sf, idx) => console.log(`  Layer ${idx}: ${sf}`));
console.log('');

// 2. Read each script file content to check for syntax errors or asserts
let hasError = false;
scriptFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File Missing: ${file}`);
        hasError = true;
    } else {
        const code = fs.readFileSync(filePath, 'utf8');
        // Simple check for unclosed brackets or syntax issues
        try {
            new Function(code);
            console.log(`✅ Clean Syntax: ${file}`);
        } catch (e) {
            console.error(`❌ Syntax Error in ${file}:`, e.message);
            hasError = true;
        }
    }
});

console.log('\n--- Script File Check Completed ---');
