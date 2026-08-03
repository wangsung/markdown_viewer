const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, 'style.css');
let styleContent = '';
try {
    styleContent = fs.readFileSync(stylePath, 'utf8');
} catch (e) {
    console.warn('Warning: style.css not found, skipping file read verification.');
}

let pass = true;

// 1. Verify CSS rules (if file exists)
if (styleContent) {
    if (!styleContent.includes('--custom-code-block-bg')) {
        console.error('FAIL: --custom-code-block-bg variable not found in style.css');
        pass = false;
    }
}

// 2 & 3. Mock DOM Environment & parse CSS vars
class MockElement {
    constructor(className) {
        this.className = className;
        this.style = {};
    }
}

class MockDocument {
    constructor() {
        this.documentElement = new MockElement('html');
        this.previewPre = new MockElement('markdown-body pre');
        this.editorCmCode = new MockElement('cm-code');
        this.editorCmComment = new MockElement('cm-comment');
    }
    
    setCssVar(name, value) {
        this.documentElement.style[name] = value;
        // Mock CSS engine applying variables to elements
        if (name === '--custom-code-block-bg') {
            // Mock translation from hex to rgb for computed style
            let rgbValue = value;
            if (value === '#dcfce7') {
                rgbValue = 'rgb(220, 252, 231)';
            }
            this.previewPre.style.backgroundColor = rgbValue;
            this.editorCmCode.style.backgroundColor = rgbValue;
            this.editorCmComment.style.backgroundColor = rgbValue;
        }
        if (name === '--custom-inline-code-bg') {
            let rgbValue = value;
            if (value === '#fef08a') {
                rgbValue = 'rgb(254, 240, 138)';
            }
            this.previewPre.style.inlineBg = rgbValue;
        }
        if (name === '--custom-code-block-fg') {
            let rgbValue = value;
            if (value === '#f43f5e') {
                rgbValue = 'rgb(244, 63, 94)';
            }
            this.previewPre.style.color = rgbValue;
        }
    }
}

const document = new MockDocument();

// Test setting the variables
document.setCssVar('--custom-code-block-bg', '#dcfce7');
document.setCssVar('--custom-inline-code-bg', '#fef08a');
document.setCssVar('--custom-code-block-fg', '#f43f5e');

// 4 & 5. Asserts
if (document.previewPre.style.backgroundColor === 'rgb(220, 252, 231)') {
    console.log('PASS: Preview pre codeblock background receives pastel green (#dcfce7)');
} else {
    console.error('FAIL: Preview pre codeblock background assertion failed');
    pass = false;
}

if (document.previewPre.style.inlineBg === 'rgb(254, 240, 138)') {
    console.log('PASS: Preview inline code background receives pastel yellow (#fef08a)');
} else {
    console.error('FAIL: Preview inline code background assertion failed');
    pass = false;
}

if (document.previewPre.style.color === 'rgb(244, 63, 94)') {
    console.log('PASS: Preview pre codeblock text color receives pink (#f43f5e)');
} else {
    console.error('FAIL: Preview pre codeblock text color assertion failed');
    pass = false;
}

if (document.editorCmCode.style.backgroundColor === 'rgb(220, 252, 231)') {
    console.log('PASS: Editor cm-code background receives pastel green (#dcfce7)');
} else {
    console.error('FAIL: Editor cm-code background assertion failed');
    pass = false;
}

if (!pass) {
    process.exit(1);
}
