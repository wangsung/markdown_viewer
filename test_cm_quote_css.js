/**
 * test_cm_quote_css.js
 * Verification unit test for CodeMirror blockquote CSS fixes.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running CodeMirror Quote CSS Unit Test...');

const cssPath = path.join(__dirname, 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Verify .cm-quote does not contain border-left
const cmQuoteMatch = cssContent.match(/\.cm-quote\s*\{([^}]+)\}/);
assert(cmQuoteMatch, 'CSS rule .cm-quote must exist in style.css');
const cmQuoteBody = cmQuoteMatch[1];
assert(!cmQuoteBody.includes('border-left'), 'FAIL: .cm-quote should NOT contain border-left directly');
console.log('✅ PASS: .cm-quote does not contain border-left directly');

// 2. Verify .cm-formatting-quote exists and contains border-left
const cmFormattingQuoteMatch = cssContent.match(/\.cm-formatting-quote\s*\{([^}]+)\}/);
assert(cmFormattingQuoteMatch, 'CSS rule .cm-formatting-quote must exist in style.css');
const cmFormattingQuoteBody = cmFormattingQuoteMatch[1];
assert(cmFormattingQuoteBody.includes('border-left:'), 'FAIL: .cm-formatting-quote must contain border-left');
assert(cmFormattingQuoteBody.includes('padding-left:'), 'FAIL: .cm-formatting-quote must contain padding-left');
console.log('✅ PASS: .cm-formatting-quote contains border-left and padding-left');

// 3. Verify dark theme .cm-formatting-quote
const darkMatch = cssContent.match(/\[data-editor-theme="dark"\]\s+\.cm-formatting-quote\s*\{([^}]+)\}/);
assert(darkMatch, 'Dark theme .cm-formatting-quote rule must exist');
assert(darkMatch[1].includes('border-left-color:'), 'FAIL: Dark theme .cm-formatting-quote must set border-left-color');
console.log('✅ PASS: Dark theme .cm-formatting-quote sets border-left-color');

// 4. Verify light theme .cm-formatting-quote
const lightMatch = cssContent.match(/\[data-editor-theme="light"\]\s+\.cm-formatting-quote\s*\{([^}]+)\}/);
assert(lightMatch, 'Light theme .cm-formatting-quote rule must exist');
assert(lightMatch[1].includes('border-left-color:'), 'FAIL: Light theme .cm-formatting-quote must set border-left-color');
console.log('✅ PASS: Light theme .cm-formatting-quote sets border-left-color');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | CodeMirror Quote CSS Test Passed 100%');
console.log('========================================');
