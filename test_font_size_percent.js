/**
 * test_font_size_percent.js
 * Verification unit test suite for percentage font scaling (10pt == 100% baseline).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running Percentage Font Scaling Unit Test Suite...\n');

// 1. Read app.js code to test calc_scaled_font_size function
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Extract calc_scaled_font_size function
const calcFuncMatch = appCode.match(/function calc_scaled_font_size[\s\S]*?^    \}/m);
assert(calcFuncMatch, 'PASS: calc_scaled_font_size function found in app.js');

eval(calcFuncMatch[0]);

// Test A: Percentage scaling conversion checks (10pt == 100% baseline)
assert.strictEqual(calc_scaled_font_size('80%', 10), '8pt', 'PASS: 80% converts to 8pt');
assert.strictEqual(calc_scaled_font_size('90%', 10), '9pt', 'PASS: 90% converts to 9pt');
assert.strictEqual(calc_scaled_font_size('100%', 10), '10pt', 'PASS: 100% converts to 10pt');
assert.strictEqual(calc_scaled_font_size('105%', 10), '10.5pt', 'PASS: 105% converts to 10.5pt');
assert.strictEqual(calc_scaled_font_size('110%', 10), '11pt', 'PASS: 110% converts to 11pt');
assert.strictEqual(calc_scaled_font_size('120%', 10), '12pt', 'PASS: 120% converts to 12pt (Default)');
assert.strictEqual(calc_scaled_font_size('140%', 10), '14pt', 'PASS: 140% converts to 14pt');
assert.strictEqual(calc_scaled_font_size('160%', 10), '16pt', 'PASS: 160% converts to 16pt');

// 2. Test collectExportOptions integration with font percentage selection
global.window = global;
global.document = {
    documentElement: {
        getAttribute: (attr) => attr === 'data-editor-theme' ? 'dark' : null,
        style: { setProperty: () => {} }
    },
    getElementById: (id) => null,
    createElement: (tag) => ({
        style: { setProperty: () => {}, getPropertyValue: () => '' }
    }),
    styleSheets: []
};
global.getComputedStyle = () => ({
    getPropertyValue: () => ''
});

global.fontSizeSelect = { value: '120%' };
global.fontSelect = { value: 'Inter, sans-serif' };

const collectOptMatch = appCode.match(/function collectExportOptions[\s\S]*?^    \}/m);
assert(collectOptMatch, 'PASS: collectExportOptions function found in app.js');

let lineColorPicker = null;
eval(collectOptMatch[0]);

const exportOpts = collectExportOptions();
assert.strictEqual(exportOpts.styleVars['--preview-font-size'], '12pt', 'PASS: Default 120% font selection collects 12pt for export');
assert.strictEqual(exportOpts.styleVars['--preview-font-family'], 'Inter, sans-serif', 'PASS: Font family collected properly');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | Font Percentage Scaling Test Passed 100%');
console.log('========================================');
