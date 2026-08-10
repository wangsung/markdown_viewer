/**
 * test_global_banner.js
 * Verification unit test suite for Global Bottom Banner functionality.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🚀 Running Global Bottom Banner Unit Test Suite...\n');

// 1. Verify CSS definition in style.css
const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
assert(cssContent.includes('#global-bottom-banner'), 'PASS: #global-bottom-banner defined in style.css');
assert(cssContent.includes('position: fixed'), 'PASS: Banner position is fixed at bottom');
assert(cssContent.includes('bottom: 0'), 'PASS: Banner bottom is 0');
assert(cssContent.includes('padding: 6px 16px'), 'PASS: Banner padding is slim (6px 16px)');
assert(cssContent.includes('font-size: 14px'), 'PASS: Banner font-size is 14px');
assert(cssContent.includes('line-height: 1.0'), 'PASS: Banner line-height is 1.0');
assert(cssContent.includes('text-align: left'), 'PASS: Banner content text-align is left');
assert(cssContent.includes('0.1s'), 'PASS: Banner close animation transition speed is 0.1s (instant response)');
assert(cssContent.includes('.banner-close-btn'), 'PASS: .banner-close-btn style defined in style.css');

// 2. Mock DOM Environment for JS Functions
global.window = global;
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

// 3. Load functions from app.js
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Extract function declarations and evaluate
const showBannerMatch = appCode.match(/function showGlobalBottomBanner[\s\S]*?^    \}/m);
const hideBannerMatch = appCode.match(/function hideGlobalBottomBanner[\s\S]*?^    \}/m);

assert(showBannerMatch, 'PASS: showGlobalBottomBanner function found in app.js');
assert(hideBannerMatch, 'PASS: hideGlobalBottomBanner function found in app.js');

eval(showBannerMatch[0]);
eval(hideBannerMatch[0]);

// Test Case A: Call showGlobalBottomBanner without close button (PDF Print mode)
const pdfGuideMsg = '[인쇄창 설정 안내] 프린터:"PDF로 저장"선택, [기타 설정 더보기]/여백: "사용자 지정" 권장';
showGlobalBottomBanner(pdfGuideMsg, false);

assert(bannerElem !== null, 'PASS: Banner element dynamically created');
assert(bannerElem.id === 'global-bottom-banner', 'PASS: Banner ID matches global-bottom-banner');
assert(bannerElem.innerHTML.includes(pdfGuideMsg), 'PASS: Banner innerHTML contains PDF guide message');
assert(!bannerElem.innerHTML.includes('banner-close-btn'), 'PASS: Banner excludes close button when showCloseBtn is false');
assert(bannerElem.classList.contains('show'), 'PASS: Banner has "show" class applied');

// Test Case B: Hide banner
hideGlobalBottomBanner();
assert(!bannerElem.classList.contains('show'), 'PASS: hideGlobalBottomBanner removes "show" class');

// Test Case C: Call showGlobalBottomBanner with close button
showGlobalBottomBanner('General Announcement', true);
assert(bannerElem.innerHTML.includes('banner-close-btn'), 'PASS: Banner includes close button when showCloseBtn is true');

console.log('\n========================================');
console.log('📊 TEST SUMMARY | Global Bottom Banner Test Passed 100%');
console.log('========================================');
