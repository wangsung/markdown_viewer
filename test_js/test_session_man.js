/**
 * test_session_man.js - SessionManager (frame-man.js) 서브 모듈 전용 Node 단위 테스트 러너
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 브라우저 런타임 환경 Mocking
global.window = global;
global.ENABLE_DEBUG_HANDLER = false;
global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
};

function createMockElement(id = '', tag = 'div') {
    const classSet = new Set();
    const attributes = {};
    const styleObj = {
        display: 'block',
        width: '',
        cursor: '',
        userSelect: '',
        setProperty: function(k, v) { this[k] = v; }
    };
    const listeners = {};

    return {
        id,
        tagName: tag.toUpperCase(),
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls),
            toggle: (cls) => classSet.has(cls) ? classSet.delete(cls) : classSet.add(cls)
        },
        style: styleObj,
        value: '',
        textContent: '',
        checked: true,
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
        contains: (target) => false,
        getBoundingClientRect: () => ({ left: 0, width: 1000 }),
        addEventListener: (event, fn) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
        },
        removeEventListener: (event, fn) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(f => f !== fn);
            }
        },
        trigger: (event, eventData = {}) => {
            if (listeners[event]) {
                listeners[event].forEach(fn => fn(eventData));
            }
        }
    };
}

global.document = {
    documentElement: createMockElement('html', 'html'),
    body: createMockElement('body', 'body'),
    getElementById: (id) => createMockElement(id),
    querySelector: (sel) => createMockElement(sel),
    createElement: (tag) => createMockElement(tag, tag),
    addEventListener: () => {},
    removeEventListener: () => {}
};

// Target Module Load
const frameManPath = path.join(__dirname, '..', 'frame-man.js');
const frameManCode = fs.readFileSync(frameManPath, 'utf8');
eval(frameManCode);

let passCount = 0;
let failCount = 0;

function runAssert(condition, message) {
    if (condition) {
        passCount++;
        console.log('✅ PASS:', message);
    } else {
        failCount++;
        console.log('❌ FAIL:', message);
    }
}

function runTestSuite() {
    console.log('🚀 Running SessionManager Unit Test Suite...\n');

    // Test 1: Module and Exports
    runAssert(typeof SessionManager === 'object', 'window.SessionManager object exists');
    runAssert(typeof FrameManager.SessionManager === 'object', 'FrameManager.SessionManager object exists');
    runAssert(typeof SessionManager.init === 'function', 'SessionManager.init is a function');
    runAssert(typeof SessionManager.getKey === 'function', 'SessionManager.getKey is a function');
    runAssert(typeof SessionManager.saveData === 'function', 'SessionManager.saveData is a function');
    runAssert(typeof SessionManager.readData === 'function', 'SessionManager.readData is a function');
    runAssert(typeof SessionManager.restoreContent === 'function', 'SessionManager.restoreContent is a function');
    runAssert(typeof SessionManager.restoreUI === 'function', 'SessionManager.restoreUI is a function');

    // Test 2: Default Key Resolution
    global.localStorage.clear();
    const defaultRes = SessionManager.init({ searchString: '' });
    runAssert(defaultRes.key === 'markvi_document_session', 'Default searchString resolves to "markvi_document_session"');
    runAssert(defaultRes.isNewSessionSkippedRestore === false, 'Default searchString sets isNewSessionSkippedRestore to false');
    runAssert(SessionManager.getKey() === 'markvi_document_session', 'SessionManager.getKey() matches default key');

    // Test 3: ?new=1 Key Resolution
    const newRes = SessionManager.init({ searchString: '?new=1' });
    runAssert(newRes.key.startsWith('markvi_document_session_'), '?new=1 resolves key with session prefix');
    runAssert(newRes.isNewSessionSkippedRestore === true, '?new=1 sets isNewSessionSkippedRestore to true');
    runAssert(SessionManager.isNewSessionSkippedRestore() === true, 'SessionManager.isNewSessionSkippedRestore() returns true for ?new=1');

    // Test 4: ?session=id Key Resolution
    const sessionRes = SessionManager.init({ searchString: '?session=test1234' });
    runAssert(sessionRes.key === 'markvi_document_session_test1234', '?session=test1234 resolves key "markvi_document_session_test1234"');
    runAssert(sessionRes.isNewSessionSkippedRestore === false, '?session=test1234 sets isNewSessionSkippedRestore to false');

    // Test 5: Session Saving & Reading
    SessionManager.init({ searchString: '' }); // Reset to default key
    const sampleData = {
        content: '# Test Title\nHello World',
        filename: 'test.md',
        isDirty: true,
        fontFamily: 'Consolas',
        fontSize: '120%'
    };
    const saveRes = SessionManager.saveData(sampleData);
    runAssert(saveRes === true, 'SessionManager.saveData returns true on successful save');

    const readData = SessionManager.readData();
    runAssert(readData !== null && typeof readData === 'object', 'SessionManager.readData returns parsed session object');
    runAssert(readData.content === '# Test Title\nHello World', 'Read session content matches saved data');
    runAssert(readData.filename === 'test.md', 'Read session filename matches saved data');
    runAssert(readData.isDirty === true, 'Read session isDirty matches saved data');

    // Test 6: Editor Content Restoration
    let restoredContent = '';
    let restoredFilename = '';
    let restoredIsDirty = false;

    const mockCm = {
        setValue: function(val) { restoredContent = val; }
    };
    const mockCallbacks = {
        onUpdateFilename: function(name, dirty) {
            restoredFilename = name;
            restoredIsDirty = dirty;
        }
    };

    SessionManager.setNewSessionSkippedRestore(false);
    const restoreRes = SessionManager.restoreContent(mockCm, readData, mockCallbacks);
    runAssert(restoreRes === true, 'SessionManager.restoreContent returns true');
    runAssert(restoredContent === '# Test Title\nHello World', 'CodeMirror content restored correctly');
    runAssert(restoredFilename === 'test.md', 'Filename restored correctly via callback');
    runAssert(restoredIsDirty === true, 'IsDirty state restored correctly via callback');

    // Test 7: Skip restore when isNewSessionSkippedRestore is true
    restoredContent = 'BEFORE';
    SessionManager.setNewSessionSkippedRestore(true);
    SessionManager.restoreContent(mockCm, readData, mockCallbacks);
    runAssert(restoredContent === 'BEFORE', 'Content restoration skipped when isNewSessionSkippedRestore is true');

    // Test 8: UI Restoration Delegation
    SessionManager.setNewSessionSkippedRestore(false);
    const mockUIElements = {
        editorPanel: createMockElement('editor-panel'),
        fontSelect: createMockElement('font-select'),
        fontSizeSelect: createMockElement('font-size-select'),
        preview: createMockElement('preview')
    };

    FrameManager.init({ elements: mockUIElements, actions: {} });
    const uiRes = SessionManager.restoreUI({
        editorWidthPercent: '45%',
        fontFamily: 'monospace',
        fontSize: '110%'
    });
    runAssert(uiRes === true, 'SessionManager.restoreUI returns true');

    // Test 9: assert_arg Failure Handling for invalid arguments
    let assertFailedCount = 0;
    const origError = console.error;
    console.error = () => { assertFailedCount++; };

    // Invalid sessionData to saveData
    const invalidSaveRes = SessionManager.saveData(null);
    runAssert(invalidSaveRes === false, 'SessionManager.saveData returns false for null sessionData');

    // Invalid cmInstance to restoreContent
    const invalidCmRes = SessionManager.restoreContent(null, sampleData);
    runAssert(invalidCmRes === false, 'SessionManager.restoreContent returns false for null cmInstance');

    // Test 10: Facade Method saveSession(editorState, fileState, uiElements) & restoreSession
    runAssert(typeof SessionManager.saveSession === 'function', 'SessionManager.saveSession is a function');
    runAssert(typeof SessionManager.restoreSession === 'function', 'SessionManager.restoreSession is a function');

    const mockCmFacade = {
        getValue: function() { return '# Facade Title\nFacade Content'; },
        setValue: function(val) { this.value = val; }
    };
    const mockEditorState = { cm: mockCmFacade };
    const mockFileState = { filename: 'facade_doc.md', isDirty: true };
    const mockUiElements = {
        fontSelect: { value: 'Roboto' },
        fontSizeSelect: { value: '110%' }
    };

    const saveFacadeRes = SessionManager.saveSession(mockEditorState, mockFileState, mockUiElements);
    runAssert(saveFacadeRes === true, 'SessionManager.saveSession returns true on successful save with separate structures (editorState, fileState, mockUiElements)');

    const restoredFacadeData = SessionManager.restoreSession({
        cm: mockCmFacade,
        onUpdateFilename: function(name, dirty) {
            mockFileState.restoredName = name;
        }
    });
    runAssert(restoredFacadeData !== null && typeof restoredFacadeData === 'object', 'SessionManager.restoreSession returns restored session object');
    runAssert(mockCmFacade.value === '# Facade Title\nFacade Content', 'SessionManager.restoreSession restores CodeMirror value');
    runAssert(mockFileState.restoredName === 'facade_doc.md', 'SessionManager.restoreSession restores filename via callback');

    console.error = origError;
    runAssert(assertFailedCount >= 3, 'assert_arg correctly caught invalid inputs');

    console.log(`\n========================================`);
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`========================================\n`);

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
