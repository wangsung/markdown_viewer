/**
 * test_frame_man.js - FrameManager (frame-man.js) 서브 모듈 전용 Node 단위 테스트 러너
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
    const styleObj = { display: 'block', cursor: '', userSelect: '' };
    const attributes = {};
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
        textContent: '',
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
    console.log('🚀 Running FrameManager Unit Test Suite...\n');

    // Test 1: FrameManager Module Presence
    runAssert(typeof FrameManager === 'object', 'FrameManager module exists globally');
    runAssert(typeof FrameManager.init === 'function', 'FrameManager.init function exists');
    runAssert(typeof FrameManager.applyTheme === 'function', 'FrameManager.applyTheme function exists');

    // Test 2: Naming Convention check for pure sub-functions (snake_case)
    const pureSubFuncNames = [
        'apply_theme_ui',
        'init_theme_ui',
        'close_all_dropdowns',
        'toggle_dropdown_menu',
        'setup_outside_click_dismissal',
        'calculate_split_percentage',
        'start_drag',
        'drag_move',
        'stop_drag',
        'setup_splitter_events',
        'setup_menu_toggles',
        'setup_button_actions'
    ];

    pureSubFuncNames.forEach(funcName => {
        runAssert(frameManCode.includes(`function ${funcName}`), `Pure sub-function '${funcName}' defined in snake_case`);
    });

    // Test 3: Theme UI Initialization & Toggle
    const mockContainer = createMockElement('editor-container');
    const mockThemeIconSun = createMockElement('theme-icon-sun');
    const mockThemeIconMoon = createMockElement('theme-icon-moon');
    const mockThemeText = createMockElement('theme-toggle-text');
    const mockBtnThemeToggle = createMockElement('btn-theme-toggle');

    let capturedTheme = null;
    FrameManager.init({
        elements: {
            container: mockContainer,
            themeIconSun: mockThemeIconSun,
            themeIconMoon: mockThemeIconMoon,
            themeToggleText: mockThemeText,
            btnThemeToggle: mockBtnThemeToggle
        },
        actions: {
            onThemeChange: (theme) => { capturedTheme = theme; }
        }
    });

    runAssert(mockContainer.getAttribute('data-editor-theme') === 'dark', 'FrameManager initializes default theme to dark');
    runAssert(capturedTheme === 'dark', 'FrameManager triggers onThemeChange callback with dark theme');

    // Test 4: Apply Light Theme
    FrameManager.applyTheme('light');
    runAssert(mockContainer.getAttribute('data-editor-theme') === 'light', 'FrameManager updates container theme attribute to light');
    runAssert(mockThemeText.textContent === 'Light', 'FrameManager updates theme toggle text to Light');
    runAssert(capturedTheme === 'light', 'FrameManager triggers onThemeChange callback with light theme');

    // Test 5: Dropdown Menu Control
    const mockExportMenu = createMockElement('export-menu');
    const mockBtnExport = createMockElement('btn-export');
    const mockBtnNewFile = createMockElement('btn-new-file');

    let newFileClicked = false;
    FrameManager.init({
        elements: {
            btnExport: mockBtnExport,
            exportMenu: mockExportMenu,
            btnNewFile: mockBtnNewFile
        },
        actions: {
            onNewFile: () => { newFileClicked = true; }
        }
    });

    // Toggle Menu Open
    mockBtnExport.trigger('click', { stopPropagation: () => {} });
    runAssert(mockExportMenu.classList.contains('show'), 'FrameManager opens export dropdown menu on click');

    // Click Action Button -> Closes Menu and Triggers Action Callback
    mockBtnNewFile.trigger('click');
    runAssert(!mockExportMenu.classList.contains('show'), 'FrameManager automatically closes dropdown menus on action button click');
    runAssert(newFileClicked === true, 'FrameManager triggers registered action callback (onNewFile)');

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
