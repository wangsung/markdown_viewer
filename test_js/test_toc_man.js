/**
 * test_toc_man.js - TocManager (frame-man.js) 서브 모듈 전용 Node 단위 테스트 러너
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 브라우저 런타임 환경 Mocking
global.window = global;
global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
};

function createMockElement(id = '', tag = 'div') {
    const classSet = new Set();
    const attributes = {};
    const listeners = {};
    const children = [];

    const elem = {
        id,
        tagName: tag.toUpperCase(),
        get className() {
            return Array.from(classSet).join(' ');
        },
        set className(val) {
            classSet.clear();
            if (val) {
                val.split(/\s+/).forEach(c => { if (c) classSet.add(c); });
            }
        },
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls),
            toggle: (cls) => classSet.has(cls) ? classSet.delete(cls) : classSet.add(cls)
        },
        style: {},
        textContent: '',
        innerHTML: '',
        children,
        appendChild: (child) => {
            children.push(child);
            return child;
        },
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] !== undefined ? attributes[k] : null,
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
            if (elem['on' + event]) {
                elem['on' + event](eventData);
            }
            if (listeners[event]) {
                listeners[event].forEach(fn => fn(eventData));
            }
        },
        querySelectorAll: (selector) => {
            if (selector === '.toc-item') {
                return children.filter(c => c.classList && c.classList.contains('toc-item'));
            }
            return [];
        }
    };
    return elem;
}

const mockElements = {
    container: createMockElement('container'),
    preview: createMockElement('preview'),
    tocSidebar: createMockElement('toc-sidebar', 'aside'),
    tocList: createMockElement('toc-list', 'ul'),
    btnTocToggleInner: createMockElement('btn-toc-toggle-inner', 'button'),
    tocToggleBar: createMockElement('toc-toggle-bar', 'button')
};

global.document = {
    body: createMockElement('body', 'body'),
    createElement: (tag) => createMockElement('', tag),
    getElementById: (id) => mockElements[id] || null,
    querySelector: (selector) => null,
    querySelectorAll: (selector) => {
        if (selector === '.toc-item') {
            return mockElements.tocList.querySelectorAll('.toc-item');
        }
        return [];
    }
};

// frame-man.js 스크립트 파일 로드 및 구동
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
    console.log('🚀 Running TocManager Unit Test Suite...\n');

    // Test 1: Global & FrameManager Export Check
    runAssert(typeof window.TocManager === 'object', 'window.TocManager object exists globally');
    runAssert(typeof FrameManager.TocManager === 'object', 'FrameManager.TocManager sub-object exists');
    runAssert(typeof TocManager.init === 'function', 'TocManager.init function exists');
    runAssert(typeof TocManager.render === 'function', 'TocManager.render function exists');
    runAssert(typeof TocManager.toggleSidebar === 'function', 'TocManager.toggleSidebar function exists');
    runAssert(typeof TocManager.highlightActive === 'function', 'TocManager.highlightActive function exists');

    // Test 2: Naming Convention check for pure sub-functions (snake_case)
    const pureSubFuncs = [
        'parse_toc_headings',
        'render_toc_tree_ui',
        'toggle_toc_sidebar_ui',
        'highlight_active_toc_ui'
    ];
    pureSubFuncs.forEach(fn => {
        runAssert(frameManCode.includes(`function ${fn}`), `Pure sub-function '${fn}' defined in snake_case`);
    });

    // Test 3: TocManager.init and Bindings
    let selectedLineFromInit = null;
    const initRes = TocManager.init({
        elements: mockElements,
        onSelectHeading: (line) => { selectedLineFromInit = line; }
    });
    runAssert(initRes === true, 'TocManager.init returns true on valid userOpts');

    // Test button click events bound during init
    mockElements.btnTocToggleInner.trigger('click');
    runAssert(mockElements.tocSidebar.classList.contains('collapsed'), 'btnTocToggleInner click collapses TOC sidebar');
    runAssert(mockElements.btnTocToggleInner.getAttribute('aria-expanded') === 'false', 'btnTocToggleInner aria-expanded is false when collapsed');
    runAssert(mockElements.tocToggleBar.getAttribute('aria-expanded') === 'false', 'tocToggleBar aria-expanded is false when collapsed');

    mockElements.tocToggleBar.trigger('click');
    runAssert(!mockElements.tocSidebar.classList.contains('collapsed'), 'tocToggleBar click expands TOC sidebar');
    runAssert(mockElements.btnTocToggleInner.getAttribute('aria-expanded') === 'true', 'btnTocToggleInner aria-expanded is true when expanded');
    runAssert(mockElements.tocToggleBar.getAttribute('aria-expanded') === 'true', 'tocToggleBar aria-expanded is true when expanded');

    // Test keyboard events bound during init
    mockElements.btnTocToggleInner.trigger('keydown', { key: 'Enter', preventDefault: () => {} });
    runAssert(mockElements.tocSidebar.classList.contains('collapsed'), 'btnTocToggleInner keydown Enter collapses TOC sidebar');

    mockElements.tocToggleBar.trigger('keydown', { key: ' ', preventDefault: () => {} });
    runAssert(!mockElements.tocSidebar.classList.contains('collapsed'), 'tocToggleBar keydown Space expands TOC sidebar');

    // Test 4: TocManager.render (Parsing markdown & rendering TOC tree UI)
    const sampleMarkdown = '# Heading 1\nSome content\n## Heading 2\nMore content\n### Heading 3';
    const renderRes = TocManager.render(sampleMarkdown);
    runAssert(renderRes === true, 'TocManager.render returns true for valid markdown string');
    runAssert(mockElements.tocList.children.length === 3, 'TocManager.render creates 3 TOC items in tocList');
    
    // Check rendered item properties & line attributes
    const item1 = mockElements.tocList.children[0];
    const item2 = mockElements.tocList.children[1];
    const item3 = mockElements.tocList.children[2];

    runAssert(item1.classList.contains('toc-h1') && item1.getAttribute('data-line') === '1', 'Item 1 rendered with toc-h1 and data-line="1"');
    runAssert(item2.classList.contains('toc-h2') && item2.getAttribute('data-line') === '3', 'Item 2 rendered with toc-h2 and data-line="3"');
    runAssert(item3.classList.contains('toc-h3') && item3.getAttribute('data-line') === '5', 'Item 3 rendered with toc-h3 and data-line="5"');

    // Test clicking heading link triggers onSelectHeading callback
    const anchor1 = item1.children[0];
    runAssert(anchor1 && anchor1.textContent === 'Heading 1', 'Anchor element contains heading text');
    anchor1.trigger('click', { preventDefault: () => {} });
    runAssert(selectedLineFromInit === 1, 'Clicking heading link invokes onSelectHeading callback with 1-based line number');

    // Test 5: TocManager.toggleSidebar
    TocManager.toggleSidebar(true);
    runAssert(mockElements.tocSidebar.classList.contains('collapsed'), 'TocManager.toggleSidebar(true) collapses sidebar');

    TocManager.toggleSidebar(false);
    runAssert(!mockElements.tocSidebar.classList.contains('collapsed'), 'TocManager.toggleSidebar(false) expands sidebar');

    TocManager.toggleSidebar(); // no arg -> toggles state
    runAssert(mockElements.tocSidebar.classList.contains('collapsed'), 'TocManager.toggleSidebar() toggles expanded state to collapsed');

    // Test 6: TocManager.highlightActive
    TocManager.highlightActive(3); // Line 3 (Heading 2)
    runAssert(!item1.classList.contains('active'), 'Item 1 does not have active class when line 3 is active');
    runAssert(item2.classList.contains('active'), 'Item 2 has active class when line 3 is active');
    runAssert(!item3.classList.contains('active'), 'Item 3 does not have active class when line 3 is active');

    // Test 7: Strict assert_arg Failure Validations
    window.ENABLE_DEBUG_HANDLER = true;

    assert.throws(() => {
        TocManager.init(null);
    }, /userOpts must be an object/, 'TocManager.init throws assert_arg error when userOpts is null');

    assert.throws(() => {
        TocManager.init('not-an-object');
    }, /userOpts must be an object/, 'TocManager.init throws assert_arg error when userOpts is string');

    assert.throws(() => {
        TocManager.render(12345);
    }, /markdownText must be a string/, 'TocManager.render throws assert_arg error when markdownText is number');

    assert.throws(() => {
        TocManager.render(null);
    }, /markdownText must be a string/, 'TocManager.render throws assert_arg error when markdownText is null');

    assert.throws(() => {
        TocManager.highlightActive(-1);
    }, /activeLine must be a non-negative number/, 'TocManager.highlightActive throws assert_arg error when activeLine is negative');

    assert.throws(() => {
        TocManager.highlightActive('invalid-line');
    }, /activeLine must be a non-negative number/, 'TocManager.highlightActive throws assert_arg error when activeLine is not a number');

    assert.throws(() => {
        const invalidTocMan = Object.assign({}, TocManager, { options: { elements: { tocSidebar: mockElements.tocSidebar } } });
        invalidTocMan.toggleSidebar('not-boolean');
    }, /forceState must be a boolean/, 'toggle_toc_sidebar_ui throws assert_arg error when forceState is not boolean');

    assert.throws(() => {
        const invalidTocMan = Object.assign({}, TocManager, { options: { elements: { tocSidebar: null } } });
        invalidTocMan.toggleSidebar(true);
    }, /tocSidebar DOM element is required/, 'toggle_toc_sidebar_ui throws assert_arg error when tocSidebar is missing');

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
