const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passCount = 0;
let failCount = 0;

function run_assert(condition, message) {
    if (condition) {
        passCount++;
        console.log(`✅ PASS: ${message}`);
    } else {
        failCount++;
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
        innerHTML: '',
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
                el.closest = () => null; // not inside pre
                el.parentNode = element;
                return [el];
            }
            return [];
        },
        querySelector: (sel) => {
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
        { type: 'paragraph', raw: 'Paragraph with **bold**' }
    ],
    parser: (tokens) => {
        if (tokens[0].type === 'heading') return '<h1>Heading 1</h1>';
        return '<p>Paragraph</p>';
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
    
    // mock removal
    container.querySelectorAll = (sel) => {
        if(sel === '.color-swatch') return [];
        return [];
    };
    window.PreviewManager.removeColorSwatches(container);
    run_assert(container.querySelectorAll('.color-swatch').length === 0, "Color swatches removed correctly");

    // 4. Test renderMarkdown AST parsing and data-line attribute injection
    window.PreviewManager.initMarkedParser();
    const cm = { getValue: () => '# Heading 1\n\nParagraph with **bold**' };
    
    window.PreviewManager.renderMarkdown(cm, container, {checked: false}, null, null);
    
    run_assert(container.innerHTML.includes('<h1 data-line="1"'), "H1 element has correct data-line attribute injected via AST parsing");
    run_assert(container.innerHTML.includes('<p data-line="3"'), "P element has correct data-line attribute injected via AST parsing");

    console.log('\n======================================================================');
    console.log(`📊 테스트 결과 요약: 총 ${passCount + failCount}개 항목 중 PASS: ${passCount}, FAIL: ${failCount}`);
    console.log('======================================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

run_tests();
