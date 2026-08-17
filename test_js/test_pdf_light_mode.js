/**
 * test_pdf_light_mode.js
 * Verification unit test suite for forced Light Mode in PDF Export.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running PDF Light Mode Export Unit Test Suite...\n');

// 1. Mock DOM Environment for dark mode app state
global.window = global;
global.document = {
    documentElement: {
        getAttribute: (attr) => attr === 'data-editor-theme' ? 'dark' : null
    },
    createElement: (tag) => {
        const stylesMap = {};
        return {
            tagName: tag.toUpperCase(),
            style: {
                setProperty: (k, v) => { stylesMap[k] = v; },
                getPropertyValue: (k) => stylesMap[k] || ''
            }
        };
    },
    getElementById: (id) => null,
    styleSheets: []
};
global.getComputedStyle = () => ({
    getPropertyValue: (varName) => {
        if (varName === '--preview-bg') return '#1e293b'; // dark mode bg
        if (varName === '--preview-text') return '#f8fafc'; // dark mode text
        return '';
    }
});
global.togglePreviewMaxWidthCheckbox = null;
global.colorSwatchCheckbox = null;

// 2. Read app.js code to test collectExportOptions behavior
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Mock EditorManager for cross-theme preset calculation
global.EditorManager = {
    apply_heading_preset: (el, styles, theme) => {
        el.style.setProperty('--h1-color', theme === 'light' ? '#00875a' : '#56d364');
    }
};
global.localStorage = {
    getItem: (key) => key === 'markvi_active_heading_preset' ? 'github_classic' : null
};
global.getHeadingPresets = () => [{ id: 'github_classic', styles: { h1: {} } }];

// Extract collectExportOptions function
const collectOptMatch = appCode.match(/function collectExportOptions[\s\S]*?^    \}/m);
assert(collectOptMatch, 'PASS: collectExportOptions function found in app.js');

let lineColorPicker = null;
eval(collectOptMatch[0]);

// Test A: Default call returns dark theme when app is in dark mode
const darkOpts = collectExportOptions();
assert.strictEqual(darkOpts.theme, 'dark', 'PASS: Default collectExportOptions returns dark theme');

// Test B: Forced light theme call returns light theme & light mode styleVars overrides
const lightOpts = collectExportOptions({ theme: 'light' });
assert.strictEqual(lightOpts.theme, 'light', 'PASS: collectExportOptions({ theme: "light" }) returns light theme');
assert.strictEqual(lightOpts.styleVars['--preview-bg'], '#ffffff', 'PASS: --preview-bg forced to #ffffff for Light Mode');
assert.strictEqual(lightOpts.styleVars['--preview-text'], '#1f2937', 'PASS: --preview-text forced to #1f2937 for Light Mode');
assert.strictEqual(lightOpts.styleVars['--h1-color'], '#00875a', 'PASS: --h1-color recalculated to Light Mode preset color (#00875a)');
assert.strictEqual(lightOpts.styleVars['--preview-blockquote-bg'], '#f9fafb', 'PASS: --preview-blockquote-bg recalculated to Light Mode light gray (#f9fafb)');
assert.strictEqual(lightOpts.styleVars['--blockquote-text-color'], '#475569', 'PASS: --blockquote-text-color recalculated to Light Mode slate text (#475569)');

// 3. Load ExportManager and test generatePreviewHtmlContent with light mode
global.chrome = undefined;
global.fetch = async () => ({ text: async () => '' });

const exportManCode = fs.readFileSync(path.join(__dirname, '..', 'export-man.js'), 'utf8');
eval(exportManCode);

const mockPreview = {
    children: [{}],
    cloneNode: () => ({
        querySelectorAll: () => [],
        innerHTML: '<h1>Light Mode Test</h1>'
    }),
    querySelectorAll: () => []
};

async function testExportLightHtml() {
    const html = await ExportManager.generatePreviewHtmlContent(mockPreview, 'test.md', { theme: 'light' });
    assert(html.includes('data-editor-theme="light"'), 'PASS: Generated HTML contains data-editor-theme="light"');
    console.log('✅ PASS: HTML generated with forced Light Mode attributes');
}

testExportLightHtml().then(() => {
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY | PDF Light Mode Export Test Passed 100%');
    console.log('========================================');
}).catch(err => {
    console.error('❌ FAIL:', err);
    process.exit(1);
});
