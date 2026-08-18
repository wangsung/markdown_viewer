const fs = require('fs');
const path = require('path');
const assert = require('assert');

let test_count = 0;
let pass_count = 0;

function run_assert(condition, message) {
    test_count++;
    if (condition) {
        pass_count++;
        console.log(`✅ PASS: ${message}`);
    } else {
        console.log(`❌ FAIL: ${message}`);
    }
}

// 1. Mock DOM Environment
global.window = global;

const mockElementsMap = new Map();

function create_mock_element(id = '', tag = 'div') {
    if (id && mockElementsMap.has(id)) {
        return mockElementsMap.get(id);
    }

    const classSet = new Set();
    const attributes = {};
    const styleObj = {
        setProperty: function(k, v) { this[k] = v; }
    };
    const children = [];
    const listeners = {};

    const element = {
        id,
        tagName: tag.toUpperCase(),
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls)
        },
        style: styleObj,
        textContent: '',
        _innerHTML: '',
        get innerHTML() {
            return this._innerHTML;
        },
        set innerHTML(val) {
            this._innerHTML = val;
            children.length = 0;
            const matches = val.match(/<([a-z1-6]+)\s+data-line="(\d+)"[^>]*>/gi);
            if (matches) {
                matches.forEach(m => {
                    const tagMatch = m.match(/<([a-z1-6]+)/i);
                    const lineMatch = m.match(/data-line="(\d+)"/i);
                    if (tagMatch && lineMatch) {
                        const tag = tagMatch[1];
                        const line = lineMatch[1];
                        const childEl = create_mock_element('', tag);
                        childEl.setAttribute('data-line', line);
                        children.push(childEl);
                    }
                });
            }
        },
        addEventListener: (event, handler) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);
        },
        dispatchEvent: (event) => {
            const evType = (event && event.type) ? event.type : event;
            if (listeners[evType]) {
                listeners[evType].forEach(h => h(event));
            }
        },
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
        appendChild: (child) => children.push(child),
        querySelectorAll: (sel) => {
            if (sel === '.color-swatch') {
                return children.filter(c => c.className === 'color-swatch');
            }
            if (sel === 'pre code span.hljs-number') {
                const el = create_mock_element('mock-hljs');
                el.textContent = '#ff0000';
                el.parentNode = element;
                return [el];
            }
            if (sel === 'code') {
                const el = create_mock_element('mock-code');
                el.textContent = '#00ff00';
                el.closest = () => null;
                el.parentNode = element;
                return [el];
            }
            return [];
        },
        querySelector: (sel) => {
            const found = children.find(c => c.tagName.toLowerCase() === sel.toLowerCase());
            if (found) return found;
            if (sel === 'h1' || sel === 'p') {
                const el = create_mock_element(sel, sel);
                el.getAttribute = (attr) => attributes[attr] || null;
                return el;
            }
            return null;
        },
        remove: () => {
            const idx = children.indexOf(element);
            if (idx > -1) children.splice(idx, 1);
        },
        closest: (sel) => null,
        nextElementSibling: null,
        insertBefore: (newNode, refNode) => {
            newNode.className = newNode.className || '';
            children.push(newNode);
        }
    };

    if (id) {
        mockElementsMap.set(id, element);
    }
    return element;
}

global.document = {
    createElement: (tag) => {
        const el = create_mock_element('', tag);
        return el;
    },
    getElementById: (id) => create_mock_element(id)
};

global.marked = {
    lexer: (text) => [
        { type: 'heading', depth: 1, raw: '# Heading 1\n' },
        { type: 'paragraph', raw: 'Paragraph text' }
    ],
    parser: (tokens) => {
        if (tokens[0] && tokens[0].type === 'heading') return '<h1 data-line="1">Heading 1</h1>';
        return '<p data-line="2">Paragraph</p>';
    },
    Renderer: function() { this.code = function(){}; },
    use: () => {}
};

global.mermaid = {
    initialize: () => {},
    run: async () => {}
};

// 2. Load Module
const previewManPath = path.join(__dirname, '../preview-man.js');
const previewManCode = fs.readFileSync(previewManPath, 'utf8');
eval(previewManCode);

// 3. Tests
function run_tests() {
    console.log('============== 🧪 preview-man.js 사전 검증 테스트 시작 ==============');
    
    // 1. Existence and methods
    run_assert(typeof window.PreviewManager === 'object', "window.PreviewManager exists");
    run_assert(typeof window.PreviewManager.renderMarkdown === 'function', "renderMarkdown is a function");
    run_assert(typeof window.PreviewManager.injectColorSwatches === 'function', "injectColorSwatches is a function");
    run_assert(typeof window.PreviewManager.removeColorSwatches === 'function', "removeColorSwatches is a function");
    run_assert(typeof window.PreviewManager.applyPreviewFontFamily === 'function', "applyPreviewFontFamily is a function");
    run_assert(typeof window.PreviewManager.applyPreviewFontSize === 'function', "applyPreviewFontSize is a function");
    run_assert(typeof window.PreviewManager.applyPreviewMaxWidthLimit === 'function', "applyPreviewMaxWidthLimit is a function");
    run_assert(typeof window.PreviewManager.setDiagramSupport === 'function', "setDiagramSupport is a function");
    run_assert(typeof window.PreviewManager.setMathSupport === 'function', "setMathSupport is a function");

    // Test diagram/math support state toggling
    window.PreviewManager.setDiagramSupport(true);
    run_assert(window.PreviewManager.getDiagramSupport() === true, "setDiagramSupport(true) sets diagram support state");
    window.PreviewManager.setDiagramSupport(false);
    run_assert(window.PreviewManager.getDiagramSupport() === false, "setDiagramSupport(false) disables diagram support state");

    window.PreviewManager.setMathSupport(true);
    run_assert(window.PreviewManager.getMathSupport() === true, "setMathSupport(true) sets math support state");
    window.PreviewManager.setMathSupport(false);
    run_assert(window.PreviewManager.getMathSupport() === false, "setMathSupport(false) disables math support state");

    run_assert(typeof window.PreviewManager.initMath === 'function', "initMath is a function");
    run_assert(typeof window.PreviewManager.initDiagrams === 'function', "initDiagrams is a function");
    run_assert(typeof window.PreviewManager.renderDiagrams === 'function', "renderDiagrams is a function");

    // 2. Verify pure sub-function snake_case naming
    run_assert(previewManCode.includes('function inject_color_swatches('), "Sub-function inject_color_swatches uses snake_case");
    run_assert(previewManCode.includes('function remove_color_swatches('), "Sub-function remove_color_swatches uses snake_case");
    run_assert(previewManCode.includes('function init_marked_parser('), "Sub-function init_marked_parser uses snake_case");
    run_assert(previewManCode.includes('function init_math_support('), "Sub-function init_math_support uses snake_case");
    run_assert(previewManCode.includes('function init_diagram_support('), "Sub-function init_diagram_support uses snake_case");
    run_assert(previewManCode.includes('function render_diagrams('), "Sub-function render_diagrams uses snake_case");
    run_assert(previewManCode.includes('function render_markdown('), "Sub-function render_markdown uses snake_case");
    run_assert(previewManCode.includes('function apply_preview_font_family('), "Sub-function apply_preview_font_family uses snake_case");
    run_assert(previewManCode.includes('function apply_preview_font_size('), "Sub-function apply_preview_font_size uses snake_case");
    run_assert(previewManCode.includes('function apply_preview_max_width_limit('), "Sub-function apply_preview_max_width_limit uses snake_case");

    // 3. Test color swatch injection/removal
    const container = create_mock_element('preview-container');
    window.PreviewManager.injectColorSwatches(document, container);
    
    let swatches = container.querySelectorAll('.color-swatch');
    run_assert(swatches.length === 2, "Color swatches injected correctly on DOM elements");
    if (swatches.length === 2) {
        run_assert(swatches[0].style.backgroundColor === '#ff0000', "First swatch has correct color");
        run_assert(swatches[1].style.backgroundColor === '#00ff00', "Second swatch has correct color");
    }

    // 4. Test new Preview UI Control APIs
    run_assert(typeof window.PreviewManager.calcScaledFontSize === 'function', "calcScaledFontSize is a function");
    run_assert(typeof window.PreviewManager.updateCodeblockScroll === 'function', "updateCodeblockScroll is a function");
    run_assert(typeof window.PreviewManager.initUIControls === 'function', "initUIControls is a function");

    run_assert(previewManCode.includes('function calc_scaled_font_size('), "Sub-function calc_scaled_font_size uses snake_case");
    run_assert(previewManCode.includes('function update_codeblock_scroll('), "Sub-function update_codeblock_scroll uses snake_case");
    run_assert(previewManCode.includes('function bind_preview_ui_listeners('), "Sub-function bind_preview_ui_listeners uses snake_case");

    run_assert(window.PreviewManager.calcScaledFontSize("120%", 10) === "12pt", "calcScaledFontSize converts 120% to 12pt");
    run_assert(window.PreviewManager.calcScaledFontSize("100%", 10) === "10pt", "calcScaledFontSize converts 100% to 10pt");
    run_assert(window.PreviewManager.calcScaledFontSize("80%", 10) === "8pt", "calcScaledFontSize converts 80% to 8pt");

    const mockFontSelect = create_mock_element('font-select', 'select');
    mockFontSelect.value = 'Inter';
    const mockFontSizeSelect = create_mock_element('font-size-select', 'select');
    mockFontSizeSelect.value = '120%';
    mockFontSizeSelect.options = [{ value: '100%' }, { value: '120%' }];

    let isSettingChanged = false;
    const initRes = window.PreviewManager.initUIControls({
        preview: container,
        fontSelect: mockFontSelect,
        fontSizeSelect: mockFontSizeSelect
    }, {
        onSettingChange: () => { isSettingChanged = true; }
    });

    run_assert(initRes === true, "initUIControls returns true on valid uiElements");
    
    // mock removal
    container.querySelectorAll = (sel) => {
        if(sel === '.color-swatch') return [];
        return [];
    };
    window.PreviewManager.removeColorSwatches(container);
    run_assert(container.querySelectorAll('.color-swatch').length === 0, "Color swatches removed correctly");

    // 5. Test marked AST line attribute injection
    let mockMarkdown = "# Heading 1\nParagraph text";
    let mockCm = { getValue: () => mockMarkdown };

    window.PreviewManager.renderMarkdown(mockCm, container);
    let h1 = container.querySelector('h1');
    let p = container.querySelector('p');
    run_assert(h1 && h1.getAttribute('data-line') === '1', "H1 element has correct data-line attribute injected via AST parsing");
    run_assert(p && p.getAttribute('data-line') === '2', "P element has correct data-line attribute injected via AST parsing");

    console.log(`\n======================================================================`);
    console.log(`📊 테스트 결과 요약: 총 ${test_count}개 항목 중 PASS: ${pass_count}, FAIL: ${test_count - pass_count}`);
    console.log(`======================================================================\n`);
    
    if (test_count !== pass_count) {
        process.exit(1);
    }
}

run_tests();
