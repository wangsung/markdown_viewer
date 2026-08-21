const fs = require('fs');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🚀 Running Codeblock Scroll Toggle Unit Test Suite...\n');

    const htmlPath = path.join(__dirname, '..', 'markdown_viewer.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Verify view-menu contains #codeblock-scroll checkbox as first toggle item
    const viewMenuMatch = html.match(/<div class="dropdown-menu" id="view-menu">([\s\S]*?)<\/div>\s*<\/div>/);
    assert(viewMenuMatch, 'PASS: view-menu dropdown found in HTML');

    const viewMenuContent = viewMenuMatch[1];
    const firstItemIndex = viewMenuContent.indexOf('id="codeblock-scroll"');
    const mathIndex = viewMenuContent.indexOf('id="math-render"');
    const diagramIndex = viewMenuContent.indexOf('id="diagram-render"');

    assert(firstItemIndex !== -1, 'PASS: #codeblock-scroll checkbox found in view-menu');
    assert(firstItemIndex < mathIndex, 'PASS: #codeblock-scroll is placed BEFORE #math-render');
    assert(mathIndex < diagramIndex, 'PASS: #math-render is placed BEFORE #diagram-render');

    // 2. Load export-man.js and test ExportManager.collectOptions styleVars collection
    // (collectExportOptions는 export-man.js의 ExportManager.collectOptions로 이전됨)
    global.window = global;
    global.currentFilename = 'untitled.md';
    global.document = {
        documentElement: {
            getAttribute: () => 'dark',
            style: {
                getPropertyValue: () => ''
            }
        },
        getElementById: (id) => {
            if (id === 'preview') {
                return {
                    style: {
                        getPropertyValue: (prop) => {
                            if (prop === '--preview-code-whitespace') return global.mockWs || 'pre';
                            if (prop === '--preview-code-word-break') return global.mockWb || 'normal';
                            return '';
                        }
                    }
                };
            }
            return null;
        }
    };

    global.getComputedStyle = (el) => ({
        getPropertyValue: (prop) => {
            if (prop === '--preview-code-whitespace') return global.mockWs || 'pre';
            if (prop === '--preview-code-word-break') return global.mockWb || 'normal';
            return '';
        }
    });

    global.chrome = undefined;
    global.fetch = async () => ({ text: async () => '' });

    const exportManCode = fs.readFileSync(path.join(__dirname, '..', 'export-man.js'), 'utf8');
    eval(exportManCode);

    const mockExportUiElements = {
        lineColorPicker: null,
        fontSizeSelect: null,
        fontSelect: null,
        togglePreviewMaxWidthCheckbox: null,
        colorSwatchCheckbox: null
    };

    // Test ON mode
    global.mockWs = 'pre';
    global.mockWb = 'normal';
    const optsON = ExportManager.collectOptions(mockExportUiElements);
    assert.strictEqual(optsON.styleVars['--preview-code-whitespace'], 'pre', 'PASS: ExportManager.collectOptions collects --preview-code-whitespace: pre when ON');
    assert.strictEqual(optsON.styleVars['--preview-code-word-break'], 'normal', 'PASS: ExportManager.collectOptions collects --preview-code-word-break: normal when ON');

    // Test OFF mode
    global.mockWs = 'pre-wrap';
    global.mockWb = 'break-word';
    const optsOFF = ExportManager.collectOptions(mockExportUiElements);
    assert.strictEqual(optsOFF.styleVars['--preview-code-whitespace'], 'pre-wrap', 'PASS: ExportManager.collectOptions collects --preview-code-whitespace: pre-wrap when OFF');
    assert.strictEqual(optsOFF.styleVars['--preview-code-word-break'], 'break-word', 'PASS: ExportManager.collectOptions collects --preview-code-word-break: break-word when OFF');

    // 3. Test HTML template generation (ExportManager already loaded above)
    const mockPreviewEl = {
        id: 'preview',
        children: [{}],
        innerHTML: '<pre><code>const a = 1;</code></pre>',
        cloneNode: function() { return this; },
        querySelectorAll: () => []
    };

    const generatedHtml = await ExportManager.generatePreviewHtmlContent(mockPreviewEl, 'untitled.md', optsOFF);
    assert(generatedHtml.includes('var(--preview-code-whitespace, pre)'), 'PASS: generatePreviewHtmlContent injects var(--preview-code-whitespace, pre)');

    console.log('\n========================================');
    console.log('📊 TEST SUMMARY | Codeblock Scroll Toggle Test Passed 100%');
    console.log('========================================\n');
})();
