/**
 * test_editor_extra_keys.js
 * EditorManager.getExtraKeys / build_extra_keys_map 단축키 바인딩 및 콜백/단증(assert_arg) 검증 단위 테스트.
 * 실행 방법: node test_js/test_editor_extra_keys.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
        replaceSelection: (replacement) => {
            if (selection) {
                text = text.replace(selection, replacement);
            } else {
                text += replacement;
            }
        },
        focus: () => {}
    };
}

// 2. editor-man.js 파일 로드 및 VM 샌드박스 설정
const editorManPath = path.join(__dirname, '..', 'editor-man.js');
let EditorManager = null;
let assertArgCalls = [];

const sandbox = {
    window: {
        assert_arg: (condition, message, context) => {
            assertArgCalls.push({ condition, message, context });
            if (!condition) {
                console.warn(`[Mock Assert Warning] ${message}`);
            }
            return condition;
        }
    },
    console: console
};

vm.createContext(sandbox);
const code = fs.readFileSync(editorManPath, 'utf8');
vm.runInContext(code, sandbox);
EditorManager = sandbox.window.EditorManager;

function runTestSuite() {
    console.log('🚀 Running Editor extraKeys Unit Test Suite...\n');

    assert(EditorManager !== null && typeof EditorManager === 'object', "EditorManager 모듈 로드 성공");
    assert(typeof EditorManager.getExtraKeys === 'function', "EditorManager.getExtraKeys API 존재");
    assert(typeof EditorManager.buildExtraKeysMap === 'function', "EditorManager.buildExtraKeysMap API 존재");
    assert(typeof EditorManager.build_extra_keys_map === 'function', "EditorManager.build_extra_keys_map 순수 함수 존재");

    // [Test Group 1]: extraKeys Map 구조 생성 검증
    let formatChangedArgs = [];
    let paragraphJoinedCalled = false;

    const extraKeys = EditorManager.getExtraKeys({
        onFormatChange: (type, cm) => {
            formatChangedArgs.push({ type, cm });
        },
        onParagraphJoin: (cm) => {
            paragraphJoinedCalled = true;
        }
    });

    assert(typeof extraKeys === 'object' && extraKeys !== null, "getExtraKeys 객체 반환");
    assert(typeof extraKeys["Tab"] === 'function', "Tab 단축키 핸들러 존재");
    assert(typeof extraKeys["Cmd-B"] === 'function', "Cmd-B 단축키 핸들러 존재");
    assert(typeof extraKeys["Ctrl-B"] === 'function', "Ctrl-B 단축키 핸들러 존재");
    assert(typeof extraKeys["Cmd-I"] === 'function', "Cmd-I 단축키 핸들러 존재");
    assert(typeof extraKeys["Ctrl-I"] === 'function', "Ctrl-I 단축키 핸들러 존재");
    assert(typeof extraKeys["Alt-Q"] === 'function', "Alt-Q 단축키 핸들러 존재");

    // [Test Group 2]: Tab 4칸 스페이스 들여쓰기 검증
    const cmTabMock = createMockCodeMirror("hello");
    extraKeys["Tab"](cmTabMock);
    assert(cmTabMock.getValue() === "hello    ", "Tab 실행 시 4칸 공백 주입");

    // [Test Group 3]: Cmd-B / Ctrl-B 굵게 서식 및 콜백 검증
    formatChangedArgs = [];
    const cmBoldMock1 = createMockCodeMirror("hello text", "text");
    extraKeys["Cmd-B"](cmBoldMock1);
    assert(cmBoldMock1.getValue().includes("**text**"), "Cmd-B 실행 시 **text** bold 서식 적용");
    assert(formatChangedArgs.length === 1 && formatChangedArgs[0].type === 'bold', "Cmd-B 실행 시 onFormatChange('bold') 콜백 호출");

    const cmBoldMock2 = createMockCodeMirror("sample text", "sample");
    extraKeys["Ctrl-B"](cmBoldMock2);
    assert(cmBoldMock2.getValue().includes("**sample**"), "Ctrl-B 실행 시 **sample** bold 서식 적용");
    assert(formatChangedArgs.length === 2 && formatChangedArgs[1].type === 'bold', "Ctrl-B 실행 시 onFormatChange('bold') 콜백 호출");

    // [Test Group 4]: Cmd-I / Ctrl-I 기울임 서식 및 콜백 검증
    formatChangedArgs = [];
    const cmItalicMock1 = createMockCodeMirror("hello text", "text");
    extraKeys["Cmd-I"](cmItalicMock1);
    assert(cmItalicMock1.getValue().includes("*text*"), "Cmd-I 실행 시 *text* italic 서식 적용");
    assert(formatChangedArgs.length === 1 && formatChangedArgs[0].type === 'italic', "Cmd-I 실행 시 onFormatChange('italic') 콜백 호출");

    const cmItalicMock2 = createMockCodeMirror("sample text", "sample");
    extraKeys["Ctrl-I"](cmItalicMock2);
    assert(cmItalicMock2.getValue().includes("*sample*"), "Ctrl-I 실행 시 *sample* italic 서식 적용");
    assert(formatChangedArgs.length === 2 && formatChangedArgs[1].type === 'italic', "Ctrl-I 실행 시 onFormatChange('italic') 콜백 호출");

    // [Test Group 5]: Alt-Q 문단 결합 및 콜백 검증
    paragraphJoinedCalled = false;
    const cmJoinMock = createMockCodeMirror("이것은 매우 긴 첫 번째 문장입니다. 문단 결합 테스트를 위해 작성되었습니다.\n이것은 뒤이어 나오는 두 번째 문장입니다.");
    extraKeys["Alt-Q"](cmJoinMock);
    assert(cmJoinMock.getValue() === "이것은 매우 긴 첫 번째 문장입니다. 문단 결합 테스트를 위해 작성되었습니다. 이것은 뒤이어 나오는 두 번째 문장입니다.", "Alt-Q 실행 시 문단 개행 결합 적용");
    assert(paragraphJoinedCalled === true, "Alt-Q 실행 시 onParagraphJoin 콜백 호출");

    // [Test Group 6]: EditorManager.initShortcuts (attach_extra_keys) 단축키 자동 바인딩 검증
    const cmOptionMock = createMockCodeMirror("hello");
    let setOptionMap = null;
    cmOptionMock.setOption = function(name, val) {
        if (name === 'extraKeys') setOptionMap = val;
    };
    const attachResult = EditorManager.initShortcuts(cmOptionMock);
    assert(attachResult === true, "EditorManager.initShortcuts returns true on valid cmInstance");
    assert(setOptionMap !== null && typeof setOptionMap['Tab'] === 'function', "initShortcuts binds extraKeys option to CodeMirror via setOption");

    // [Test Group 7]: assert_arg 유효성 단증 검증
    assertArgCalls = [];
    EditorManager.getExtraKeys("invalid_callbacks");
    assert(assertArgCalls.some(c => c.message.includes('callbacks parameter must be a valid object')), "invalid callbacks 전달 시 assert_arg 경고 감지");

    assertArgCalls = [];
    extraKeys["Tab"](null);
    assert(assertArgCalls.some(c => c.message.includes('cmInstance must be a valid CodeMirror instance')), "Tab 핸들러에 null cmInstance 전달 시 assert_arg 경고 감지");

    assertArgCalls = [];
    extraKeys["Cmd-B"](null);
    assert(assertArgCalls.some(c => c.message.includes('cmInstance must be a valid CodeMirror instance')), "Cmd-B 핸들러에 null cmInstance 전달 시 assert_arg 경고 감지");

    assertArgCalls = [];
    extraKeys["Alt-Q"](null);
    assert(assertArgCalls.some(c => c.message.includes('cmInstance must be a valid CodeMirror instance')), "Alt-Q 핸들러에 null cmInstance 전달 시 assert_arg 경고 감지");

    console.log('\n========================================');
    console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
