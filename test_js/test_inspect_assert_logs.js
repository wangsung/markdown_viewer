const fs = require('fs');
const path = require('path');

console.log('🔍 Inspecting System assert_arg Failure Logs...\n');

// 1. frame-man.js / app.js / style-editor.js / export-man.js 내의 assert_arg 정의 검색
const frameManPath = path.join(__dirname, '../frame-man.js');
const frameManContent = fs.readFileSync(frameManPath, 'utf8');

// JSDOM / Node 실행 시 캡처할 수 있도록 환경 모의
const logs = [];
const mockWindow = {
    assert_arg: (condition, message, context = {}) => {
        if (!condition) {
            logs.push({
                timestamp: new Date().toISOString(),
                message: message,
                context: context
            });
        }
        return !!condition;
    }
};

// test_frame_man.js 또는 test_sys_env_man.js 구동 시 캡처된 assert_arg 실패 구문 실행
const { execSync } = require('child_process');

try {
    const output = execSync('node test_js/test_frame_man.js', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    const lines = output.split('\n').filter(l => l.includes('System Assertion Failed') || l.includes('System Warning'));
    
    console.log('📋 Captured System assert_arg Log Entries:');
    lines.forEach((line, idx) => {
        console.log(`[Entry ${idx + 1}] ${line.trim()}`);
    });
} catch (e) {
    console.log('Error executing test runner:', e.message);
}
