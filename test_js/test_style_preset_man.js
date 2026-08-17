/**
 * test_style_preset_man.js
 * Unit test suite for StylePresetManager in style-editor.js
 * Verification of reading/saving presets, schema syncing, CSS variable application, dropdown select rendering, and assert_arg validation.
 * 
 * Run command: node test_js/test_style_preset_man.js
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

console.log('🚀 Running StylePresetManager Unit Test Suite...\n');

// 1. Mock Browser Environment (localStorage, DOM, EditorManager)
const mockStorage = {};
const mockLocalStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { for (let k in mockStorage) delete mockStorage[k]; }
};

const appliedStylesHistory = [];
const mockEditorManager = {
    apply_heading_preset: (rootEl, styles, theme) => {
        appliedStylesHistory.push({ rootEl, styles, theme });
    }
};

class MockElement {
    constructor(tagName) {
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.attributes = {};
        this.style = {};
        this.value = '';
        this.innerHTML = '';
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] || null; }
    appendChild(child) { this.children.push(child); }
}

const mockSelectElements = {
    'heading-preset-select': new MockElement('select'),
    'modal-heading-preset-select': new MockElement('select')
};

const mockDocument = {
    documentElement: new MockElement('html'),
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => mockSelectElements[id] || null
};
mockDocument.documentElement.setAttribute('data-editor-theme', 'dark');

// Set up Global Scope
global.window = global;
global.document = mockDocument;
global.localStorage = mockLocalStorage;
global.EditorManager = mockEditorManager;
global.ENABLE_DEBUG_HANDLER = true; // Enables Error throwing on assert_arg failure

// 2. Load style-editor.js into global context
const styleEditorPath = path.join(__dirname, '..', 'style-editor.js');
const styleEditorCode = fs.readFileSync(styleEditorPath, 'utf8');
eval(styleEditorCode);

// 3. Test Cases

// Test Case 1: Object Exposure and Forwarder Integrity
assert(typeof StylePresetManager === 'object', 'StylePresetManager object is defined globally');
assert(typeof StyleEditor.StylePresetManager === 'object', 'StyleEditor.StylePresetManager is exposed');
assert(StylePresetManager === StyleEditor.StylePresetManager, 'StylePresetManager reference equality');
assert(window.getHeadingPresets === StylePresetManager.getPresets, 'Legacy window.getHeadingPresets forwarder');
assert(window.saveHeadingPresets === StylePresetManager.savePresets, 'Legacy window.saveHeadingPresets forwarder');
assert(window.syncNewHeadingPresets === StylePresetManager.syncPresets, 'Legacy window.syncNewHeadingPresets forwarder');
assert(window.applyHeadingPreset === StylePresetManager.applyPreset, 'Legacy window.applyHeadingPreset forwarder');
assert(window.updatePresetSelectOptions === StylePresetManager.updateSelects, 'Legacy window.updatePresetSelectOptions forwarder');

// Test Case 2: Reading Default Presets & Storage CRUD
mockLocalStorage.clear();
const defaultPresets = StylePresetManager.getPresets();
assert(Array.isArray(defaultPresets) && defaultPresets.length >= 5, 'getPresets returns default presets (>= 5)');
assert(defaultPresets[0].id === 'github_classic', 'Default preset #1 is github_classic');

const customPresets = [
    { id: 'custom_1', name: 'Custom One', styles: { h1: { colorLight: '#ff0000' } } }
];
StylePresetManager.savePresets(customPresets);
const loadedPresets = StylePresetManager.getPresets();
assert(loadedPresets.length === 1 && loadedPresets[0].id === 'custom_1', 'savePresets and getPresets storage roundtrip');

// Test Case 3: Schema Syncing (syncPresets)
// Inject preset missing codeblock style and verify syncPresets adds codeblock + restores missing default presets
const incompletePresets = [
    { id: 'custom_2', name: 'Custom Two', styles: { h1: { colorLight: '#00ff00' } } }
];
mockLocalStorage.setItem('markvi_heading_presets', JSON.stringify(incompletePresets));
StylePresetManager.syncPresets();
const syncedPresets = StylePresetManager.getPresets();
assert(syncedPresets.some(p => p.id === 'custom_2' && p.styles.codeblock), 'syncPresets auto-adds missing codeblock property');
assert(syncedPresets.some(p => p.id === 'github_classic'), 'syncPresets restores missing default preset (github_classic)');

// Test Case 4: Preset Application & CSS Variable Binding (applyPreset)
mockLocalStorage.clear();
appliedStylesHistory.length = 0;
StylePresetManager.applyPreset('github_classic');
assert(appliedStylesHistory.length === 1, 'applyPreset calls EditorManager.apply_heading_preset');
assert(appliedStylesHistory[0].theme === 'dark', 'applyPreset passes current document theme');
assert(mockLocalStorage.getItem('markvi_active_heading_preset') === 'github_classic', 'applyPreset updates active preset in localStorage');
assert(mockSelectElements['heading-preset-select'].value === 'github_classic', 'applyPreset updates select element value');

// Test Case 5: Dropdown Select Options Rendering (updateSelects)
const testSelect = new MockElement('select');
StylePresetManager.updateSelects([testSelect]);
assert(testSelect.children.length >= 5, 'updateSelects populates option elements corresponding to presets');
assert(testSelect.children[0].value === 'github_classic', 'Option element value set correctly');

// Test Case 6: assert_arg Parameter Validation
let saveAssertionFailed = false;
try {
    StylePresetManager.savePresets('not_an_array');
} catch (e) {
    if (e.message.includes('[System Assertion Failed] save_heading_presets_data')) {
        saveAssertionFailed = true;
    }
}
assert(saveAssertionFailed, 'assert_arg rejects non-array presets parameter in savePresets');

let applyAssertionFailed = false;
try {
    StylePresetManager.applyPreset(12345);
} catch (e) {
    if (e.message.includes('[System Assertion Failed] apply_heading_preset_ui')) {
        applyAssertionFailed = true;
    }
}
assert(applyAssertionFailed, 'assert_arg rejects non-string presetId parameter in applyPreset');

console.log('\n========================================');
console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('========================================\n');

process.exit(failCount === 0 ? 0 : 1);
