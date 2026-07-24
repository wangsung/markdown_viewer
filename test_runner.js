/**
 * test_runner.js - ExportManager (export-man.js) 서브 모듈 전용 Node 단위 테스트 러너
 */

const fs = require('fs');

// 브라우저 런타임 환경 Mocking/Stubbing
global.window = global;
global.alert = (msg) => { console.log('🔔 [ALERT Mock]:', msg); };
global.getSelection = () => ({ removeAllRanges: () => {}, addRange: () => {} });
global.document = {
    documentElement: {
        getAttribute: (attr) => (attr === 'data-editor-theme' ? 'dark' : null),
        style: {}
    },
    createElement: (tag) => ({
        setAttribute: () => {},
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        click: () => {},
        classList: { remove: () => {}, contains: () => true }
    }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getSelection: global.getSelection,
    createRange: () => ({ selectNodeContents: () => {} }),
    execCommand: () => true
};
global.URL = { createObjectURL: () => 'blob:mock-url', revokeObjectURL: () => {} };
global.Blob = class Blob { constructor(content, opts) { this.content = content; this.opts = opts; } };
global.chrome = {
    runtime: { getURL: (p) => p },
    downloads: {
        download: (opts, cb) => {
            global.lastOpts = opts;
            if (cb) cb(1);
        }
    }
};
global.fetch = async (url) => ({ text: async () => '/* mock css */' });
global.getComputedStyle = () => ({ getPropertyValue: () => 'sans-serif' });

// Target Module Load
const exportManCode = fs.readFileSync(__dirname + '/export-man.js', 'utf8');
eval(exportManCode);

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        passCount++;
        console.log('✅ PASS:', message);
    } else {
        failCount++;
        console.log('❌ FAIL:', message);
    }
}

async function runTestSuite() {
    console.log('🚀 Running ExportManager Unit Test Suite...\n');

    const previewEl = { children: [1], innerHTML: '<h1>Title</h1>' };
    const emptyPreviewEl = { children: [] };
    const exportMenuEl = { classList: { remove: (cls) => { exportMenuEl.removed = cls; } } };

    // Test 1: Global Module Export Check
    assert(typeof ExportManager === 'object', 'ExportManager module exists globally');

    // Test 2: Copy Validation on Empty Preview
    assert(ExportManager.copyPreviewToClipboard(emptyPreviewEl) === false, 'ExportManager.copyPreviewToClipboard returns false on empty preview');

    // Test 3: Copy Execution & Dropdown Close
    assert(ExportManager.copyPreviewToClipboard(previewEl, exportMenuEl) === true, 'ExportManager.copyPreviewToClipboard executes copy command');
    assert(exportMenuEl.removed === 'show', 'ExportManager.copyPreviewToClipboard closes export menu');

    // Test 4: Download Trigger & Callback
    let savedFilename = null;
    ExportManager.triggerFileDownload(new Blob(['test']), 'doc.md', (name) => { savedFilename = name; });
    assert(savedFilename === 'doc.md', 'ExportManager.triggerFileDownload executes onSuccess callback');
    assert(global.lastOpts && global.lastOpts.filename === 'doc.md', 'ExportManager.triggerFileDownload routes filename correctly');

    // Test 5: HTML Export Content Formatting
    const mockOptions = {
        theme: 'dark',
        lineColor: '#ff0000',
        styleVars: { '--h1-color': '#1d4ed8', '--theme-color': '#ff0000', '--preview-bg': '#1e293b' }
    };
    const html = await ExportManager.generatePreviewHtmlContent(previewEl, 'report.md', mockOptions);
    assert(html.includes('<title>report - Preview Export</title>'), 'ExportManager.generatePreviewHtmlContent formats title properly');
    assert(html.includes('--theme-color: #ff0000'), 'ExportManager.generatePreviewHtmlContent injects custom line color');
    assert(html.includes('--h1-color: #1d4ed8'), 'ExportManager.generatePreviewHtmlContent injects passed styleVars CSS vars');
    assert(html.includes('data-editor-theme="dark"'), 'ExportManager.generatePreviewHtmlContent sets passed theme mode attribute');
    assert(html.includes('<h1>Title</h1>'), 'ExportManager.generatePreviewHtmlContent includes preview HTML content');

    // Test 6: HTML Download Target Filename
    global.lastOpts = null;
    await ExportManager.downloadPreviewHtml(previewEl, 'report_full.md', mockOptions);
    assert(global.lastOpts && global.lastOpts.filename === 'report_full.html', 'ExportManager.downloadPreviewHtml computes .html target filename');

    // Test 7: Default Preview Window Export
    let openedHtml = null;
    global.window.open = () => ({
        document: {
            open: () => {},
            write: (content) => { openedHtml = content; },
            close: () => {}
        }
    });
    await ExportManager.openDefaultPreviewHtmlInNewWindow(previewEl, 'default_report.md');
    assert(openedHtml && openedHtml.includes('<title>default_report - Preview (기본)</title>'), 'ExportManager.openDefaultPreviewHtmlInNewWindow generates raw default HTML title');
    assert(openedHtml && !openedHtml.includes('--theme-color:'), 'ExportManager.openDefaultPreviewHtmlInNewWindow excludes theme CSS styling');

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');
}

runTestSuite();
