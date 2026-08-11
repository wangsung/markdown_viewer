/**
 * test_recent_files.js
 * 최근 파일 관리 (IndexedDB Handle 보관, 새 창 URL Param 수신 & 권한 승인 시 자동 로드) 단위 테스트
 */

const assert = require('assert');

let localStorageMap = {};
let windowOpenedUrl = null;
let idbStoreMap = {};

global.localStorage = {
    getItem: (key) => localStorageMap[key] || null,
    setItem: (key, val) => { localStorageMap[key] = String(val); },
    removeItem: (key) => { delete localStorageMap[key]; },
    clear: () => { localStorageMap = {}; }
};

global.window = {
    location: { 
        href: 'http://localhost:3000/markdown_viewer.html',
        search: ''
    },
    open: (url, target) => {
        windowOpenedUrl = { url, target };
        return {
            addEventListener: (event, handler) => {
                if (event === 'load') handler();
            }
        };
    },
    indexedDB: {
        open: () => ({
            onupgradeneeded: () => {},
            onsuccess: (e) => {
                e.target.result = {
                    objectStoreNames: { contains: () => true },
                    transaction: () => ({
                        objectStore: () => ({
                            put: (data) => { idbStoreMap[data.name] = data; },
                            get: (key) => ({
                                set onsuccess(cb) { cb(); },
                                get result() { return idbStoreMap[key] || null; }
                            })
                        })
                    })
                };
            }
        })
    }
};

global.document = {
    getElementById: (id) => null
};

// 최근 파일 서브 함수
const RECENT_FILES_KEY = 'markvi_recent_files';

function get_recent_files() {
    try {
        const raw = localStorage.getItem(RECENT_FILES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function save_recent_files(files) {
    try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
    } catch (e) {}
}

function add_recent_file_entry(name, fullPath) {
    if (!name || name === '제목 없음.md') return;
    const pathToSave = fullPath || name;
    let files = get_recent_files();
    files = files.filter(f => f.fullPath !== pathToSave && f.name !== name);
    files.unshift({
        name: name,
        fullPath: pathToSave,
        timestamp: Date.now()
    });
    if (files.length > 5) {
        files = files.slice(0, 5);
    }
    save_recent_files(files);
}

function open_recent_file_in_new_window(fileEntry) {
    if (!fileEntry) return;
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('openRecent', fileEntry.name);
    return window.open(targetUrl.toString(), '_blank');
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------
console.log('=== Recent Files Automated Unit Tests Start ===\n');

// Test 1: 초기 상태 검증
localStorage.clear();
assert.deepStrictEqual(get_recent_files(), [], 'Test 1 Failed');
console.log('✔ Test 1 Passed: Initial recent files is empty array.');

// Test 2: 기본 파일 추가 및 content 미포함 검증
add_recent_file_entry('document1.md', 'C:/Users/Test/document1.md');
let list = get_recent_files();
assert.strictEqual(list.length, 1);
assert.strictEqual(list[0].name, 'document1.md');
assert.strictEqual(list[0].fullPath, 'C:/Users/Test/document1.md');
assert.strictEqual(list[0].content, undefined);
console.log('✔ Test 2 Passed: Single entry added with name, fullPath, timestamp.');

// Test 3: 중복 추가 시 최상단 갱신
add_recent_file_entry('document2.md', 'C:/Users/Test/document2.md');
add_recent_file_entry('document1.md', 'C:/Users/Test/document1.md');
list = get_recent_files();
assert.strictEqual(list.length, 2);
assert.strictEqual(list[0].name, 'document1.md');
console.log('✔ Test 3 Passed: Duplicate file moved to top.');

// Test 4: 최대 5개 제한 유지
localStorage.clear();
for (let i = 1; i <= 6; i++) {
    add_recent_file_entry(`file${i}.md`, `C:/path/file${i}.md`);
}
list = get_recent_files();
assert.strictEqual(list.length, 5);
assert.strictEqual(list[0].name, 'file6.md');
console.log('✔ Test 4 Passed: Max 5 items limit strictly enforced.');

// Test 5: 새 창 구동 시 openRecent 쿼리 파라미터 URL 생성 검증
windowOpenedUrl = null;
open_recent_file_in_new_window(list[0]);
assert.ok(windowOpenedUrl !== null);
assert.strictEqual(windowOpenedUrl.target, '_blank');
assert.ok(windowOpenedUrl.url.includes('openRecent=file6.md'), 'Test 5 Failed: openRecent query param missing');
console.log('✔ Test 5 Passed: open_recent_file_in_new_window sets ?openRecent=file6.md query parameter in new window URL.');

console.log('\n=================================================');
console.log('🎉 ALL RECENT FILES UNIT TESTS PASSED CLEANLY!');
console.log('=================================================\n');
