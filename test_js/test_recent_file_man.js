/**
 * test_recent_file_man.js
 * FrameManager RecentFileManager (recent file CRUD, IndexedDB fallback handling, getRecentFiles, addRecentFile, and assert_arg validation) Unit Test Suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock localStorage
let localStorageData = {};
global.localStorage = {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = String(v); },
    removeItem: (k) => { delete localStorageData[k]; },
    clear: () => { localStorageData = {}; }
};

// Mock IndexedDB Store
let idbStoreMap = {};
function createMockIDB() {
    return {
        open: () => {
            const req = {
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null
            };
            setTimeout(() => {
                const db = {
                    objectStoreNames: { contains: () => true },
                    transaction: () => ({
                        objectStore: () => ({
                            put: (data) => { idbStoreMap[data.name] = data; },
                            get: (key) => {
                                const getReq = { result: idbStoreMap[key] || null };
                                setTimeout(() => {
                                    if (typeof getReq.onsuccess === 'function') getReq.onsuccess();
                                }, 0);
                                return getReq;
                            }
                        })
                    })
                };
                if (typeof req.onsuccess === 'function') {
                    req.onsuccess({ target: { result: db } });
                }
            }, 0);
            return req;
        }
    };
}

// Mock DOM elements
function createMockElement(id = '', tag = 'div') {
    const classSet = new Set();
    const styleObj = { display: 'block', setProperty: function(k, v) { this[k] = v; } };
    return {
        id,
        tagName: tag.toUpperCase(),
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls)
        },
        style: styleObj,
        textContent: '',
        innerHTML: '',
        appendChild: () => {},
        addEventListener: () => {}
    };
}

global.window = global;
global.window.ENABLE_DEBUG_HANDLER = false; // Prevent throwing error on assertion fail for controlled tests
global.window.location = {
    origin: 'http://localhost:3000',
    pathname: '/markdown_viewer.html',
    search: ''
};
global.window.indexedDB = createMockIDB();

global.document = {
    documentElement: createMockElement('html', 'html'),
    body: createMockElement('body', 'body'),
    getElementById: (id) => createMockElement(id),
    querySelector: (sel) => createMockElement(sel),
    createElement: (tag) => createMockElement(tag, tag),
    addEventListener: () => {},
    removeEventListener: () => {}
};

// Load FrameManager
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

async function runTests() {
    console.log('🚀 Running RecentFileManager Standalone Unit Test Suite...\n');

    // Test 1: API & Module Existence
    runAssert(typeof window.FrameManager === 'object', 'FrameManager exists on window');
    runAssert(typeof window.RecentFileManager === 'object', 'RecentFileManager exists on window');
    runAssert(typeof FrameManager.RecentFileManager === 'object', 'FrameManager.RecentFileManager sub-object exists');
    runAssert(window.RecentFileManager === FrameManager.RecentFileManager, 'window.RecentFileManager reference matches FrameManager.RecentFileManager');
    
    runAssert(typeof RecentFileManager.init === 'function', 'RecentFileManager.init exists');
    runAssert(typeof RecentFileManager.addFile === 'function', 'RecentFileManager.addFile exists');
    runAssert(typeof RecentFileManager.getFiles === 'function', 'RecentFileManager.getFiles exists');
    runAssert(typeof RecentFileManager.getHandle === 'function', 'RecentFileManager.getHandle exists');
    runAssert(typeof RecentFileManager.checkAndLoadUrlParam === 'function', 'RecentFileManager.checkAndLoadUrlParam exists');

    runAssert(typeof FrameManager.initRecentFiles === 'function', 'FrameManager.initRecentFiles forwarding wrapper exists');
    runAssert(typeof FrameManager.addRecentFile === 'function', 'FrameManager.addRecentFile forwarding wrapper exists');
    runAssert(typeof FrameManager.getRecentFiles === 'function', 'FrameManager.getRecentFiles forwarding wrapper exists');
    runAssert(typeof FrameManager.getRecentFileHandle === 'function', 'FrameManager.getRecentFileHandle forwarding wrapper exists');
    runAssert(typeof FrameManager.checkAndLoadRecentUrlParam === 'function', 'FrameManager.checkAndLoadRecentUrlParam forwarding wrapper exists');
    runAssert(typeof window.assert_arg === 'function', 'window.assert_arg exists');

    // Test 2: Recent Files Initial State
    localStorage.clear();
    const initialFiles = RecentFileManager.getFiles();
    runAssert(Array.isArray(initialFiles) && initialFiles.length === 0, 'Initial recent files is empty array');

    // Test 3: addFile & getFiles CRUD via RecentFileManager
    RecentFileManager.addFile('doc1.md', 'C:/path/doc1.md', null, 1024);
    let files = RecentFileManager.getFiles();
    runAssert(files.length === 1, 'Single recent file added via RecentFileManager.addFile');
    runAssert(files[0].name === 'doc1.md', 'File name correctly saved');
    runAssert(files[0].fullPath === 'C:/path/doc1.md', 'File full path correctly saved');
    runAssert(files[0].size === 1024, 'File size correctly saved');

    // Also verify FrameManager forwarding methods return the same data
    let fwFiles = FrameManager.getRecentFiles();
    runAssert(fwFiles.length === 1 && fwFiles[0].name === 'doc1.md', 'FrameManager.getRecentFiles forwarding wrapper returns identical recent files');

    // Test 4: Titleless file '제목 없음.md' ignored
    RecentFileManager.addFile('제목 없음.md', '제목 없음.md');
    files = RecentFileManager.getFiles();
    runAssert(files.length === 1, "'제목 없음.md' is ignored and not added");

    // Test 5: Duplicate File Entry Moved to Top
    RecentFileManager.addFile('doc2.md', 'C:/path/doc2.md');
    RecentFileManager.addFile('doc1.md', 'C:/path/doc1.md');
    files = RecentFileManager.getFiles();
    runAssert(files.length === 2, 'Duplicate entry re-ordered without expanding count');
    runAssert(files[0].name === 'doc1.md', 'Duplicate entry moved to top of recent files list');

    // Test 6: Maximum 5 files limit
    localStorage.clear();
    for (let i = 1; i <= 8; i++) {
        RecentFileManager.addFile(`file_${i}.md`, `C:/path/file_${i}.md`);
    }
    files = RecentFileManager.getFiles();
    runAssert(files.length === 5, 'Recent files list strictly limited to max 5 items');
    runAssert(files[0].name === 'file_8.md', 'Most recently added item is at index 0');

    // Test 7: IndexedDB handle save & get with IndexedDB available
    const mockHandle = { kind: 'file', getFile: async () => ({ name: 'handle_file.md', size: 500 }) };
    RecentFileManager.addFile('handle_file.md', 'C:/path/handle_file.md', mockHandle, 500);
    const retrievedHandle = await RecentFileManager.getHandle('handle_file.md');
    runAssert(retrievedHandle === mockHandle, 'IndexedDB handle saved and retrieved successfully via RecentFileManager.getHandle');
    
    const fwRetrievedHandle = await FrameManager.getRecentFileHandle('handle_file.md');
    runAssert(fwRetrievedHandle === mockHandle, 'IndexedDB handle retrieved via FrameManager.getRecentFileHandle forwarding wrapper');

    // Test 8: IndexedDB Fallback Handling (indexedDB = null)
    global.window.indexedDB = null;
    const fallbackHandle = await RecentFileManager.getHandle('handle_file.md');
    runAssert(fallbackHandle === null, 'IndexedDB handle retrieval returns null gracefully when IndexedDB is unavailable');
    // Restore IDB mock for remaining tests
    global.window.indexedDB = createMockIDB();

    // Test 9: assert_arg validation
    let assertionFailed = false;
    const testFail = window.assert_arg(false, 'Test assertion failure message', { test: 1 });
    runAssert(testFail === false, 'assert_arg returns false when condition is false and ENABLE_DEBUG_HANDLER is false');

    // Testing assert_arg on invalid input to addFile
    const prevCount = RecentFileManager.getFiles().length;
    RecentFileManager.addFile('', ''); // Empty string name should trigger assert_arg fail
    RecentFileManager.addFile('invalid_size.md', 'path', null, -50); // Negative size should trigger assert_arg fail
    const newCount = RecentFileManager.getFiles().length;
    runAssert(prevCount === newCount, 'addFile ignores invalid empty name or negative size due to assert_arg validation');

    // Test 10: RecentFileManager.init Initialization & userOpts assert_arg
    let capturedLoadFile = null;
    const invalidOptsResult = RecentFileManager.init('invalid_opts_str');
    runAssert(Array.isArray(invalidOptsResult), 'RecentFileManager.init handles invalid string userOpts with assert_arg fallback');

    RecentFileManager.init({
        actions: {
            onLoadSingleFile: (file, handle) => { capturedLoadFile = file; }
        }
    });
    const currentList = RecentFileManager.getFiles();
    runAssert(Array.isArray(currentList), 'RecentFileManager.init returns recent files list');

    console.log('\n=================================================');
    console.log(`Summary: PASS = ${passCount}, FAIL = ${failCount}`);
    console.log('=================================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests();
