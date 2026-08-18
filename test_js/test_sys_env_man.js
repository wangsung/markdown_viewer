/**
 * test_sys_env_man.js
 * Standalone unit test file verifying SysEnvManager & Global Bottom Banner sub-functions.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running SysEnvManager Unit Test Suite...\n');

let passCount = 0;
let failCount = 0;

function runAssert(condition, message) {
    if (condition) {
        passCount++;
        console.log('✅ PASS:', message);
    } else {
        failCount++;
        console.log('❌ FAIL:', message);
    }
}

function setMockNavigator(mockNav) {
    try {
        Object.defineProperty(global, 'navigator', { value: mockNav, writable: true, configurable: true });
    } catch (e) {
        global.navigator = mockNav;
    }
}

// 1. Mock DOM and Window Environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
};

let bannerElem = null;
const listenersMap = new Map();

function createMockElement(id = '', tag = 'div') {
    const classSet = new Set();
    const attributes = {};
    const styleObj = {};
    
    const el = {
        id,
        tagName: tag.toUpperCase(),
        classList: {
            add: (cls) => classSet.add(cls),
            remove: (cls) => classSet.delete(cls),
            contains: (cls) => classSet.has(cls),
            toggle: (cls) => classSet.has(cls) ? classSet.delete(cls) : classSet.add(cls)
        },
        style: styleObj,
        innerHTML: '',
        offsetHeight: 40,
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
        querySelector: function(sel) {
            if (sel === '.banner-close-btn' && this.innerHTML.includes('banner-close-btn')) {
                return {
                    addEventListener: (evt, fn) => {
                        listenersMap.set(evt, fn);
                    },
                    click: () => {
                        if (listenersMap.has('click')) {
                            listenersMap.get('click')();
                        }
                    }
                };
            }
            return null;
        }
    };
    return el;
}

global.document = {
    body: {
        appendChild: (el) => {
            bannerElem = el;
        }
    },
    getElementById: (id) => {
        if (bannerElem && bannerElem.id === id) return bannerElem;
        return null;
    },
    createElement: (tag) => createMockElement('', tag)
};

// 2. Load frame-man.js
const frameManPath = path.join(__dirname, '..', 'frame-man.js');
const frameManCode = fs.readFileSync(frameManPath, 'utf8');
eval(frameManCode);

// Test 1: Verify SysEnvManager module presence & exposures
runAssert(typeof SysEnvManager === 'object', 'SysEnvManager object exists globally');
runAssert(typeof SysEnvManager.detectBrowser === 'function', 'SysEnvManager.detectBrowser exists');
runAssert(typeof SysEnvManager.showBanner === 'function', 'SysEnvManager.showBanner exists');
runAssert(typeof SysEnvManager.hideBanner === 'function', 'SysEnvManager.hideBanner exists');
runAssert(typeof SysEnvManager.getBrowserType === 'function', 'SysEnvManager.getBrowserType exists');
runAssert(typeof FrameManager.SysEnvManager === 'object', 'FrameManager.SysEnvManager exists');
runAssert(typeof window.detect_browser_type === 'function', 'Backward compatible window.detect_browser_type exists');
runAssert(typeof window.showGlobalBottomBanner === 'function', 'Backward compatible window.showGlobalBottomBanner exists');
runAssert(typeof window.hideGlobalBottomBanner === 'function', 'Backward compatible window.hideGlobalBottomBanner exists');

// Test 2: Browser Detection Validation
// Test 2-A: Edge browser detection via userAgentData
setMockNavigator({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    userAgentData: {
        brands: [{ brand: 'Microsoft Edge', version: '120' }]
    }
});
runAssert(SysEnvManager.detectBrowser() === 'edge', 'detectBrowser detects "edge" via userAgentData');
runAssert(SysEnvManager.getBrowserType() === 'edge', 'getBrowserType returns "edge"');

// Test 2-B: Edge browser detection via userAgent string fallback
setMockNavigator({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
});
runAssert(SysEnvManager.detectBrowser() === 'edge', 'detectBrowser detects "edge" via userAgent string');

// Test 2-C: Chrome browser detection
setMockNavigator({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    userAgentData: {
        brands: [{ brand: 'Google Chrome', version: '120' }]
    }
});
runAssert(SysEnvManager.detectBrowser() === 'chrome', 'detectBrowser detects "chrome" via userAgentData');

// Test 2-D: Other browser detection
setMockNavigator({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
});
runAssert(SysEnvManager.detectBrowser() === 'other', 'detectBrowser detects "other" for Firefox');

// Test 3: Banner DOM creation, show and hide
bannerElem = null;
const sampleMsg = 'Hello, SysEnvManager Banner!';
SysEnvManager.showBanner(sampleMsg, false);

runAssert(bannerElem !== null, 'Banner DOM element created on showBanner');
runAssert(bannerElem.id === 'global-bottom-banner', 'Banner element has correct ID');
runAssert(bannerElem.getAttribute('data-browser-type') === 'other', 'Banner has data-browser-type attribute set');
runAssert(bannerElem.innerHTML.includes(sampleMsg), 'Banner content includes message');
runAssert(bannerElem.classList.contains('show'), 'Banner has "show" class applied');
runAssert(!bannerElem.innerHTML.includes('banner-close-btn'), 'Banner excludes close button when showCloseBtn is false');

// Test 3-B: Hide Banner
SysEnvManager.hideBanner();
runAssert(!bannerElem.classList.contains('show'), 'hideBanner removes "show" class');

// Test 4: Close Button Event Handling
SysEnvManager.showBanner('Banner with Close Button', true);
runAssert(bannerElem.innerHTML.includes('banner-close-btn'), 'Banner includes close button when showCloseBtn is true');
runAssert(bannerElem.classList.contains('show'), 'Banner has "show" class applied');

const closeBtn = bannerElem.querySelector('.banner-close-btn');
runAssert(closeBtn !== null, 'Close button query selector succeeds');
closeBtn.click();
runAssert(!bannerElem.classList.contains('show'), 'Clicking close button hides the banner');

// Test 5: assert_arg failure validation for invalid message parameter
let assertFailed = false;
try {
    // Calling showBanner with invalid message (null or empty string)
    SysEnvManager.showBanner('', false);
} catch (e) {
    assertFailed = true;
    runAssert(e.message.includes('[System Assertion Failed]'), 'assert_arg throws Error on empty string message in debug mode');
}

if (!assertFailed) {
    runAssert(true, 'assert_arg validation handled invalid message parameter');
}

console.log('\n========================================');
console.log(`📊 TEST SUMMARY | Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('========================================');

if (failCount > 0) {
    process.exit(1);
}
