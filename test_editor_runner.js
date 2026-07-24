/**
 * test_editor_runner.js
 * EditorManager 및 Pure Sub-function (insertFormatting, joinParagraphs) 검증을 위한 파일 기반 단위 테스트 스크립트.
 * 실행 방법: node test_editor_runner.js
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        failCount++;
    }
}

// 1. Mock CodeMirror Instance 생성 헬퍼
function createMockCodeMirror(initialText = '', selectedText = '') {
    let text = initialText;
    let selection = selectedText;

    return {
        getValue: () => text,
        setValue: (newText) => { text = newText; },
        getSelection: () => selection,
        replaceSelection: (replacement, selectMode) => {
            if (selection) {
                text = text.replace(selection, replacement);
            } else {
                text += replacement;
            }
        },
        focus: () => {}
    };
}

// 2. editor-man.js 파일 로드 또는 app.js 순수 서브 함수 검증 샌드박스 설정
const editorManPath = path.join(__dirname, 'editor-man.js');
const appPath = path.join(__dirname, 'app.js');
let EditorManager = null;

if (fs.existsSync(editorManPath)) {
    const code = fs.readFileSync(editorManPath, 'utf8');
    const sandbox = { window: {}, console };
    const vm = require('vm');
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    EditorManager = sandbox.window.EditorManager;
} else if (fs.existsSync(appPath)) {
    // 2단계: app.js 내의 Pure Sub-function 테스트를 위해 최소 DOM 스텁과 함께 파싱
    const appCode = fs.readFileSync(appPath, 'utf8');
    const vm = require('vm');
    const mockDocument = {
        addEventListener: () => {},
        getElementById: () => ({ addEventListener: () => {}, setAttribute: () => {}, style: {} }),
        querySelector: () => null,
        querySelectorAll: () => [],
        documentElement: { setAttribute: () => {} }
    };
    const mockWindow = { addEventListener: () => {}, localStorage: { getItem: () => null, setItem: () => {} } };
    const mockCodeMirror = { fromTextArea: () => createMockCodeMirror() };

    const sandbox = {
        document: mockDocument,
        window: mockWindow,
        CodeMirror: mockCodeMirror,
        localStorage: mockWindow.localStorage,
        console: console,
        setTimeout: () => {}
    };

    vm.createContext(sandbox);
    try {
        vm.runInContext(appCode, sandbox);
    } catch (e) {
        // DOMContentLoaded 이외의 실행 부분 무시
    }

    // 샌드박스 내부의 순수 함수 매핑
    if (sandbox.window && sandbox.window.EditorManager) {
        EditorManager = sandbox.window.EditorManager;
    } else {
        EditorManager = sandbox.window.EditorManager || {};
    }
    
    // app.js 스코프 내부 build_toc 매핑 보장
    if (sandbox.window && sandbox.window.build_toc) {
        EditorManager.build_toc = sandbox.window.build_toc;
    }
}

async function runTestSuite() {
    console.log('🚀 Running Editor Functions Unit Test Suite...\n');

    // [Test Group 1]: join_paragraphs 텍스트 변환 테스트
    const joinFn = EditorManager ? EditorManager.join_paragraphs : null;
    
    if (joinFn) {
        // Test 1-1: 한글 일반 문장 결합
        const korInput = "이것은 첫 번째 문장입니다.\n이것은 같은 문단의 두 번째 문장입니다.";
        const korOutput = joinFn(korInput);
        assert(korOutput === "이것은 첫 번째 문장입니다. 이것은 같은 문단의 두 번째 문장입니다.", "join_paragraphs: 한글 일반 문장 1회 개행 결합");

        // Test 1-2: 영문 소문자 시작 문장 결합
        const engInput = "This is line one\nand this is line two.";
        const engOutput = joinFn(engInput);
        assert(engOutput === "This is line one and this is line two.", "join_paragraphs: 영문 소문자 이어진 문장 결합");

        // Test 1-3: 빈 줄(2회 개행) 문단 구분 보존
        const paragraphInput = "첫 번째 문단입니다.\n\n두 번째 문단입니다.";
        const paragraphOutput = joinFn(paragraphInput);
        assert(paragraphOutput === "첫 번째 문단입니다.\n\n두 번째 문단입니다.", "join_paragraphs: 빈 줄(2회 개행) 문단 구분 보존");

        // Test 1-4: 마크다운 헤더(#) 결합 금지
        const headerInput = "앞쪽 본문 텍스트입니다.\n# 제목 1";
        const headerOutput = joinFn(headerInput);
        assert(headerOutput === "앞쪽 본문 텍스트입니다.\n# 제목 1", "join_paragraphs: 마크다운 헤더(#) 이전 문장과 결합 방지");

        // Test 1-5: HTML <br> 태그 결합 금지
        const brInput = "강제 개행 태그가 있습니다.<br>\n다음 줄 텍스트입니다.";
        const brOutput = joinFn(brInput);
        assert(brOutput === "강제 개행 태그가 있습니다.<br>\n다음 줄 텍스트입니다.", "join_paragraphs: <br> 태그 직후 결합 방지");
    } else {
        assert(false, "EditorManager 또는 join_paragraphs 함수 추출 실패");
    }

    // [Test Group 2]: insert_formatting 서식 주입 테스트
    if (EditorManager && EditorManager.insert_formatting) {
        const cmMock = createMockCodeMirror("Hello World", "World");
        let callbackExecuted = false;

        EditorManager.insert_formatting(cmMock, 'bold', () => {
            callbackExecuted = true;
        });

        assert(cmMock.getValue().includes('**World**'), "insert_formatting: selection에 bold (**World**) 주입");
        assert(callbackExecuted === true, "insert_formatting: onComplete 콜백 정상 호출");
    } else {
        assert(false, "insert_formatting 서식 주입 함수 추출 실패");
    }

    // [Test Group 3]: apply_heading_preset 순수 스타일 바인딩 테스트
    if (EditorManager && EditorManager.apply_heading_preset) {
        const styleVars = {};
        const mockTargetEl = {
            style: {
                setProperty: (key, val) => { styleVars[key] = val; }
            }
        };

        const mockStyles = {
            h1: { colorDark: '#3b82f6', size: '2.2em', border: '2px solid #3b82f6' },
            link: { colorDark: '#38bdf8', decoration: 'underline' }
        };

        EditorManager.apply_heading_preset(mockTargetEl, mockStyles, 'dark');

        assert(styleVars['--h1-color'] === '#3b82f6', "apply_heading_preset: --h1-color CSS 변수 올바르게 주입");
        assert(styleVars['--h1-size'] === '2.2em', "apply_heading_preset: --h1-size CSS 변수 올바르게 주입");
        assert(styleVars['--link-color'] === '#38bdf8', "apply_heading_preset: --link-color CSS 변수 올바르게 주입");
    } else {
        assert(false, "apply_heading_preset 순수 서브 함수 추출 실패");
    }

    // [Test Group 4]: build_toc 헤더 파싱 테스트
    if (EditorManager && EditorManager.build_toc) {
        const mdText = "# Title 1\nSome paragraph.\n```javascript\n# Not a header\n```\n## Subtitle 2";
        const headings = EditorManager.build_toc(mdText);

        assert(headings.length === 2, "build_toc: 코드블록 제외 2개 헤더 추출 성공");
        assert(headings[0].text === "Title 1" && headings[0].level === 1, "build_toc: H1 (Title 1) 레벨 및 텍스트 매칭");
        assert(headings[1].text === "Subtitle 2" && headings[1].level === 2, "build_toc: H2 (Subtitle 2) 레벨 및 텍스트 매칭");
    }

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');
}

runTestSuite();
