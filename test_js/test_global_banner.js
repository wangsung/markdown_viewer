/**
 * test_global_banner.js
 * Verification unit test suite for Global Bottom Banner functionality.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running Global Bottom Banner Unit Test Suite...\n');

// 1. Verify CSS definition in style.css
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
assert(cssContent.includes('#global-bottom-banner'), 'PASS: #global-bottom-banner defined in style.css');
assert(cssContent.includes('position: fixed'), 'PASS: Banner position is fixed at bottom');
assert(cssContent.includes('bottom: 0'), 'PASS: Banner bottom is 0');
assert(cssContent.includes('font-size: 14px'), 'PASS: Banner font-size is 14px');
assert(cssContent.includes('data-browser-type="chrome"'), 'PASS: Chrome center alignment rule defined in style.css');
assert(cssContent.includes('0.1s'), 'PASS: Banner close animation transition speed is 0.1s (instant response)');
assert(cssContent.includes('.banner-close-btn'), 'PASS: .banner-close-btn style defined in style.css');

// 2. Mock DOM Environment for JS Functions
global.window = global;
global.assert_arg = (cond, msg) => cond;
const mockNav = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    userAgentData: {
        brands: [
            { brand: 'Google Chrome', version: '120' },
            { brand: 'Chromium', version: '120' }
        ]
    }
};
try {
    Object.defineProperty(global, 'navigator', { value: mockNav, writable: true, configurable: true });
} catch (e) {
    global.navigator = mockNav;
}
const createdElements = [];
let bannerElem = null;

global.document = {
    body: {
        appendChild: (el) => {
            bannerElem = el;
            createdElements.push(el);
        }
    },
    getElementById: (id) => {
        if (bannerElem && bannerElem.id === id) return bannerElem;
        return null;
    },
    createElement: (tag) => {
        const attributes = {};
        const el = {
            tagName: tag.toUpperCase(),
            id: '',
            style: {},
            classList: {
                classes: new Set(),
                add: function(c) { this.classes.add(c); },
                remove: function(c) { this.classes.delete(c); },
                contains: function(c) { return this.classes.has(c); }
            },
            innerHTML: '',
            setAttribute: (k, v) => { attributes[k] = String(v); },
            getAttribute: (k) => attributes[k] || null,
            querySelector: function(sel) {
                if (sel === '.banner-close-btn' && this.innerHTML.includes('banner-close-btn')) {
                    return {
                        addEventListener: (evt, handler) => { this.closeHandler = handler; }
                    };
                }
                return null;
            }
        };
        return el;
    }
};

// 3. Load module from frame-man.js
const frameManPath = path.join(__dirname, '..', 'frame-man.js');
const frameManCode = fs.readFileSync(frameManPath, 'utf8');
eval(frameManCode);

assert(typeof SysEnvManager === 'object', 'PASS: SysEnvManager defined in frame-man.js');
assert(typeof detect_browser_type === 'function', 'PASS: detect_browser_type function bound globally');
assert(typeof showGlobalBottomBanner === 'function', 'PASS: showGlobalBottomBanner function bound globally');
assert(typeof hideGlobalBottomBanner === 'function', 'PASS: hideGlobalBottomBanner function bound globally');

// Test Case A: Test detect_browser_type
const detectedType = detect_browser_type();
assert(detectedType === 'chrome', 'PASS: detect_browser_type returns "chrome" for Chrome userAgent');

// Test Case B: Call showGlobalBottomBanner without close button (PDF Print mode)
const pdfGuideMsg = '💡 <span class="banner-badge">인쇄 안내</span> - (프린터) [대상]: <strong class="banner-highlight">"PDF로 저장"</strong>  |  [여백]: <strong class="banner-highlight">"맞춤"</strong> 권장';
showGlobalBottomBanner(pdfGuideMsg, false);

assert(bannerElem !== null, 'PASS: Banner element dynamically created');
assert(bannerElem.id === 'global-bottom-banner', 'PASS: Banner ID matches global-bottom-banner');
assert(bannerElem.getAttribute('data-browser-type') === 'chrome', 'PASS: Banner receives data-browser-type="chrome" attribute');
assert(bannerElem.innerHTML.includes(pdfGuideMsg), 'PASS: Banner innerHTML contains PDF guide message');
assert(!bannerElem.innerHTML.includes('banner-close-btn'), 'PASS: Banner excludes close button when showCloseBtn is false');
assert(bannerElem.classList.contains('show'), 'PASS: Banner has "show" class applied');

// Test Case C: Hide banner
hideGlobalBottomBanner();
assert(!bannerElem.classList.contains('show'), 'PASS: hideGlobalBottomBanner removes "show" class');

// Test Case D: Call showGlobalBottomBanner with close button
showGlobalBottomBanner('General Announcement', true);
assert(bannerElem.innerHTML.includes('banner-close-btn'), 'PASS: Banner includes close button when showCloseBtn is true');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | Global Bottom Banner Test Passed 100%');
console.log('========================================');
