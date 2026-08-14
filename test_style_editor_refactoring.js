/**
 * test_style_editor_refactoring.js
 * 
 * style-editor.js 리팩토링 전 사전 검증을 위한 독립 테스트 스크립트
 * 
 * 검증 항목:
 * 1. StyleEditor 모듈 및 공개 API 메서드 존재 유효성
 * 2. StyleEditor.getDefaultPresets() 프리셋 데이터 스키마 및 주요 키 항목(h1~h6, link, strong, em, codeblock, blockquote, line) 유효성
 * 3. Mock DOM 환경에서 StyleEditor.init() 에러 없는 실행 검증
 * 4. Mock DOM 환경에서 StyleEditor.collectCurrentInputs() 구조 및 스타일 수집 유효성 검증
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// -----------------------------------------------------------------------------
// 1. 브라우저 런타임 Mock DOM 환경 구성
// -----------------------------------------------------------------------------
global.window = global;

const mockElementsMap = new Map();

function create_mock_element(id = '', tag = 'div') {
    if (id && mockElementsMap.has(id)) {
        return mockElementsMap.get(id);
    }

    const classSet = new Set();
    const attributes = {};
    const styleObj = {
        display: 'block',
        transform: '',
        cursor: '',
        userSelect: '',
        setProperty: function(k, v) { this[k] = v; }
    };
    const listeners = {};

    const element = {
        id,
        tagName: tag.toUpperCase(),
        value: '',
        checked: false,
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls),
            toggle: (cls) => classSet.has(cls) ? classSet.delete(cls) : classSet.add(cls)
        },
        style: styleObj,
        textContent: '',
        innerHTML: '',
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
        contains: (target) => false,
        closest: (sel) => null,
        querySelector: (sel) => create_mock_element(`qs_${Math.random()}`),
        querySelectorAll: (sel) => [],
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
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

    if (id) {
        mockElementsMap.set(id, element);
    }
    return element;
}

global.document = {
    documentElement: create_mock_element('html', 'html'),
    body: create_mock_element('body', 'body'),
    getElementById: (id) => create_mock_element(id),
    querySelector: (sel) => {
        if (sel === 'input[name="modal-table-row-bg-mode"]:checked') {
            const el = create_mock_element('modal-table-row-bg-mode-checked');
            el.value = 'custom';
            return el;
        }
        if (sel === 'input[name="modal-table-stripe-mode"]:checked') {
            const el = create_mock_element('modal-table-stripe-mode-checked');
            el.value = 'custom';
            return el;
        }
        return create_mock_element(`qs_${sel}`);
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => create_mock_element('', tag),
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
};

// -----------------------------------------------------------------------------
// 2. Target 모듈 (style-editor.js) 로드
// -----------------------------------------------------------------------------
const styleEditorPath = path.join(__dirname, 'style-editor.js');
const styleEditorCode = fs.readFileSync(styleEditorPath, 'utf8');
eval(styleEditorCode);

// -----------------------------------------------------------------------------
// 3. 테스트 상태 카운터 및 단증 서브 함수
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 4. 테스트 케이스 정의
// -----------------------------------------------------------------------------

function test_module_structure() {
    console.log('\n--- [Test Suite 1] StyleEditor 모듈 및 메서드 노출 검증 ---');
    run_assert(typeof window.StyleEditor === 'object', 'window.StyleEditor 객체가 존재함');
    run_assert(typeof window.StyleEditor.getDefaultPresets === 'function', 'getDefaultPresets 메서드가 존재함');
    run_assert(typeof window.StyleEditor.init === 'function', 'init 메서드가 존재함');
    run_assert(typeof window.StyleEditor.collectCurrentInputs === 'function', 'collectCurrentInputs 메서드가 존재함');
    run_assert(typeof window.StyleEditor.openModal === 'function', 'openModal 메서드가 존재함');
    run_assert(typeof window.StyleEditor.closeModal === 'function', 'closeModal 메서드가 존재함');
    run_assert(typeof window.StyleEditor.resetModalPosition === 'function', 'resetModalPosition 메서드가 존재함');
}

function test_default_presets_schema() {
    console.log('\n--- [Test Suite 2] getDefaultPresets() 프리셋 데이터 스키마 검증 ---');
    const presets = window.StyleEditor.getDefaultPresets();
    
    run_assert(Array.isArray(presets), 'getDefaultPresets() 반환값은 배열이어야 함');
    run_assert(presets.length >= 5, `기본 프리셋 개수가 5개 이상이어야 함 (현재: ${presets.length}개)`);

    const requiredKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'link', 'strong', 'em', 'codeblock', 'blockquote', 'line'];

    let allPresetsValid = true;
    presets.forEach((preset, idx) => {
        if (!preset.id || typeof preset.id !== 'string') {
            allPresetsValid = false;
            console.log(`  └ Preset index ${idx}: id 누락 또는 유효하지 않음`);
        }
        if (!preset.name || typeof preset.name !== 'string') {
            allPresetsValid = false;
            console.log(`  └ Preset index ${idx}: name 누락 또는 유효하지 않음`);
        }
        if (!preset.styles || typeof preset.styles !== 'object') {
            allPresetsValid = false;
            console.log(`  └ Preset index ${idx}: styles 객체 누락`);
        } else {
            requiredKeys.forEach(key => {
                if (!preset.styles[key]) {
                    allPresetsValid = false;
                    console.log(`  └ Preset '${preset.id}': styles.${key} 항목 누락`);
                }
            });
        }
    });

    run_assert(allPresetsValid, '모든 기본 프리셋이 id, name, styles 및 필수 주요 키(h1~h6, link, strong, em, codeblock, blockquote, line)를 완전하게 포함함');

    // 불변성(Immutability / Deep Clone) 검증
    presets[0].name = 'MUTATED_NAME';
    const freshPresets = window.StyleEditor.getDefaultPresets();
    run_assert(freshPresets[0].name !== 'MUTATED_NAME', 'getDefaultPresets()는 원본 데이터의 오염 방지를 위한 Deep Copy를 반환함');
}

function test_style_editor_init() {
    console.log('\n--- [Test Suite 3] StyleEditor.init() 실행 안전성 검증 ---');
    
    let initSuccess = false;
    try {
        const mockPresetSelect = create_mock_element('modal-heading-preset-select', 'select');
        mockPresetSelect.value = 'github_classic';

        const mockContainer = create_mock_element('heading-style-controls', 'div');

        window.StyleEditor.init({
            elements: {
                headingStyleControls: mockContainer,
                modalHeadingSelect: mockPresetSelect
            },
            getPresetsData: () => window.StyleEditor.getDefaultPresets(),
            savePresetsData: (data) => {},
            onSave: () => {},
            onLivePreview: () => {}
        });
        initSuccess = true;
    } catch (err) {
        console.error('init execution error:', err);
        initSuccess = false;
    }

    run_assert(initSuccess, 'StyleEditor.init()이 예외 던짐 없이 성공적으로 실행됨');
}

function test_collect_current_inputs() {
    console.log('\n--- [Test Suite 4] StyleEditor.collectCurrentInputs() 스타일 수집 검증 ---');

    // Mock DOM 폼 필드에 테스트용 커스텀 데이터 세팅
    document.getElementById('modal-h1-color-light').value = '#112233';
    document.getElementById('modal-h1-color-dark').value = '#445566';
    document.getElementById('modal-h1-size').value = '2.5em';
    document.getElementById('modal-h1-border').value = '2px solid #112233';

    document.getElementById('modal-link-color-light').value = '#0055ff';
    document.getElementById('modal-link-color-dark').value = '#66aaff';
    document.getElementById('modal-link-decoration').value = 'underline';

    document.getElementById('modal-strong-color-light').value = '#222222';
    document.getElementById('modal-strong-color-dark').value = '#eeeeee';

    document.getElementById('modal-em-color-light').value = '#333333';
    document.getElementById('modal-em-color-dark').value = '#dddddd';

    document.getElementById('modal-codeblock-color-light').value = '#111111';
    document.getElementById('modal-codeblock-color-dark').value = '#ffffff';
    document.getElementById('modal-codeblock-bg-light').value = '#f0f0f0';
    document.getElementById('modal-codeblock-bg-dark').value = '#202020';

    document.getElementById('modal-blockquote-color-light').value = '#555555';
    document.getElementById('modal-blockquote-color-dark').value = '#aaaaaa';
    document.getElementById('modal-blockquote-border-light').value = '#0055ff';
    document.getElementById('modal-blockquote-border-dark').value = '#66aaff';

    document.getElementById('modal-line-color-light').value = '#cccccc';
    document.getElementById('modal-line-color-dark').value = '#444444';
    document.getElementById('modal-line-border').value = '1px solid #cccccc';

    // Table 관련 항목 세팅
    document.getElementById('modal-table-header-color-light').value = '#123456';
    document.getElementById('modal-table-header-color-dark').value = '#654321';
    document.getElementById('modal-table-header-bg-light').value = '#eef2ff';
    document.getElementById('modal-table-header-bg-dark').value = '#1e1b4b';

    let collectedStyles = null;
    let collectSuccess = false;
    try {
        collectedStyles = window.StyleEditor.collectCurrentInputs();
        collectSuccess = true;
    } catch (err) {
        console.error('collectCurrentInputs error:', err);
        collectSuccess = false;
    }

    run_assert(collectSuccess && collectedStyles !== null, 'collectCurrentInputs()가 에러 없이 스타일 객체를 리턴함');

    if (collectedStyles) {
        run_assert(collectedStyles.h1 && collectedStyles.h1.colorLight === '#112233', 'h1.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.link && collectedStyles.link.colorLight === '#0055ff', 'link.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.strong && collectedStyles.strong.colorLight === '#222222', 'strong.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.em && collectedStyles.em.colorLight === '#333333', 'em.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.codeblock && collectedStyles.codeblock.bgLight === '#f0f0f0', 'codeblock.bgLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.blockquote && collectedStyles.blockquote.colorLight === '#555555', 'blockquote.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.line && collectedStyles.line.colorLight === '#cccccc', 'line.colorLight 수집 데이터 정확성 검증');
        run_assert(collectedStyles.table && collectedStyles.table.headerColorLight === '#123456', 'table.headerColorLight 수집 데이터 정확성 검증');
    }
}

// -----------------------------------------------------------------------------
// 5. Light --- Dark 테마 토글 스위치 검증
// -----------------------------------------------------------------------------
function test_theme_toggle_switch() {
    console.log('\n--- [Test Suite 5] Light --- Dark 테마 토글 스위치 검증 ---');

    run_assert(typeof window.StyleEditor.updateThemeToggleUI === 'function', 'updateThemeToggleUI 메서드가 존재함');

    const btnLight = document.getElementById('btn-style-editor-theme-light');
    const btnDark = document.getElementById('btn-style-editor-theme-dark');

    // 라이트 모드 동기화 검증
    window.StyleEditor.updateThemeToggleUI('light');
    run_assert(btnLight.classList.contains('active'), 'updateThemeToggleUI("light") 시 btnLight가 active 상태임');
    run_assert(!btnDark.classList.contains('active'), 'updateThemeToggleUI("light") 시 btnDark가 active 해제됨');

    // 다크 모드 동기화 검증
    window.StyleEditor.updateThemeToggleUI('dark');
    run_assert(btnDark.classList.contains('active'), 'updateThemeToggleUI("dark") 시 btnDark가 active 상태임');
    run_assert(!btnLight.classList.contains('active'), 'updateThemeToggleUI("dark") 시 btnLight가 active 해제됨');

    // 이벤트 리스너 콜백 동작 검증
    let lastThemeChanged = null;
    window.StyleEditor.init({
        onThemeChange: (theme) => {
            lastThemeChanged = theme;
        }
    });

    btnLight.trigger('click');
    run_assert(lastThemeChanged === 'light', 'btnLight 클릭 시 onThemeChange("light") 콜백이 정상 수신됨');

    btnDark.trigger('click');
    run_assert(lastThemeChanged === 'dark', 'btnDark 클릭 시 onThemeChange("dark") 콜백이 정상 수신됨');
}

// -----------------------------------------------------------------------------
// 6. 메인 실행 함수
// -----------------------------------------------------------------------------
function run_all_tests() {
    console.log('============== 🧪 style-editor.js 사전 검증 테스트 시작 ==============');
    
    test_module_structure();
    test_default_presets_schema();
    test_style_editor_init();
    test_collect_current_inputs();
    test_theme_toggle_switch();

    console.log('\n======================================================================');
    console.log(`📊 테스트 결과 요약: 총 ${passCount + failCount}개 항목 중 PASS: ${passCount}, FAIL: ${failCount}`);
    console.log('======================================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

run_all_tests();
