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

// 2. Load export-man.js — collectOptions()의 CSS var 목록은 여기서 정의되는 ExportStyleSet에서
//    읽어오고, collectOptions 자체도 export-man.js 소속(ExportManager.collectOptions)이다.
global.chrome = undefined;
global.fetch = async () => ({ text: async () => '' });

// Mock EditorManager for cross-theme preset calculation
global.EditorManager = {
    apply_heading_preset: (el, styles, theme) => {
        el.style.setProperty('--h1-color', theme === 'light' ? '#00875a' : '#56d364');
    }
};
global.localStorage = {
    getItem: (key) => key === 'markvi_active_heading_preset' ? 'github_classic' : null
};
global.StylePresetManager = {
    getPresets: () => [{ id: 'github_classic', styles: { h1: {} } }]
};

const exportManCode = fs.readFileSync(path.join(__dirname, '..', 'export-man.js'), 'utf8');
eval(exportManCode);

// app.js가 넘기는 exportUiElements와 동일한 형태의 모의 DOM 엘리먼트 묶음
const mockExportUiElements = {
    lineColorPicker: null,
    fontSizeSelect: null,
    fontSelect: null,
    togglePreviewMaxWidthCheckbox: null,
    colorSwatchCheckbox: null
};

// Test A: Default call returns dark theme when app is in dark mode
const darkOpts = ExportManager.collectOptions(mockExportUiElements);
assert.strictEqual(darkOpts.theme, 'dark', 'PASS: Default ExportManager.collectOptions returns dark theme');

// Test B: Forced light theme call returns light theme & light mode styleVars overrides
const lightOpts = ExportManager.collectOptions(mockExportUiElements, { theme: 'light' });
assert.strictEqual(lightOpts.theme, 'light', 'PASS: ExportManager.collectOptions(elements, { theme: "light" }) returns light theme');
assert.strictEqual(lightOpts.styleVars['--preview-bg'], '#ffffff', 'PASS: --preview-bg forced to #ffffff for Light Mode');
assert.strictEqual(lightOpts.styleVars['--preview-text'], '#1f2937', 'PASS: --preview-text forced to #1f2937 for Light Mode');
assert.strictEqual(lightOpts.styleVars['--h1-color'], '#00875a', 'PASS: --h1-color recalculated to Light Mode preset color (#00875a)');
assert.strictEqual(lightOpts.styleVars['--preview-blockquote-bg'], '#f9fafb', 'PASS: --preview-blockquote-bg recalculated to Light Mode light gray (#f9fafb)');
assert.strictEqual(lightOpts.styleVars['--blockquote-text-color'], '#475569', 'PASS: --blockquote-text-color recalculated to Light Mode slate text (#475569)');

// 4. Test generatePreviewHtmlContent with light mode (ExportManager already loaded above)
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
