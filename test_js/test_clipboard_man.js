/**
 * test_clipboard_man.js - ClipboardManager 및 copy_preview_to_clipboard_ui 서브 모듈 전용 Node 단위 테스트 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('=====================================================');
console.log('Testing ClipboardManager & copy_preview_to_clipboard_ui');
console.log('=====================================================\n');

let allPassed = true;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        passCount++;
        console.log(`  PASS: ${message}`);
    } else {
        failCount++;
        console.log(`  FAIL: ${message}`);
        allPassed = false;
    }
}

// 1. Verify function & object definitions in export-man.js
const exportManPath = path.join(__dirname, '..', 'export-man.js');
const exportManContent = fs.readFileSync(exportManPath, 'utf8');

console.log('[1/4] Checking export-man.js function and ClipboardManager exports...');
const exportManChecks = [
    'copy_preview_to_clipboard_ui',
    'ClipboardManager',
    'window.ClipboardManager = ExportManager.ClipboardManager'
];

exportManChecks.forEach(term => {
    assert(exportManContent.includes(term), `Found '${term}' in export-man.js`);
});

// 2. Verify app.js legacy code removal and ClipboardManager call
const appPath = path.join(__dirname, '..', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

console.log('\n[2/4] Checking app.js legacy removal and ClipboardManager onCopy binding...');
assert(!appContent.includes('function copyPreviewToClipboard('), 'Legacy function copyPreviewToClipboard removed from app.js');
assert(appContent.includes('ClipboardManager.copyPreview'), 'onCopy updated to call ClipboardManager.copyPreview in app.js');

// 3. Runtime execution test of ClipboardManager
console.log('\n[3/4] Testing ClipboardManager runtime functionality in Node environment...');

let toastMessage = null;
let assertArgCalls = [];
let alertMessages = [];

global.window = {
    assert_arg: (condition, message, context) => {
        assertArgCalls.push({ condition, message, context });
        return !!condition;
    },
    ENABLE_DEBUG_HANDLER: false
};
global.FrameManager = {
    showToast: (msg, duration) => {
        toastMessage = msg;
    }
};
global.alert = (msg) => {
    alertMessages.push(msg);
};
global.document = {
    createRange: () => ({ selectNodeContents: () => {} }),
    execCommand: (cmd) => cmd === 'copy'
};
global.getSelection = () => ({
    removeAllRanges: () => {},
    addRange: () => {}
});

// Evaluate export-man.js in mocked environment
try {
    eval(exportManContent);
} catch (e) {
    console.error('Failed to eval export-man.js:', e);
    process.exit(1);
}

const ClipboardManager = global.window.ClipboardManager || (global.window.ExportManager && global.window.ExportManager.ClipboardManager);

assert(typeof ClipboardManager === 'object', 'ClipboardManager object exists');
assert(typeof ClipboardManager.copyPreview === 'function', 'ClipboardManager.copyPreview is a function');

// Test 3a: Successful copy execution, menu hiding, button dimming, toast notification
let menuClasses = ['show'];
const mockExportMenu = {
    classList: {
        remove: (cls) => {
            menuClasses = menuClasses.filter(c => c !== cls);
        }
    }
};
const mockFeedbackBtn = {
    style: {},
    disabled: false
};
const mockValidPreview = {
    children: [{ tagName: 'DIV' }],
    innerHTML: '<p>Test content</p>'
};

const copyResult = ClipboardManager.copyPreview(mockValidPreview, mockExportMenu, mockFeedbackBtn);

assert(copyResult === true, 'copyPreview returns true for valid preview');
assert(!menuClasses.includes('show'), 'exportMenuEl has "show" class removed');
assert(mockFeedbackBtn.style.opacity === '0.5', 'feedbackBtn opacity dimmed to 0.5');
assert(mockFeedbackBtn.style.pointerEvents === 'none', 'feedbackBtn pointerEvents set to none');
assert(mockFeedbackBtn.disabled === true, 'feedbackBtn disabled set to true');
assert(toastMessage === '📋 프리뷰 내용이 클립보드에 복사되었습니다.', 'Toast notification emitted with expected message');

// Test 3b: Empty preview rejection
alertMessages = [];
const mockEmptyPreview = { children: [] };
const emptyResult = ClipboardManager.copyPreview(mockEmptyPreview);

assert(emptyResult === false, 'copyPreview returns false for empty preview');
assert(alertMessages.includes('복사할 프리뷰 내용이 없습니다.'), 'Empty preview shows alert message');

// 4. Verification of assert_arg failure handling
console.log('\n[4/4] Verifying assert_arg failure handling...');
assertArgCalls = [];

// Call with null previewEl
const nullResult = ClipboardManager.copyPreview(null);
assert(nullResult === false, 'copyPreview returns false when previewEl is null');
assert(assertArgCalls.some(c => c.condition === null && c.message.includes('previewEl is required')), 'assert_arg triggered for null previewEl');

// Call with missing preview children property
assertArgCalls = [];
ClipboardManager.copyPreview({});
assert(assertArgCalls.some(c => c.condition === undefined && c.message.includes('previewEl.children is required')), 'assert_arg triggered for missing previewEl.children');

console.log('\n=====================================================');
if (allPassed && failCount === 0) {
    console.log(`SUCCESS: All ClipboardManager tests passed 100%! (${passCount} PASS, 0 FAIL)`);
    console.log('=====================================================\n');
    process.exit(0);
} else {
    console.error(`FAILURE: ClipboardManager tests failed! (${passCount} PASS, ${failCount} FAIL)`);
    console.error('=====================================================\n');
    process.exit(1);
}
