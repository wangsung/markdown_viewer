const fs = require('fs');
const path = require('path');

const exportManContent = fs.readFileSync(path.join(__dirname, '..', 'export-man.js'), 'utf8');

if (exportManContent.includes('${coreMarkdownCss}') && exportManContent.includes('${githubCss}')) {
    const coreIndex = exportManContent.indexOf('${coreMarkdownCss}');
    const githubIndex = exportManContent.indexOf('${githubCss}');
    if (githubIndex > coreIndex) {
        console.log('PASS: githubCss is placed AFTER coreMarkdownCss so highlight styles take precedence.');
    } else {
        console.error('FAIL: githubCss is placed before coreMarkdownCss.');
        process.exit(1);
    }
} else {
    console.error('FAIL: CSS templates missing in export-man.js');
    process.exit(1);
}
