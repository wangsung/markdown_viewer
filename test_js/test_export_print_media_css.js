const fs = require('fs');
const path = require('path');

const exportManContent = fs.readFileSync(path.join(__dirname, '..', 'export-man.js'), 'utf8');

const checks = [
    '@media print',
    'size: A4',
    'padding: 0 !important',
    'max-width: 100% !important',
    'print-color-adjust: exact',
    'margin-top: 0 !important',
    'page-break-inside: avoid',
    'break-inside: avoid'
];

let allPassed = true;
checks.forEach(term => {
    if (exportManContent.includes(term)) {
        console.log(`PASS: Found '${term}' in export-man.js`);
    } else {
        console.error(`FAIL: Missing '${term}' in export-man.js`);
        allPassed = false;
    }
});

if (allPassed) {
    console.log('\nSUCCESS: @media print A4 optimization CSS verified successfully in export-man.js!');
} else {
    console.error('\nFAILURE: Some @media print CSS rules are missing.');
    process.exit(1);
}
