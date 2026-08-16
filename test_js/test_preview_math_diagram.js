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

// 1. Setup Mock DOM Environment
global.window = global;

let assertArgCalled = false;
global.window.assert_arg = function(condition, message, context) {
    if (!condition) {
        assertArgCalled = true;
        console.log(`  [assert_arg triggered]: ${message}`);
    }
};

const mockElementsMap = new Map();

function create_mock_element(id = '', tag = 'div') {
    if (id && mockElementsMap.has(id)) {
        return mockElementsMap.get(id);
    }

    const classSet = new Set();
    const styleObj = {
        display: '',
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
        checked: false,
        textContent: '',
        innerHTML: '',
        appendChild: (child) => children.push(child),
        querySelectorAll: () => [],
        querySelector: () => null,
        remove: () => {}
    };

    if (id) {
        mockElementsMap.set(id, element);
    }
    return element;
}

global.document = {
    createElement: (tag) => create_mock_element('', tag),
    getElementById: (id) => create_mock_element(id)
};

// Mock KaTeX and Mermaid
global.katex = {
    renderToString: (formula, opts) => `<span class="katex-rendered">${formula}</span>`
};

let mermaidInitialized = false;
let mermaidRunCalled = false;
global.mermaid = {
    initialize: (opts) => { mermaidInitialized = true; },
    run: async (opts) => { mermaidRunCalled = true; }
};

// Mock marked.js
let registeredExtensions = [];
let customRenderer = null;

global.marked = {
    Renderer: function() {
        customRenderer = this;
        this.code = function() {};
    },
    use: (options) => {
        if (options && options.extensions) {
            registeredExtensions.push(...options.extensions);
        }
        if (options && options.renderer) {
            customRenderer = options.renderer;
        }
    },
    lexer: (text) => [{ type: 'paragraph', raw: text }],
    parser: (tokens) => tokens[0].raw
};

// 2. Load preview-man.js
const previewManPath = path.join(__dirname, '../preview-man.js');
const previewManCode = fs.readFileSync(previewManPath, 'utf8');
eval(previewManCode);

function test_preview_math_diagram() {
    console.log('======================================================================');
    console.log('🧪 PreviewManager Math & Diagram Refactoring Unit Test');
    console.log('======================================================================\n');

    // Test 1: Public API existence
    run_assert(typeof window.PreviewManager === 'object', "PreviewManager object exists");
    run_assert(typeof window.PreviewManager.initMath === 'function', "PreviewManager.initMath exists");
    run_assert(typeof window.PreviewManager.initDiagrams === 'function', "PreviewManager.initDiagrams exists");
    run_assert(typeof window.PreviewManager.renderDiagrams === 'function', "PreviewManager.renderDiagrams exists");

    // Test 2: Sub-function snake_case naming
    run_assert(previewManCode.includes('function init_math_support('), "Sub-function init_math_support uses snake_case");
    run_assert(previewManCode.includes('function init_diagram_support('), "Sub-function init_diagram_support uses snake_case");
    run_assert(previewManCode.includes('function render_diagrams('), "Sub-function render_diagrams uses snake_case");

    // Test 3: initMath execution & state update
    const mathWrapper = create_mock_element('math-wrapper');
    const mathCheckbox = create_mock_element('math-checkbox');
    mathWrapper.style.display = 'block';

    const mathResult = window.PreviewManager.initMath({
        mathRenderWrapper: mathWrapper,
        mathRenderCheckbox: mathCheckbox
    });

    run_assert(mathResult === true, "initMath returns true when KaTeX is loaded");
    run_assert(mathCheckbox.checked === true, "initMath sets math checkbox checked to true");
    run_assert(mathWrapper.style.display === 'block', "mathWrapper remains visible when KaTeX is loaded");
    run_assert(window.PreviewManager.getMathSupport() === true, "getMathSupport returns true after initMath");

    // Test 4: initMath when KaTeX is unavailable
    const tempKatex = global.katex;
    delete global.katex;
    const mathWrapper2 = create_mock_element('math-wrapper-2');
    const mathCheckbox2 = create_mock_element('math-checkbox-2');

    const mathResultNoKatex = window.PreviewManager.initMath({
        mathRenderWrapper: mathWrapper2,
        mathRenderCheckbox: mathCheckbox2
    });

    run_assert(mathResultNoKatex === false, "initMath returns false when KaTeX is absent");
    run_assert(mathWrapper2.style.display === 'none', "initMath hides mathWrapper when KaTeX is absent");
    global.katex = tempKatex; // Restore KaTeX

    // Test 5: initDiagrams execution & state update
    const diagramWrapper = create_mock_element('diagram-wrapper');
    const diagramCheckbox = create_mock_element('diagram-checkbox');

    const diagramResult = window.PreviewManager.initDiagrams({
        diagramRenderWrapper: diagramWrapper,
        diagramRenderCheckbox: diagramCheckbox
    });

    run_assert(diagramResult === true, "initDiagrams returns true when Mermaid is loaded");
    run_assert(diagramCheckbox.checked === true, "initDiagrams sets diagram checkbox checked to true");
    run_assert(mermaidInitialized === true, "initDiagrams initializes mermaid config");
    run_assert(window.PreviewManager.getDiagramSupport() === true, "getDiagramSupport returns true after initDiagrams");

    // Test 6: State Toggling
    window.PreviewManager.setMathSupport(false);
    run_assert(window.PreviewManager.getMathSupport() === false, "setMathSupport(false) updates math state");
    window.PreviewManager.setMathSupport(true);
    run_assert(window.PreviewManager.getMathSupport() === true, "setMathSupport(true) restores math state");

    window.PreviewManager.setDiagramSupport(false);
    run_assert(window.PreviewManager.getDiagramSupport() === false, "setDiagramSupport(false) updates diagram state");
    window.PreviewManager.setDiagramSupport(true);
    run_assert(window.PreviewManager.getDiagramSupport() === true, "setDiagramSupport(true) restores diagram state");

    // Test 7: Parameter Assertions Validation
    assertArgCalled = false;
    window.PreviewManager.initMath(null);
    run_assert(assertArgCalled === true, "initMath(null) triggers window.assert_arg");

    assertArgCalled = false;
    window.PreviewManager.initDiagrams(null);
    run_assert(assertArgCalled === true, "initDiagrams(null) triggers window.assert_arg");

    assertArgCalled = false;
    window.PreviewManager.renderDiagrams(null);
    run_assert(assertArgCalled === true, "renderDiagrams(null) triggers window.assert_arg");

    // Test 8: KaTeX & Mermaid code block renderer check
    if (customRenderer && typeof customRenderer.code === 'function') {
        const mathBlockHtml = customRenderer.code('x = y + 1', 'math');
        run_assert(mathBlockHtml.includes('katex-block'), "custom renderer code block handles 'math' language");

        const mermaidBlockHtml = customRenderer.code('graph TD; A-->B;', 'mermaid');
        run_assert(mermaidBlockHtml.includes('class="mermaid"'), "custom renderer code block handles 'mermaid' language");
    } else {
        run_assert(false, "customRenderer.code is not registered");
    }

    // Test 9: Extensions registration check
    const hasInlineMath = registeredExtensions.some(ext => ext.name === 'inlineMath');
    const hasBlockMath = registeredExtensions.some(ext => ext.name === 'blockMath');
    const hasBracketText = registeredExtensions.some(ext => ext.name === 'bracketText');

    run_assert(hasInlineMath, "marked extensions include inlineMath");
    run_assert(hasBlockMath, "marked extensions include blockMath");
    run_assert(hasBracketText, "marked extensions include bracketText");

    console.log('\n======================================================================');
    console.log(`📊 테스트 결과 요약: 총 ${passCount + failCount}개 항목 중 PASS: ${passCount}, FAIL: ${failCount}`);
    console.log('======================================================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

test_preview_math_diagram();
