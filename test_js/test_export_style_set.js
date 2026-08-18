/**
 * test_export_style_set.js
 * Unit test suite for ExportStyleSet and 6-Layer Loading Priority Policy pre-load assert_arg checks.
 *
 * Command to run: node test_js/test_export_style_set.js
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        failCount++;
    }
}

console.log('🚀 Running ExportStyleSet & Loading Priority Unit Test Suite...\n');

// 1. Setup Mock Browser Environment
global.window = global;
global.ENABLE_DEBUG_HANDLER = true;

const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { for (let k in mockStorage) delete mockStorage[k]; }
};

global.document = {
    documentElement: {
        getAttribute: (attr) => (attr === 'data-editor-theme' ? 'dark' : null),
        style: { getPropertyValue: () => '' }
    },
    createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {}, removeChild: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};

global.getComputedStyle = () => ({ getPropertyValue: () => '16px' });
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
global.Blob = class Blob { constructor(c) { this.c = c; } };

// 2. Load export-man.js
const exportManPath = path.join(__dirname, '..', 'export-man.js');
const exportManCode = fs.readFileSync(exportManPath, 'utf8');
eval(exportManCode);

// Test Group 1: ExportStyleSet Structure & API Verification
console.log('--- [Test Group 1]: ExportStyleSet Structure & API Verification ---');
assert(typeof ExportManager === 'object', 'ExportManager object is exported globally');
assert(typeof ExportStyleSet === 'object', 'window.ExportStyleSet object exists');
assert(ExportManager.ExportStyleSet === ExportStyleSet, 'ExportManager.ExportStyleSet reference equality');

assert(Array.isArray(ExportStyleSet.PRESET_VARS), 'ExportStyleSet.PRESET_VARS is an Array');
assert(Array.isArray(ExportStyleSet.CONTAINER_VARS), 'ExportStyleSet.CONTAINER_VARS is an Array');
assert(Array.isArray(ExportStyleSet.LAYOUT_VARS), 'ExportStyleSet.LAYOUT_VARS is an Array');

assert(ExportStyleSet.CONTAINER_VARS.length === 8, 'ExportStyleSet.CONTAINER_VARS contains 8 theme container vars');
assert(ExportStyleSet.LAYOUT_VARS.length === 4, 'ExportStyleSet.LAYOUT_VARS contains 4 font & layout vars');

assert(typeof ExportStyleSet.getAll === 'function', 'ExportStyleSet.getAll is a function');
const allVars = ExportStyleSet.getAll();
assert(Array.isArray(allVars), 'ExportStyleSet.getAll() returns an Array');
assert(allVars.length === ExportStyleSet.PRESET_VARS.length + ExportStyleSet.CONTAINER_VARS.length + ExportStyleSet.LAYOUT_VARS.length, 'ExportStyleSet.getAll() returns full concatenated array of all layers');
assert(allVars.includes('--preview-bg'), 'getAll() includes container var --preview-bg');
assert(allVars.includes('--h1-color'), 'getAll() includes preset var --h1-color');
assert(allVars.includes('--preview-font-size'), 'getAll() includes layout var --preview-font-size');

// Test Group 2: app.js collectExportOptions Integration
console.log('\n--- [Test Group 2]: app.js collectExportOptions Integration ---');
// Mock minimal app.js environment for collectExportOptions
const appPath = path.join(__dirname, '..', 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// Create mock function scope to extract collectExportOptions
let collectExportOptionsFunc = null;
try {
    const evalEnv = {
        document: global.document,
        window: global.window,
        getComputedStyle: global.getComputedStyle,
        ExportStyleSet: global.ExportStyleSet,
        ExportManager: global.ExportManager
    };
    // Inspect if cssVarList in collectExportOptions uses ExportStyleSet.getAll()
    assert(appCode.includes('ExportStyleSet'), 'app.js references ExportStyleSet in collectExportOptions');
    assert(appCode.includes('exportStyleSetRef.getAll()'), 'app.js invokes exportStyleSetRef.getAll()');
} catch (e) {
    console.error('Failed app.js integration check:', e);
}

// Test Group 3: style-editor.js Pre-load assert_arg Verification (6-Layer Loading Priority Policy)
console.log('\n--- [Test Group 3]: style-editor.js Pre-load assert_arg Verification ---');
const styleEditorPath = path.join(__dirname, '..', 'style-editor.js');
const styleEditorCode = fs.readFileSync(styleEditorPath, 'utf8');

// Subtest 3.1: Missing FrameManager (Layer 1) -> Assert failure
(function testMissingLayer1() {
    delete global.FrameManager;
    global.ExportStyleSet = ExportStyleSet;
    global.EditorManager = { apply_heading_preset: () => {} };
    let failed = false;
    try {
        eval(styleEditorCode);
    } catch (e) {
        failed = e.message.includes('Layer 1 Dependency Missing');
    }
    assert(failed, 'style-editor.js fails fast when Layer 1 (FrameManager) is missing');
})();

// Subtest 3.2: Missing ExportStyleSet (Layer 2) -> Assert failure
(function testMissingLayer2() {
    global.FrameManager = { init: () => {} };
    delete global.ExportStyleSet;
    delete global.window.ExportStyleSet;
    if (global.ExportManager) delete global.ExportManager.ExportStyleSet;
    global.EditorManager = { apply_heading_preset: () => {} };
    let failed = false;
    try {
        eval(styleEditorCode);
    } catch (e) {
        failed = e.message.includes('Layer 2 Dependency Missing');
    }
    assert(failed, 'style-editor.js fails fast when Layer 2 (ExportStyleSet) is missing');
})();

// Subtest 3.3: Missing EditorManager (Layer 3) -> Assert failure
(function testMissingLayer3() {
    eval(exportManCode);
    global.FrameManager = { init: () => {} };
    delete global.EditorManager;
    delete global.window.EditorManager;
    let failed = false;
    try {
        eval(styleEditorCode);
    } catch (e) {
        failed = e.message.includes('Layer 3 Dependency Missing');
    }
    assert(failed, 'style-editor.js fails fast when Layer 3 (EditorManager) is missing');
})();

// Subtest 3.4: All Dependencies (Layer 1, Layer 2, Layer 3) Present -> Success
(function testAllLayersPresent() {
    eval(exportManCode);
    global.FrameManager = { init: () => {} };
    global.EditorManager = { apply_heading_preset: () => {} };
    let passed = false;
    try {
        eval(styleEditorCode);
        passed = (typeof StylePresetManager === 'object');
    } catch (e) {
        console.error('Unexpected error when all layers present:', e);
        passed = false;
    }
    assert(passed, 'style-editor.js loads successfully when Layer 1, 2, and 3 dependencies are satisfied');
})();

console.log('\n========================================');
console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('========================================');

if (failCount > 0) {
    process.exit(1);
}
