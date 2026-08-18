/**
 * test_settings_man.js
 * SettingsManager 및 DEFAULT_WELCOME_TEXT 캡슐화 단위 테스트 스크립트
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running SettingsManager Unit Test Suite...\n');

// 1. Mock Browser Environment
global.window = global;
global.document = {
    createElement: () => ({
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
        removeChild: () => {},
        click: () => {}
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    },
    getElementById: () => null
};
global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
};
global.Blob = class {};

// Load settings-man.js
const settingsCode = fs.readFileSync(path.join(__dirname, '../settings-man.js'), 'utf8');
eval(settingsCode);

// Tests
assert.strictEqual(typeof window.SettingsManager, 'object', 'SettingsManager must exist on window');
console.log('✅ PASS: SettingsManager exists on window');

assert.strictEqual(typeof window.SettingsManager.getDefaultWelcomeText, 'function', 'getDefaultWelcomeText function must exist');
console.log('✅ PASS: SettingsManager.getDefaultWelcomeText is a function');

assert.strictEqual(typeof window.SettingsManager.get_default_welcome_text, 'function', 'get_default_welcome_text pure sub-function must exist');
console.log('✅ PASS: SettingsManager.get_default_welcome_text is a function');

const welcomeText = window.SettingsManager.getDefaultWelcomeText();
assert.ok(welcomeText.includes('마크다운 에디터에 오신 것을 환영합니다!'), 'Welcome text must contain header title');
assert.ok(welcomeText.includes('코드 강조'), 'Welcome text must contain syntax highlighting section');
console.log('✅ PASS: getDefaultWelcomeText returns correct default welcome markdown content');

assert.strictEqual(typeof window.SettingsManager.generate_reg_content, 'function', 'generate_reg_content function must exist');
console.log('✅ PASS: generate_reg_content is a function');

const chromeReg = window.SettingsManager.generate_reg_content('chrome');
assert.ok(chromeReg.includes('ChromeHTML'), 'Chrome reg content must contain ChromeHTML');
console.log('✅ PASS: generate_reg_content generates valid chrome reg text');

assert.strictEqual(typeof window.SettingsManager.DEFAULT_SETTINGS_TEMPLATE, 'string', 'DEFAULT_SETTINGS_TEMPLATE must be a string');
assert.ok(window.SettingsManager.DEFAULT_SETTINGS_TEMPLATE.includes('Windows 탐색기 연결 설정'), 'DEFAULT_SETTINGS_TEMPLATE must contain settings section header');
console.log('✅ PASS: DEFAULT_SETTINGS_TEMPLATE is exported and contains valid modal HTML content');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | All SettingsManager tests passed! 100% PASS');
console.log('========================================\n');
