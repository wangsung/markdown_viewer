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

// 2. Verify quote border rule contains :first-child selector for default highlightFormatting: false compatibility
assert(cssContent.includes('.CodeMirror-line > span > .cm-quote:first-child'), 'FAIL: CSS must include .CodeMirror-line > span > .cm-quote:first-child for first-child target');
console.log('✅ PASS: CSS contains .CodeMirror-line > span > .cm-quote:first-child selector');

// 3. Verify dark theme .cm-formatting-quote / :first-child
const darkMatch = cssContent.match(/\[data-editor-theme="dark"\]\s+\.cm-formatting-quote,\s*\[data-editor-theme="dark"\]\s+\.CodeMirror-line\s*>\s*span\s*>\s*\.cm-quote:first-child\s*\{([^}]+)\}/);
assert(darkMatch, 'Dark theme quote first-child rule must exist');
assert(darkMatch[1].includes('border-left-color:'), 'FAIL: Dark theme quote border must set border-left-color');
console.log('✅ PASS: Dark theme quote border selector sets border-left-color');

// 4. Verify light theme .cm-formatting-quote / :first-child
const lightMatch = cssContent.match(/\[data-editor-theme="light"\]\s+\.cm-formatting-quote,\s*\[data-editor-theme="light"\]\s+\.CodeMirror-line\s*>\s*span\s*>\s*\.cm-quote:first-child\s*\{([^}]+)\}/);
assert(lightMatch, 'Light theme quote first-child rule must exist');
assert(lightMatch[1].includes('border-left-color:'), 'FAIL: Light theme quote border must set border-left-color');
console.log('✅ PASS: Light theme quote border selector sets border-left-color');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | CodeMirror Quote CSS Test Passed 100%');
console.log('========================================');
