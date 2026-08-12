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
    const attributes = {};
    const styleObj = {
        display: 'block',
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
        'setup_button_actions',
        'update_filename_display_ui',
        'format_file_size',
        'format_recent_time',
        'render_recent_files_ui',
        'show_toast_ui',
        'apply_preview_max_width_limit_ui',
        'init_debug_panel_ui',
        'toggle_debug_panel_ui',
        'render_debug_panel_ui',
        'calc_scaled_font_size',
        'restore_frame_settings_ui'
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

    // Test 6: updateFilenameDisplay API
    const mockFilenameSpan = createMockElement('current-filename');
    const mockFileBadge = createMockElement('file-badge');
    FrameManager.init({
        elements: {
            filenameSpan: mockFilenameSpan,
            fileBadge: mockFileBadge
        }
    });

    FrameManager.updateFilenameDisplay('test_doc.md', true);
    runAssert(mockFilenameSpan.textContent === 'test_doc.md *', 'FrameManager updates filename text with asterisk when modified');
    runAssert(mockFileBadge.classList.contains('modified'), 'FrameManager adds modified class to file badge');

    FrameManager.updateFilenameDisplay('test_doc.md', false);
    runAssert(mockFilenameSpan.textContent === 'test_doc.md', 'FrameManager updates filename text without asterisk when clean');
    runAssert(!mockFileBadge.classList.contains('modified'), 'FrameManager removes modified class from file badge');

    // Test 7: formatFileSize & formatRecentTime Utilities
    runAssert(FrameManager.formatFileSize(500) === '500 B', 'FrameManager.formatFileSize formats bytes correctly');
    runAssert(FrameManager.formatFileSize(2048) === '2.0 KB', 'FrameManager.formatFileSize formats KB correctly');
    runAssert(FrameManager.formatRecentTime(1700000000000).length > 0, 'FrameManager.formatRecentTime returns formatted time string');

    // Test 8: Recent Files Menu Rendering
    const mockRecentSubmenu = createMockElement('recent-files-submenu');
    mockRecentSubmenu.appendChild = (child) => { mockRecentSubmenu._children = mockRecentSubmenu._children || []; mockRecentSubmenu._children.push(child); };
    
    let selectedRecentEntry = null;
    FrameManager.init({
        elements: {
            recentFilesSubmenu: mockRecentSubmenu
        }
    });
    FrameManager.renderRecentFilesMenu([{ name: 'sample.md', timestamp: Date.now(), size: 1024 }], (entry) => {
        selectedRecentEntry = entry;
    });
    runAssert(mockRecentSubmenu._children && mockRecentSubmenu._children.length === 1, 'FrameManager.renderRecentFilesMenu renders recent file item buttons');

    // Test 9: Preview Max Width Limit
    const mockPreviewViewport = createMockElement('preview-viewport');
    const mockMaxWidthCheckbox = createMockElement('toggle-preview-max-width');
    FrameManager.init({
        elements: {
            previewViewport: mockPreviewViewport,
            togglePreviewMaxWidthCheckbox: mockMaxWidthCheckbox
        }
    });

    FrameManager.applyPreviewMaxWidthLimit(false);
    runAssert(mockPreviewViewport.classList.contains('full-width'), 'FrameManager adds full-width class when max width limit is false');
    runAssert(mockMaxWidthCheckbox.checked === false, 'FrameManager unchecks max width limit checkbox');

    FrameManager.applyPreviewMaxWidthLimit(true);
    runAssert(!mockPreviewViewport.classList.contains('full-width'), 'FrameManager removes full-width class when max width limit is true');
    runAssert(mockMaxWidthCheckbox.checked === true, 'FrameManager checks max width limit checkbox');

    // Test 10: Debug Panel APIs
    const mockDebugPanel = createMockElement('debug-keyframe-panel');
    mockDebugPanel.style.display = 'none';
    let toggledState = null;
    FrameManager.init({
        elements: {
            debugPanel: mockDebugPanel
        }
    });

    FrameManager.toggleDebugPanel((isOpen) => { toggledState = isOpen; });
    runAssert(mockDebugPanel.style.display === 'block', 'FrameManager.toggleDebugPanel shows debug panel on toggle');
    runAssert(toggledState === true, 'FrameManager.toggleDebugPanel invokes callback with true state');

    // Test 11: restoreFrameSettings & calcScaledFontSize APIs
    const mockEditorPanel = createMockElement('editor-panel');
    const mockFontSelect = createMockElement('font-select');
    const mockFontSizeSelect = createMockElement('font-size-select');
    const mockLineColorPicker = createMockElement('line-color-picker');
    const mockColorSwatchCheckbox = createMockElement('color-swatch-checkbox');
    const mockPreviewContainer = createMockElement('markdown-body');

    let restoredLineColor = null;
    let swatchToggled = null;

    FrameManager.init({
        elements: {
            editorPanel: mockEditorPanel,
            fontSelect: mockFontSelect,
            fontSizeSelect: mockFontSizeSelect,
            lineColorPicker: mockLineColorPicker,
            colorSwatchCheckbox: mockColorSwatchCheckbox,
            preview: mockPreviewContainer
        },
        actions: {
            onLineColorChange: (color) => { restoredLineColor = color; },
            onColorSwatchToggle: (enabled) => { swatchToggled = enabled; }
        }
    });

    FrameManager.restoreFrameSettings({
        editorWidthPercent: '45%',
        fontFamily: 'Inter',
        fontSize: '130%',
        lineColor: '#3b82f6',
        previewMaxWidthLimited: false,
        colorSwatchEnabled: false
    });

    runAssert(mockEditorPanel.style.width === '45%', 'FrameManager.restoreFrameSettings restores editorPanel width');
    runAssert(mockFontSelect.value === 'Inter', 'FrameManager.restoreFrameSettings restores fontSelect value');
    runAssert(mockFontSizeSelect.value === '130%', 'FrameManager.restoreFrameSettings restores fontSizeSelect value');
    runAssert(mockLineColorPicker.value === '#3b82f6', 'FrameManager.restoreFrameSettings restores lineColorPicker value');
    runAssert(restoredLineColor === '#3b82f6', 'FrameManager.restoreFrameSettings invokes onLineColorChange callback');
    runAssert(mockColorSwatchCheckbox.checked === false, 'FrameManager.restoreFrameSettings restores colorSwatchCheckbox state');
    runAssert(swatchToggled === false, 'FrameManager.restoreFrameSettings invokes onColorSwatchToggle callback');
    runAssert(FrameManager.calcScaledFontSize('120%', 10) === '12pt', 'FrameManager.calcScaledFontSize computes scaled pt size');

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
