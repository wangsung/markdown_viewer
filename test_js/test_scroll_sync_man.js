/**
 * test_scroll_sync_man.js
 * Unit test suite for ScrollSyncManager in scroll-sync.js
 * Verification of ScrollSyncManager.init, getInstance, setEnable, rebuildKeyframes, scrollToLine, syncPreviewToCursor, and assert_arg validation.
 * 
 * Run command: node test_js/test_scroll_sync_man.js
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

console.log('🚀 Running ScrollSyncManager Unit Test Suite...\n');

// 1. Mock Browser Runtime Environment
const listeners = {};
const cmListeners = {};

const mockPreviewElement = {
    tagName: 'DIV',
    scrollHeight: 1000,
    clientHeight: 500,
    scrollTop: 0,
    innerHTML: '<h1 data-line="1">Heading 1</h1><p data-line="3">Paragraph</p>',
    scrollIntoView: function() {},
    querySelector: function(selector) {
        if (selector === '[data-line="1"]') {
            return { textContent: 'Heading 1', getAttribute: () => '1', scrollIntoView: function() {} };
        }
        return null;
    },
    querySelectorAll: function(selector) {
        return [
            { textContent: 'Heading 1', getAttribute: () => '1', tagName: 'H1', scrollIntoView: function() {} }
        ];
    },
    addEventListener: function(event, handler) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
    },
    removeEventListener: function(event, handler) {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(h => h !== handler);
        }
    },
    scrollTo: function(opts) {
        if (typeof opts === 'object') {
            this.scrollTop = opts.top;
        }
    },
    closest: function() { return null; }
};

const mockCmInstance = {
    getValue: function() {
        return '# Heading 1\n\nSome text here\n\n## Heading 2\n';
    },
    getScrollInfo: function() {
        return { top: 0, height: 1000, clientHeight: 500 };
    },
    getCursor: function() {
        return { line: 0, ch: 0 };
    },
    charCoords: function(pos, mode) {
        return { top: 10, bottom: 20 };
    },
    heightAtLine: function(line, mode) {
        return line * 20;
    },
    scrollTo: function(x, y) {
        this.lastScrollY = y;
    },
    getWrapperElement: function() {
        return mockPreviewElement;
    },
    on: function(event, handler) {
        if (!cmListeners[event]) cmListeners[event] = [];
        cmListeners[event].push(handler);
    },
    off: function(event, handler) {
        if (cmListeners[event]) {
            cmListeners[event] = cmListeners[event].filter(h => h !== handler);
        }
    },
    refresh: function() {}
};

// Global mocks
global.window = global;
global.document = {
    querySelector: (sel) => mockPreviewElement,
    querySelectorAll: (sel) => [mockPreviewElement],
    createElement: (tag) => ({ style: {}, setAttribute: () => {} })
};
global.setTimeout = (fn, delay) => { fn(); return 1; };
global.addEventListener = (event, fn) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
};

// 2. Load scroll-sync.js into global environment
const scrollSyncPath = path.join(__dirname, '..', 'scroll-sync.js');
const scrollSyncCode = fs.readFileSync(scrollSyncPath, 'utf8');
eval(scrollSyncCode);

// 3. Test Cases Execution

// Test Case 1: Object Exposure and Forwarder Integrity
assert(typeof ScrollSyncManager === 'object' && ScrollSyncManager !== null, 'ScrollSyncManager object is defined');
assert(window.ScrollSyncManager === ScrollSyncManager, 'window.ScrollSyncManager reference equality');
assert(ScrollSync.Manager === ScrollSyncManager, 'ScrollSync.Manager reference equality');
assert(typeof ScrollSyncManager.init === 'function', 'ScrollSyncManager.init method exists');
assert(typeof ScrollSyncManager.getInstance === 'function', 'ScrollSyncManager.getInstance method exists');
assert(typeof ScrollSyncManager.setEnable === 'function', 'ScrollSyncManager.setEnable method exists');
assert(typeof ScrollSyncManager.rebuildKeyframes === 'function', 'ScrollSyncManager.rebuildKeyframes method exists');
assert(typeof ScrollSyncManager.scrollToLine === 'function', 'ScrollSyncManager.scrollToLine method exists');
assert(typeof ScrollSyncManager.syncPreviewToCursor === 'function', 'ScrollSyncManager.syncPreviewToCursor method exists');

// Test Case 2: assert_arg Validation on Invalid Initialization Parameters
console.log('\n--- Testing assert_arg Parameter Validation ---');
const invalidInit1 = ScrollSyncManager.init(null, null);
assert(invalidInit1 === null, 'ScrollSyncManager.init(null, null) returns null on assert_arg failure');

const invalidInit2 = ScrollSyncManager.init(mockCmInstance, null);
assert(invalidInit2 === null, 'ScrollSyncManager.init(cm, null) returns null on assert_arg failure');

const invalidInit3 = ScrollSyncManager.init(null, mockPreviewElement);
assert(invalidInit3 === null, 'ScrollSyncManager.init(null, preview) returns null on assert_arg failure');

// Test Case 3: Successful Initialization & getInstance Binding
console.log('\n--- Testing Initialization & Instance Management ---');
const instance = ScrollSyncManager.init(mockCmInstance, mockPreviewElement, { enableScrollSync: true });
assert(instance !== null, 'ScrollSyncManager.init returns valid ScrollSync instance');
assert(instance instanceof ScrollSync, 'Returned instance is an instance of ScrollSync');
assert(ScrollSyncManager.getInstance() === instance, 'ScrollSyncManager.getInstance() returns current active instance');

// Test Case 4: setEnable Delegation
console.log('\n--- Testing setEnable Delegation ---');
ScrollSyncManager.setEnable(false);
assert(instance.isEnabled === false, 'ScrollSyncManager.setEnable(false) updates instance.isEnabled');
ScrollSyncManager.setEnable(true);
assert(instance.isEnabled === true, 'ScrollSyncManager.setEnable(true) restores instance.isEnabled');

// Test Case 5: rebuildKeyframes Delegation
console.log('\n--- Testing rebuildKeyframes Delegation ---');
ScrollSyncManager.rebuildKeyframes('Unit Test Execution');
assert(Array.isArray(instance.keyframes) && instance.keyframes.length >= 2, 'rebuildKeyframes builds keyframes array');
assert(instance.keyframes[0].line === 1, 'Keyframe 0 starts at line 1 boundary anchor');

// Test Case 6: scrollToLine Delegation
console.log('\n--- Testing scrollToLine Delegation ---');
let scrollToLineExecuted = false;
const originalScrollToLine = instance.scrollToLine;
instance.scrollToLine = function(lineNum) {
    scrollToLineExecuted = true;
    return originalScrollToLine.call(this, lineNum);
};
ScrollSyncManager.scrollToLine(1);
assert(scrollToLineExecuted === true, 'ScrollSyncManager.scrollToLine delegates correctly to ScrollSync instance');

// Test Case 7: syncPreviewToCursor Delegation
console.log('\n--- Testing syncPreviewToCursor Delegation ---');
let syncPreviewExecuted = false;
const originalSync = instance.syncPreviewToCursor;
instance.syncPreviewToCursor = function() {
    syncPreviewExecuted = true;
    return originalSync.call(this);
};
ScrollSyncManager.syncPreviewToCursor();
assert(syncPreviewExecuted === true, 'ScrollSyncManager.syncPreviewToCursor delegates correctly to ScrollSync instance');

// 4. Test Summary Report
console.log('\n==================================================');
console.log(`ScrollSyncManager Unit Test Results: PASS=${passCount}, FAIL=${failCount}`);
console.log('==================================================');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
