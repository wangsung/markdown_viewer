/**
 * test_file_drop_man.js - FileDropManager & Drag/Drop Sub-functions Unit Test Runner
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Mock Browser Environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
};

class MockFileReader {
    readAsText(file) {
        setTimeout(() => {
            const result = file.content !== undefined ? file.content : (file._content !== undefined ? file._content : '# Sample Markdown');
            if (typeof this.onload === 'function') {
                this.onload({ target: { result: result }, result: result });
            }
        }, 5);
    }
}
global.FileReader = MockFileReader;

function createMockElement(id = '', tag = 'div') {
    const classSet = new Set();
    const attributes = {};
    const listeners = {};

    return {
        id,
        tagName: tag.toUpperCase(),
        nodeType: 1,
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls),
            toggle: (cls) => classSet.has(cls) ? classSet.delete(cls) : classSet.add(cls)
        },
        style: { setProperty: function() {} },
        textContent: '',
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
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

// 2. Load frame-man.js
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

async function runTestSuite() {
    console.log('🚀 Running FileDropManager Unit Test Suite...\n');

    // Test 1: Module & API Existence
    runAssert(typeof FileDropManager === 'object', 'window.FileDropManager object exists globally');
    runAssert(typeof FrameManager.FileDropManager === 'object', 'FrameManager.FileDropManager sub-object exists');
    runAssert(typeof FileDropManager.init === 'function', 'FileDropManager.init function exists');
    runAssert(typeof FileDropManager.handleDropEvent === 'function', 'FileDropManager.handleDropEvent function exists');
    runAssert(typeof FileLoader === 'object', 'window.FileLoader object exists globally');
    runAssert(typeof FrameManager.FileLoader === 'object', 'FrameManager.FileLoader sub-object exists');
    runAssert(typeof FileLoader.loadSingleFile === 'function', 'FileLoader.loadSingleFile function exists');

    // Test 2: File Extension & Type Validation (is_allowed_markdown_file)
    const is_allowed_markdown_file = FileLoader.is_allowed_markdown_file;
    const read_file_content_as_text = FileLoader.read_file_content_as_text;
    const setup_drag_drop_overlay_ui = FileDropManager.setup_drag_drop_overlay_ui;

    runAssert(is_allowed_markdown_file('doc.md', 'text/markdown') === true, 'is_allowed_markdown_file accepts .md');
    runAssert(is_allowed_markdown_file('doc.markdown', '') === true, 'is_allowed_markdown_file accepts .markdown');
    runAssert(is_allowed_markdown_file('notes.txt', 'text/plain') === true, 'is_allowed_markdown_file accepts .txt');
    runAssert(is_allowed_markdown_file('page.html', '') === true, 'is_allowed_markdown_file accepts .html');
    runAssert(is_allowed_markdown_file('data.json', '') === true, 'is_allowed_markdown_file accepts .json');
    runAssert(is_allowed_markdown_file('custom.unknown', 'text/x-custom') === true, 'is_allowed_markdown_file accepts text/* MIME type');

    runAssert(is_allowed_markdown_file('image.png', 'image/png') === false, 'is_allowed_markdown_file rejects .png');
    runAssert(is_allowed_markdown_file('app.exe', 'application/octet-stream') === false, 'is_allowed_markdown_file rejects .exe');
    runAssert(is_allowed_markdown_file('archive.zip', '') === false, 'is_allowed_markdown_file rejects .zip');

    // Test 3: FileReader Async Loading (read_file_content_as_text)
    const mockFile = { name: 'test.md', type: 'text/markdown', content: '# Hello World\nTesting FileDropManager' };
    let loadedContent = null;
    read_file_content_as_text(mockFile, (content) => {
        loadedContent = content;
    });

    await new Promise(resolve => setTimeout(resolve, 30));
    runAssert(loadedContent === '# Hello World\nTesting FileDropManager', 'read_file_content_as_text reads content via FileReader');

    // Test 4: Drag Overlay UI Toggle (setup_drag_drop_overlay_ui)
    const mockContainer = createMockElement('editor-container');
    const overlayState = setup_drag_drop_overlay_ui(mockContainer);
    runAssert(overlayState !== null && typeof overlayState.resetCounter === 'function', 'setup_drag_drop_overlay_ui returns reset controller');

    const preventDefaultMock = () => {};
    // Enter 1 -> Add drag-over
    mockContainer.trigger('dragenter', { preventDefault: preventDefaultMock });
    runAssert(mockContainer.classList.contains('drag-over'), 'dragenter adds drag-over CSS class on first dragenter');

    // Enter 2 (nested element) -> Keep drag-over
    mockContainer.trigger('dragenter', { preventDefault: preventDefaultMock });
    runAssert(mockContainer.classList.contains('drag-over'), 'dragenter maintains drag-over CSS class on nested dragenter');

    // Leave 1 -> Still drag-over
    mockContainer.trigger('dragleave', { preventDefault: preventDefaultMock });
    runAssert(mockContainer.classList.contains('drag-over'), 'dragleave keeps drag-over CSS class when nested counter > 0');

    // Leave 2 -> Removes drag-over
    mockContainer.trigger('dragleave', { preventDefault: preventDefaultMock });
    runAssert(!mockContainer.classList.contains('drag-over'), 'dragleave removes drag-over CSS class when counter reaches 0');

    // Reset counter helper
    mockContainer.trigger('dragenter', { preventDefault: preventDefaultMock });
    runAssert(mockContainer.classList.contains('drag-over'), 'dragenter sets drag-over again');
    overlayState.resetCounter();
    runAssert(!mockContainer.classList.contains('drag-over'), 'resetCounter removes drag-over CSS class');

    // Test 5: FileLoader.configure({callbacks}) registers default callbacks independently of
    // FileDropManager, then a bare FileLoader.loadSingleFile(file) call (no explicit callbacks) picks them up
    let callbackLoadedContent = null;
    let callbackLoadedFile = null;
    FileLoader.configure({
        callbacks: {
            onFileLoaded: (content, file, handle) => {
                callbackLoadedContent = content;
                callbackLoadedFile = file;
            }
        }
    });

    const dropFile = { name: 'sample.md', type: 'text/markdown', content: '# Drop Content' };
    FileLoader.loadSingleFile(dropFile);

    await new Promise(resolve => setTimeout(resolve, 30));
    runAssert(callbackLoadedContent === '# Drop Content', 'FileLoader.configure registers default callback independently, invoked on bare loadSingleFile call');
    runAssert(callbackLoadedFile && callbackLoadedFile.name === 'sample.md', 'FileLoader.loadSingleFile passes file object to registered default callback');

    // Test 6: File size limit rejection (50MB default limit), explicit onError overrides registered default
    let errorMessage = null;
    const oversizedFile = { name: 'large.md', type: 'text/markdown', size: 60 * 1024 * 1024, content: 'huge data' }; // 60MB
    const loadResult = FileLoader.loadSingleFile(oversizedFile, {
        onError: (msg) => {
            errorMessage = msg;
        }
    });

    runAssert(loadResult === false, 'loadSingleFile returns false when file size exceeds maxFileSize limit');
    runAssert(errorMessage && errorMessage.includes('50MB'), 'loadSingleFile invokes onError callback with user-friendly size limit message');

    // Test 7: Custom maxFileSize configuration (e.g. 100MB) — FileDropManager.init()이 FileLoader에 위임
    FileDropManager.init({ maxFileSize: 100 * 1024 * 1024 });
    runAssert(FileLoader.options.maxFileSize === 100 * 1024 * 1024, 'FileDropManager.init forwards custom maxFileSize option to FileLoader');

    // 이후 테스트에 영향 주지 않도록 기본값 복원
    FileLoader.configure({ maxFileSize: 50 * 1024 * 1024 });

    // Test 8: FileDropManager.handleDropEvent (Fresh Window)
    let extractedFile = null;
    let extractedHandle = null;
    let loadedContentDrop = null;
    const mockDropEvent = {
        preventDefault: () => {},
        dataTransfer: {
            files: [dropFile],
            items: []
        }
    };

    await FileDropManager.handleDropEvent(mockDropEvent, {
        isFreshWindow: () => true,
        onFileExtracted: (file, handle) => {
            extractedFile = file;
            extractedHandle = handle;
        },
        onFileLoaded: (content) => {
            loadedContentDrop = content;
        }
    });

    await new Promise(resolve => setTimeout(resolve, 30));
    runAssert(extractedFile && extractedFile.name === 'sample.md', 'FileDropManager.handleDropEvent extracts file from dataTransfer');
    runAssert(loadedContentDrop === '# Drop Content', 'FileDropManager.handleDropEvent loads single file in fresh window');

    // Test 7: FileDropManager.handleDropEvent (Non-Fresh Window / New Window)
    let newWindowOpened = false;
    let newWindowFile = null;
    await FileDropManager.handleDropEvent(mockDropEvent, {
        isFreshWindow: () => false,
        onOpenNewWindow: (file, handle) => {
            newWindowOpened = true;
            newWindowFile = file;
        }
    });
    runAssert(newWindowOpened === true && newWindowFile.name === 'sample.md', 'FileDropManager.handleDropEvent delegates to onOpenNewWindow when not fresh');

    // Test 8: FileDropManager.handleDropEvent (Disallowed File Type Error)
    errorMessage = null;
    const mockInvalidDropEvent = {
        preventDefault: () => {},
        dataTransfer: {
            files: [{ name: 'virus.exe', type: 'application/octet-stream' }],
            items: []
        }
    };
    await FileDropManager.handleDropEvent(mockInvalidDropEvent, {
        onError: (msg) => { errorMessage = msg; }
    });
    runAssert(errorMessage !== null && errorMessage.includes('불러올 수 없는 파일 형식'), 'FileDropManager.handleDropEvent invokes onError for invalid file extension');

    // Test 9: assert_arg Failures Handling Validation
    console.log('\n--- Testing assert_arg Failure Handling ---');
    window.ENABLE_DEBUG_HANDLER = false; // Prevents process crash to inspect assertion return value

    const invalidFileNameResult = is_allowed_markdown_file('', '');
    runAssert(invalidFileNameResult === false, 'is_allowed_markdown_file returns false on invalid/empty fileName assertion failure');

    const invalidSetupResult = setup_drag_drop_overlay_ui(null);
    runAssert(invalidSetupResult === null, 'setup_drag_drop_overlay_ui returns null on invalid editorContainerEl assertion failure');

    const invalidReadResult1 = read_file_content_as_text(null, () => {});
    runAssert(invalidReadResult1 === false, 'read_file_content_as_text returns false on invalid file object assertion failure');

    const invalidReadResult2 = read_file_content_as_text({ name: 'test.md' }, null);
    runAssert(invalidReadResult2 === false, 'read_file_content_as_text returns false on invalid onComplete callback assertion failure');

    const invalidLoadResult = FileLoader.loadSingleFile(null);
    runAssert(invalidLoadResult === false, 'FileLoader.loadSingleFile returns false on invalid file object assertion failure');

    window.ENABLE_DEBUG_HANDLER = true; // Restore debug handler mode

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
