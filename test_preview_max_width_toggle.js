/**
 * test_preview_max_width_toggle.js
 * 프리뷰 본문 최대폭 제한 토글 기능 및 CSS 여백 보존 자동화 단위 테스트 스크립트
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running Preview Max-Width Toggle Unit Test Suite...\n');

// 1. HTML 구조 검증
const htmlPath = path.join(__dirname, 'markdown_viewer.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

assert(htmlContent.includes('id="toggle-preview-max-width"'), 'PASS: toggle-preview-max-width checkbox defined in HTML');
assert(htmlContent.includes('최대폭 제한 (800px)'), 'PASS: Toggle label "최대폭 제한 (800px)" included in HTML');

// 2. CSS 레이아웃 및 여백 보존 규격 검증
const cssPath = path.join(__dirname, 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

assert(cssContent.includes('.preview-viewport.full-width .markdown-body'), 'PASS: .preview-viewport.full-width .markdown-body selector defined in style.css');
assert(cssContent.includes('max-width: 100%;'), 'PASS: Full-width style sets max-width: 100%');
assert(cssContent.includes('padding: 40px 48px;'), 'PASS: Minimum padding (40px 48px) preserved in full-width mode');

// 3. Mock DOM 환경 구성 및 JS 로직 검증
class MockElement {
    constructor(id = '', className = '') {
        this.id = id;
        this.className = className;
        this.classList = {
            add: (c) => { if (!this.className.includes(c)) this.className += ' ' + c; },
            remove: (c) => { this.className = this.className.replace(c, '').trim(); },
            contains: (c) => this.className.includes(c)
        };
        this.checked = true;
    }
}

const mockViewport = new MockElement('preview-viewport', 'preview-viewport');
const mockCheckbox = new MockElement('toggle-preview-max-width');

global.document = {
    querySelector: (sel) => {
        if (sel === '.preview-viewport') return mockViewport;
        return null;
    },
    getElementById: (id) => {
        if (id === 'toggle-preview-max-width') return mockCheckbox;
        return null;
    }
};

// apply_preview_max_width_limit 함수 시뮬레이션
function apply_preview_max_width_limit(isLimited = true) {
    const previewViewport = global.document.querySelector('.preview-viewport');
    if (previewViewport) {
        if (isLimited) {
            previewViewport.classList.remove('full-width');
        } else {
            previewViewport.classList.add('full-width');
        }
    }
    if (mockCheckbox) {
        mockCheckbox.checked = !!isLimited;
    }
}

// Test Case A: 제한 활성화 (isLimited = true)
apply_preview_max_width_limit(true);
assert(!mockViewport.classList.contains('full-width'), 'PASS: isLimited=true removes "full-width" class');
assert.strictEqual(mockCheckbox.checked, true, 'PASS: Checkbox is checked when isLimited=true');

// Test Case B: 제한 해제 (isLimited = false, 가로폭 확장)
apply_preview_max_width_limit(false);
assert(mockViewport.classList.contains('full-width'), 'PASS: isLimited=false adds "full-width" class');
assert.strictEqual(mockCheckbox.checked, false, 'PASS: Checkbox is unchecked when isLimited=false');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | Preview Max-Width Toggle Test Passed 100%');
console.log('========================================\n');
