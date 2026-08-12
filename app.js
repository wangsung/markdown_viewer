document.addEventListener('DOMContentLoaded', () => {
    // 디버그용 전역 에러 핸들러 (localStorage 로그 기록 및 상단 경고창 기능 포함)
    // 활성화 플래그 (기본값: true / enable)
    window.ENABLE_DEBUG_HANDLER = (typeof window.ENABLE_DEBUG_HANDLER !== 'undefined') ? window.ENABLE_DEBUG_HANDLER : true;

    window.onerror = function(message, source, lineno, colno, error) {
        // 플래그가 false 이거나 localStorage에 'markvi_debug_enabled'가 'false'이면 핸들러 비활성화
        if (window.ENABLE_DEBUG_HANDLER === false || localStorage.getItem('markvi_debug_enabled') === 'false') {
            return false;
        }

        // 브라우저의 CORS 및 로컬 파일보안 정책에 의한 무의미한 'Script error.' 필터링
        if (message === "Script error." || !source) {
            console.warn('Cross-Origin/Local 보안 제한으로 상세 디버그 정보 수집 제한 (무시 처리)');
            return false;
        }

        let errBox = document.getElementById('debug-error-banner');
        if (!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'debug-error-banner';
            errBox.style.position = 'fixed';
            errBox.style.top = '0';
            errBox.style.left = '0';
            errBox.style.width = '100%';
            errBox.style.background = '#ef4444';
            errBox.style.color = '#ffffff';
            errBox.style.zIndex = '999999';
            errBox.style.padding = '8px 12px';
            errBox.style.fontSize = '12px';
            errBox.style.fontFamily = 'monospace';
            errBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            errBox.style.wordBreak = 'break-all';
            document.body.appendChild(errBox);
        }
        errBox.textContent = `[JS Runtime Error] ${message} at ${source}:${lineno}:${colno}`;
        
        // localStorage에 에러 로그 누적 저장 (최대 50개 제한)
        try {
            const rawLogs = localStorage.getItem('markvi_error_logs');
            const logs = rawLogs ? JSON.parse(rawLogs) : [];
            const newLog = {
                timestamp: new Date().toISOString(),
                message: message,
                source: source,
                line: lineno,
                column: colno,
                stack: error && error.stack ? error.stack : null
            };
            logs.unshift(newLog); // 최신 에러가 맨 위로 오도록 추가
            if (logs.length > 50) {
                logs.length = 50; // 최대 50개까지 보관하여 용량 낭비 방지
            }
            localStorage.setItem('markvi_error_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to save error log to localStorage:', e);
        }

        console.error(error);
        return false;
    };

    // HTML Escape helper
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 순수 하위 서브 함수: 10pt (100%) 기준 비율(% -> pt) 계산 함수
     * @param {string|number} percentStr - 입력 비율 문자열 (예: "120%", 120)
     * @param {number} basePt - 기준 pt 크기 (기본값: 10pt)
     * @returns {string} - 계산된 pt 단위 문자열 (예: "12pt", "10.5pt")
     */
    function calc_scaled_font_size(percentStr, basePt = 10) {
        if (!percentStr) return `${basePt}pt`;
        const str = String(percentStr).trim();
        if (str.endsWith('pt') || str.endsWith('px')) return str;
        const num = parseFloat(str);
        if (isNaN(num)) return `${basePt}pt`;
        const scaled = (basePt * (num / 100)).toFixed(1);
        const cleanPt = scaled.endsWith('.0') ? scaled.slice(0, -2) : scaled;
        return `${cleanPt}pt`;
    }

    /**
     * 순수 하위 서브 함수: 코드 블록 내의 Hex 컬러 코드 옆에 작은 네모 스와치를 주입합니다.
     * @param {Document} doc - 전역 document 객체
     * @param {HTMLElement} previewContainer - 스와치를 주입할 대상 컨테이너 엘리먼트
     */
    function inject_color_swatches(doc, previewContainer) {
        if (!doc || !previewContainer) return;
        
        // 1. 코드 블록 내의 hljs 숫자 토큰
        const hljsNumbers = Array.from(previewContainer.querySelectorAll('pre code span.hljs-number'));
        
        // 2. 인라인 코드 요소 (백틱) - pre 내부 제외
        const inlineCodes = Array.from(previewContainer.querySelectorAll('code')).filter(code => {
            return !code.closest('pre');
        });
        
        const targets = [...hljsNumbers, ...inlineCodes];
        const hexColorRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
        
        targets.forEach(el => {
            const text = el.textContent.trim();
            if (hexColorRegex.test(text)) {
                const nextNode = el.nextElementSibling;
                if (nextNode && nextNode.classList.contains('color-swatch')) return;
                
                const swatch = doc.createElement('span');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = text;
                
                if (el.parentNode) {
                    el.parentNode.insertBefore(swatch, el.nextSibling);
                }
            }
        });
    }

    /**
     * 순수 하위 서브 함수: 코드 블록 내의 스와치(네모) 엘리먼트들을 DOM에서 물리적으로 완전히 삭제합니다.
     * @param {HTMLElement} previewContainer - 스와치를 제거할 대상 컨테이너 엘리먼트
     */
    function remove_color_swatches(previewContainer) {
        if (!previewContainer) return;
        const swatches = previewContainer.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.remove();
        });
    }

    /**
     * 순수 하위 서브 함수: 코드 블록 테마(라이트/다크)를 동적으로 전환합니다.
     * @param {string} themeStr - 'dark' 또는 'light'
     */
    function apply_code_theme(themeStr) {
        const linkEl = document.getElementById('code-theme-stylesheet');
        if (linkEl) {
            if (themeStr === 'dark') {
                linkEl.href = 'libs/github-dark.min.css';
            } else {
                linkEl.href = 'libs/github.min.css';
            }
        }
    }

    /**
     * 화면 최하단에 전역 알림/안내 배너를 노출하는 함수.
     * @param {string} message - 표시할 안내 문구
     * @param {boolean} [showCloseBtn=false] - 닫기(X) 버튼 노출 여부 (기본값: false)
     */
    function showGlobalBottomBanner(message, showCloseBtn = false) {
        let banner = document.getElementById('global-bottom-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'global-bottom-banner';
            document.body.appendChild(banner);
        }

        let contentHtml = `<div class="banner-content">${message || ''}</div>`;
        if (showCloseBtn) {
            contentHtml += `<button type="button" class="banner-close-btn" aria-label="Close banner">✕</button>`;
        }
        banner.innerHTML = contentHtml;

        if (showCloseBtn) {
            const closeBtn = banner.querySelector('.banner-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    hideGlobalBottomBanner();
                });
            }
        }

        banner.offsetHeight;
        banner.classList.add('show');
    }

    /**
     * 화면 최하단의 전역 안내 배너를 슬라이드 다운 후 숨기는 함수.
     */
    function hideGlobalBottomBanner() {
        const banner = document.getElementById('global-bottom-banner');
        if (banner) {
            banner.classList.remove('show');
        }
    }

    if (typeof window !== 'undefined') {
        window.showGlobalBottomBanner = showGlobalBottomBanner;
        window.hideGlobalBottomBanner = hideGlobalBottomBanner;
    }

    // DOM Elements
    const editor = document.getElementById('editor');
    
    // Initialize CodeMirror v5 (dragDrop: false로 커서 위치 파일 텍스트 끼워넣기 차단)
    const cm = CodeMirror.fromTextArea(editor, {
        mode: 'markdown',
        lineNumbers: true,
        lineWrapping: true,
        dragDrop: false,
        theme: 'default',
        extraKeys: {
            "Tab": function(cm) {
                cm.replaceSelection("    ");
            },
            "Cmd-B": function(cmInstance) {
                EditorManager.insert_formatting(cmInstance, 'bold', () => {
                    updateFilenameDisplay(currentFilename, true);
                    renderMarkdown();
                });
            },
            "Ctrl-B": function(cmInstance) {
                EditorManager.insert_formatting(cmInstance, 'bold', () => {
                    updateFilenameDisplay(currentFilename, true);
                    renderMarkdown();
                });
            },
            "Cmd-I": function(cmInstance) {
                EditorManager.insert_formatting(cmInstance, 'italic', () => {
                    updateFilenameDisplay(currentFilename, true);
                    renderMarkdown();
                });
            },
            "Ctrl-I": function(cmInstance) {
                EditorManager.insert_formatting(cmInstance, 'italic', () => {
                    updateFilenameDisplay(currentFilename, true);
                    renderMarkdown();
                });
            },
            "Alt-Q": function(cmInstance) {
                EditorManager.apply_paragraph_join(cmInstance, () => {
                    renderMarkdown();
                });
            }
        }
    });

    const preview = document.getElementById('preview');
    const dragDivider = document.getElementById('drag-divider');
    const editorPanel = document.getElementById('editor-panel');
    const container = document.querySelector('.container');
    
    // TOC 사이드바 DOM 요소
    const tocSidebar = document.getElementById('toc-sidebar');
    const btnTocToggleInner = document.getElementById('btn-toc-toggle-inner');
    const tocToggleBar = document.getElementById('toc-toggle-bar');
    
    const fontSelect = document.getElementById('font-select');
    const fontSizeSelect = document.getElementById('font-size-select');
    const lineColorPicker = document.getElementById('line-color-picker');
    const scrollSyncCheckbox = document.getElementById('scroll-sync');
    const togglePreviewMaxWidthCheckbox = document.getElementById('toggle-preview-max-width');
    const previewMaxWidthWrapper = document.getElementById('preview-max-width-wrapper');
    const codeblockScrollCheckbox = document.getElementById('codeblock-scroll');
    const codeblockScrollWrapper = document.getElementById('codeblock-scroll-wrapper');
    const mathRenderCheckbox = document.getElementById('math-render');
    const mathRenderWrapper = document.getElementById('math-render-wrapper');
    const diagramRenderCheckbox = document.getElementById('diagram-render');
    const diagramRenderWrapper = document.getElementById('diagram-render-wrapper');
    const colorSwatchCheckbox = document.getElementById('color-swatch-toggle');
    const colorSwatchWrapper = document.getElementById('color-swatch-wrapper');
    const btnCopy = document.getElementById('btn-copy');
    const btnSave = document.getElementById('btn-save');
    const btnSaveAs = document.getElementById('btn-save-as');
    const btnDebug = document.getElementById('btn-debug');
    const exportDropdown = document.getElementById('export-dropdown');
    const btnExport = document.getElementById('btn-export');
    const exportMenu = document.getElementById('export-menu');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnExportPdfPrint = document.getElementById('btn-export-pdf-print');
    const btnExportPdfHtml2Pdf = document.getElementById('btn-export-pdf-html2pdf');
    const btnOpenNewWindow = document.getElementById('btn-open-new-window');
    const btnOpenNewWindowDefault = document.getElementById('btn-open-new-window-default');
    const btnJoinParagraphs = document.getElementById('btn-join-paragraphs');
    
    const viewDropdown = document.getElementById('view-dropdown');
    const btnView = document.getElementById('btn-view');
    const viewMenu = document.getElementById('view-menu');

    const headingDropdown = document.getElementById('heading-dropdown');
    const btnHeadingStyle = document.getElementById('btn-heading-style');
    const headingStyleMenu = document.getElementById('heading-style-menu');

    const menuDropdown = document.getElementById('menu-dropdown');
    const btnMenu = document.getElementById('btn-menu');
    const mainMenu = document.getElementById('main-menu');
    const btnNewFile = document.getElementById('btn-new-file');
    const btnOpenFile = document.getElementById('btn-open-file');
    const fileInput = document.getElementById('file-input');

    // Theme Toggle Elements & Logic
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeIconSun = document.querySelector('.theme-icon-sun');
    const themeIconMoon = document.querySelector('.theme-icon-moon');
    const themeToggleText = document.getElementById('theme-toggle-text');

    function applyTheme(theme) {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.applyTheme === 'function') {
            FrameManager.applyTheme(theme);
        }
    }

    function initTheme() {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.initTheme === 'function') {
            FrameManager.initTheme();
        }
    }

    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    
    // 에디터 파일 관련 변수 및 상태 플래그
    let currentFilename = '제목 없음.md';
    let currentFileHandle = null; // Direct Save용 FileSystemFileHandle 객체
    let isDirty = false;
    let enableScrollSync = true;
    let scrollSync = null;

    // 파일 이름 표시 및 상태 변경 함수
    function updateFilenameDisplay(name, isModified) {
        currentFilename = name;
        isDirty = isModified;
        
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.updateFilenameDisplay === 'function') {
            FrameManager.updateFilenameDisplay(name, isModified);
        }
        
        if (typeof add_recent_file_entry === 'function' && name && name !== '제목 없음.md') {
            add_recent_file_entry(name, name);
        }
    }

    // 초기 파일명 뱃지 표시 설정
    updateFilenameDisplay(currentFilename, false);

    // ==========================================================================
    // Recent Files Management & Submenu (IndexedDB Handle Sync & snake_case)
    // ==========================================================================
    const RECENT_FILES_KEY = 'markvi_recent_files';
    const IDB_NAME = 'markvi_recent_db';
    const IDB_STORE = 'handles';

    function init_recent_db() {
        return new Promise((resolve) => {
            if (!window.indexedDB) return resolve(null);
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE, { keyPath: 'name' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        });
    }

    async function save_handle_to_idb(name, handle) {
        if (!name || !handle) return;
        const db = await init_recent_db();
        if (!db) return;
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.put({ name: name, handle: handle, timestamp: Date.now() });
        } catch (e) {
            console.warn('Failed to save file handle to IndexedDB:', e);
        }
    }

    async function get_handle_from_idb(name) {
        if (!name) return null;
        const db = await init_recent_db();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(IDB_STORE, 'readonly');
                const store = tx.objectStore(IDB_STORE);
                const req = store.get(name);
                req.onsuccess = () => resolve(req.result ? req.result.handle : null);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    // 다른 창/탭에서 최근 파일 목록이 변경되었을 때 실시간 동기화를 위한 storage 이벤트 리스너
    window.addEventListener('storage', (e) => {
        if (e.key === RECENT_FILES_KEY) {
            render_recent_files_menu();
        }
    });

    function get_recent_files() {
        try {
            const raw = localStorage.getItem(RECENT_FILES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to parse recent files:', e);
            return [];
        }
    }

    function save_recent_files(files) {
        try {
            localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
        } catch (e) {
            console.warn('Failed to save recent files:', e);
        }
    }

    function add_recent_file_entry(name, fullPath, handle = null, size = 0) {
        if (!name || name === '제목 없음.md') return;
        const pathToSave = fullPath || name;
        let files = get_recent_files();
        files = files.filter(f => f.fullPath !== pathToSave && f.name !== name);
        
        let contentSize = size;
        if (!contentSize && typeof cm !== 'undefined' && cm) {
            try {
                contentSize = new Blob([cm.getValue()]).size;
            } catch (e) {
                contentSize = 0;
            }
        }

        files.unshift({
            name: name,
            fullPath: pathToSave,
            timestamp: Date.now(),
            size: contentSize || 0
        });
        if (files.length > 5) {
            files = files.slice(0, 5);
        }
        save_recent_files(files);
        if (handle) {
            save_handle_to_idb(name, handle);
        }
        render_recent_files_menu();
    }

    async function open_recent_file_in_new_window(fileEntry) {
        if (!fileEntry) return;
        
        // 클릭 시 사용자 직접 행동(User Gesture) 문맥에서 미리 File Handle 점검 및 권한 요청
        let handle = await get_handle_from_idb(fileEntry.name);
        let hasValidHandle = false;

        if (handle && typeof handle.queryPermission === 'function') {
            try {
                let perm = await handle.queryPermission({ mode: 'read' });
                if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
                    perm = await handle.requestPermission({ mode: 'read' });
                }
                if (perm === 'granted') {
                    hasValidHandle = true;
                }
            } catch (err) {
                console.warn('사용자 클릭 문맥 내 handle 권한 요청 실패:', err);
            }
        }

        // IndexedDB에 유효한 핸들이 없거나 권한이 거부된 경우: 클릭 문맥(User Gesture)에서 즉시 파일 불러오기 창 팝업
        if (!hasValidHandle && typeof window.showOpenFilePicker === 'function') {
            try {
                const [newHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Markdown Documents',
                        accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }
                    }],
                    multiple: false
                });
                if (newHandle) {
                    const file = await newHandle.getFile();
                    handle = newHandle;
                    add_recent_file_entry(file.name, file.path || file.name, newHandle, file.size);
                    hasValidHandle = true;
                }
            } catch (err) {
                if (err.name === 'AbortError') return; // 사용자가 창을 닫은 경우 취소
                console.warn('최근 파일 다시 선택 대화상자 실패:', err);
            }
        }

        function isFreshWindow() {
            return isNewSessionSkippedRestore || (!isDirty && cm && cm.getValue().trim() === '' && !currentFileHandle);
        }

        // 새 창 막 열린 상태/깨끗한 상태라면 현재 창에 불러오기
        if (isFreshWindow()) {
            if (hasValidHandle && handle) {
                try {
                    const file = await handle.getFile();
                    currentFileHandle = handle;
                    add_recent_file_entry(file.name, file.path || file.name, handle, file.size);
                    loadSingleFile(file);
                    isNewSessionSkippedRestore = false;
                    return;
                } catch (err) {
                    console.warn('현재 창에 최근 파일 불러오기 실패:', err);
                }
            }
        }

        // 원본 경로로 깔끔한 새 URL 계산 (openRecent 파라미터 중첩 방지)
        const originUrl = new URL(window.location.origin + window.location.pathname);
        originUrl.searchParams.set('openRecent', fileEntry.name);
        window.open(originUrl.toString(), '_blank');
    }

    async function check_and_load_recent_url_param() {
        const urlParams = new URLSearchParams(window.location.search);
        const recentName = urlParams.get('openRecent');
        if (!recentName) return;

        // URL 파라미터 수신 및 로드 처리 후 히스토리에서 쿼리 클린업
        try {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
            console.warn('URL 히스토리 클린업 실패:', e);
        }

        let isLoadSuccess = false;
        const handle = await get_handle_from_idb(recentName);
        if (handle) {
            try {
                if (typeof handle.queryPermission === 'function') {
                    let perm = await handle.queryPermission({ mode: 'read' });
                    if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
                        perm = await handle.requestPermission({ mode: 'read' });
                    }
                    if (perm === 'granted') {
                        const file = await handle.getFile();
                        currentFileHandle = handle;
                        add_recent_file_entry(file.name, file.path || file.name, handle, file.size);
                        loadSingleFile(file);
                        isLoadSuccess = true;
                        return;
                    }
                }
            } catch (e) {
                console.warn('IndexedDB handle 권한 로드 실패:', e);
            }
        }

        // 새 창에서 최근 파일 로드 실패 시 (Handle 미존재, 파일 이동/삭제 등)
        if (!isLoadSuccess) {
            currentFileHandle = null;
            // 본문은 새 문서 상태 (빈 텍스트)로 깔끔하게 유지
            cm.setValue('');
            updateFilenameDisplay('제목 없음.md', false);
            renderMarkdown();
            saveDocumentSession();
            showToast(`최근 파일 "${recentName}"을(를) 여시려면 상단 'md 불러오기'를 이용해 주세요.`, 5000);
            render_recent_files_menu();
        }
    }

    function render_recent_files_menu() {
        const files = get_recent_files();
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.renderRecentFilesMenu === 'function') {
            FrameManager.renderRecentFilesMenu(files, (entry) => {
                open_recent_file_in_new_window(entry);
            });
        }
    }

    // ==========================================================================
    // Preview Max Width Limit Control (snake_case sub-function)
    // ==========================================================================
    function apply_preview_max_width_limit(isLimited = true) {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.applyPreviewMaxWidthLimit === 'function') {
            FrameManager.applyPreviewMaxWidthLimit(isLimited);
        }
    }

    // ==========================================================================
    // Session Auto-Save & Restore (Content, Filename, Split Width, Views)
    // ==========================================================================
    let SESSION_STORAGE_KEY = 'markvi_document_session';
    let isNewSessionSkippedRestore = false;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('new') === '1') {
            const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            SESSION_STORAGE_KEY = 'markvi_document_session_' + sessionId;
            urlParams.delete('new');
            urlParams.set('session', sessionId);
            window.history.replaceState(null, '', '?' + urlParams.toString());
            isNewSessionSkippedRestore = true;
        } else if (urlParams.has('session')) {
            SESSION_STORAGE_KEY = 'markvi_document_session_' + urlParams.get('session');
        }
    } catch (e) {
        console.warn('Failed to parse URL session params:', e);
    }

    function saveDocumentSession() {
        if (!cm) return;
        try {
            const sessionData = {
                content: cm.getValue(),
                filename: currentFilename,
                isDirty: isDirty,
                editorWidthPercent: editorPanel ? editorPanel.style.width : '',
                fontFamily: fontSelect ? fontSelect.value : '',
                fontSize: fontSizeSelect ? fontSizeSelect.value : '',
                lineColor: lineColorPicker ? lineColorPicker.value : '',
                previewMaxWidthLimited: togglePreviewMaxWidthCheckbox ? togglePreviewMaxWidthCheckbox.checked : true,
                colorSwatchEnabled: colorSwatchCheckbox ? colorSwatchCheckbox.checked : true,
                scrollSyncEnabled: scrollSyncCheckbox ? scrollSyncCheckbox.checked : true
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        } catch (e) {
            console.warn('Failed to save document session:', e);
        }
    }

    function restoreDocumentSession() {
        try {
            const rawData = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!rawData) return;
            const session = JSON.parse(rawData);

            // 1. Content Restore (Skip if new tab)
            if (!isNewSessionSkippedRestore && typeof session.content === 'string' && session.content.length > 0) {
                cm.setValue(session.content);
            }

            // 2. Filename & Status Restore (Skip if new tab)
            if (!isNewSessionSkippedRestore && session.filename) {
                updateFilenameDisplay(session.filename, !!session.isDirty);
            }

            // 3. Frame & Visual Layout Settings Restore (FrameManager 위임)
            if (typeof FrameManager !== 'undefined' && typeof FrameManager.restoreFrameSettings === 'function') {
                FrameManager.restoreFrameSettings(session);
            }
        } catch (e) {
            console.warn('Failed to restore document session:', e);
        }
    }

    // ==========================================================================
    // Heading Style Presets Multi-Set System (Minimum 5 Sets)
    // ==========================================================================
    const DEFAULT_HEADING_PRESETS = [];

    function getHeadingPresets() {
        try {
            const stored = localStorage.getItem('markvi_heading_presets');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.warn('Failed to parse heading presets:', e);
        }
        return window.StyleEditor.getDefaultPresets();
    }

    function saveHeadingPresets(presets) {
        try {
            localStorage.setItem('markvi_heading_presets', JSON.stringify(presets));
        } catch (e) {
            console.warn('Failed to save heading presets:', e);
        }
    }

    function syncNewHeadingPresets() {
        try {
            const stored = localStorage.getItem('markvi_heading_presets');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    let changed = false;
                    
                    parsed.forEach(p => {
                        if (p.styles && !p.styles.codeblock) {
                            p.styles.codeblock = { colorLight: '#24292e', colorDark: '#f8fafc', bgLight: '#f6f8fa', bgDark: '#0f172a' };
                            changed = true;
                        }
                    });

                    const defaultPresets = window.StyleEditor.getDefaultPresets();
                    defaultPresets.forEach(defPreset => {
                        if (!parsed.some(p => p.id === defPreset.id)) {
                            parsed.push(defPreset);
                            changed = true;
                        }
                    });
                    if (changed) {
                        saveHeadingPresets(parsed);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to sync new heading presets:', e);
        }
    }

    function applyHeadingPreset(presetId, tempStyles = null) {
        const presets = getHeadingPresets();
        const found = presets.find(p => p.id === presetId) || presets[0];
        if (!found || !found.styles) return;

        const styles = tempStyles || found.styles;
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-editor-theme') || 'dark';

        // 순수 서브 함수 EditorManager.apply_heading_preset로 스타일 바인딩 호출
        EditorManager.apply_heading_preset(root, styles, currentTheme);

        if (!tempStyles) {
            localStorage.setItem('markvi_active_heading_preset', presetId);
        }

        const headingSelect = document.getElementById('heading-preset-select');
        const modalSelect = document.getElementById('modal-heading-preset-select');
        if (headingSelect) headingSelect.value = presetId;
        if (modalSelect) modalSelect.value = presetId;

        // CodeMirror 에디터 인스턴스 레이아웃 및 스타일 강제 리프레시 (비동기 렌더 딜레이 보장)
        if (typeof cm !== 'undefined' && cm) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    cm.refresh();
                }, 50);
            });
        }
    }

    function updatePresetSelectOptions() {
        const presets = getHeadingPresets();
        const headingSelect = document.getElementById('heading-preset-select');
        const modalSelect = document.getElementById('modal-heading-preset-select');

        [headingSelect, modalSelect].forEach(selectEl => {
            if (!selectEl) return;
            const currentVal = selectEl.value;
            selectEl.innerHTML = '';
            presets.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                selectEl.appendChild(opt);
            });
            if (currentVal && presets.some(p => p.id === currentVal)) {
                selectEl.value = currentVal;
            }
        });
    }

    // ==========================================================================
    // Markdown & Syntax Highlight & Math Configuration
    // ==========================================================================
    
    // KaTeX availability and state initialization
    const isKatexAvailable = typeof katex !== 'undefined';
    let enableMathSupport = isKatexAvailable; // default: true if KaTeX is loaded

    // If KaTeX is not loaded, hide the UI toggle
    if (mathRenderWrapper) {
        if (!isKatexAvailable) {
            mathRenderWrapper.style.display = 'none';
        } else if (mathRenderCheckbox) {
            mathRenderCheckbox.checked = enableMathSupport;
        }
    }

    // Mermaid availability and state initialization
    const isMermaidAvailable = typeof mermaid !== 'undefined';
    let enableDiagramSupport = isMermaidAvailable; // default: true if Mermaid is loaded

    // If Mermaid is not loaded, hide the UI toggle
    if (diagramRenderWrapper) {
        if (!isMermaidAvailable) {
            diagramRenderWrapper.style.display = 'none';
        } else if (diagramRenderCheckbox) {
            diagramRenderCheckbox.checked = enableDiagramSupport;
        }
    }

    // Initialize mermaid if available
    if (isMermaidAvailable) {
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose'
            });
        } catch (e) {
            console.error("Mermaid initialization failed:", e);
        }
    }

    // Configure custom marked.js renderer to support highlight.js & KaTeX
    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();
        
        // Support old signature code(code, lang) and new signature code({text, lang})
        renderer.code = function(codeOrObj, infostring) {
            let text = '';
            let lang = '';
            if (typeof codeOrObj === 'object' && codeOrObj !== null) {
                text = codeOrObj.text || '';
                lang = codeOrObj.lang || '';
            } else {
                text = codeOrObj || '';
                lang = infostring || '';
            }
            
            // Check if it's math/latex code block and math rendering is enabled
            if ((lang === 'math' || lang === 'latex') && enableMathSupport && isKatexAvailable) {
                try {
                    return `<div class="katex-block">${katex.renderToString(text, { displayMode: true, throwOnError: false })}</div>`;
                } catch (e) {
                    console.error("KaTeX code block error:", e);
                    return `<div class="katex-error">${escapeHtml(text)}</div>`;
                }
            }

            // Check if it's mermaid diagram code block and diagram support is enabled
            if (lang === 'mermaid' && enableDiagramSupport && isMermaidAvailable) {
                return `<div class="mermaid">${escapeHtml(text)}</div>`;
            }
            
            const validLang = !!(lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang));
            let highlighted = '';
            try {
                if (validLang) {
                    highlighted = hljs.highlight(text, { language: lang }).value;
                } else {
                    highlighted = escapeHtml(text);
                }
            } catch (e) {
                console.error("Syntax highlighting error:", e);
                highlighted = escapeHtml(text);
            }
            return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
        };

        const markedOptions = {
            renderer: renderer,
            gfm: true,
            breaks: true,
            pedantic: false
        };

        // Inject extensions only if KaTeX is available (can be toggled at render time)
        const inlineMath = {
            name: 'inlineMath',
            level: 'inline',
            start(src) { return src.indexOf('$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$([^$\n]+?)\$/);
                if (match) {
                    return {
                        type: 'inlineMath',
                        raw: match[0],
                        formula: match[1].trim()
                    };
                }
            },
            renderer(token) {
                if (enableMathSupport && isKatexAvailable) {
                    try {
                        return katex.renderToString(token.formula, { displayMode: false, throwOnError: false });
                    } catch (err) {
                        console.error("KaTeX inline parsing error:", err);
                        return `<span class="katex-error">${escapeHtml(token.raw)}</span>`;
                    }
                }
                return escapeHtml(token.raw); // Fallback: output raw text
            }
        };

        const blockMath = {
            name: 'blockMath',
            level: 'block',
            start(src) { return src.indexOf('$$'); },
            tokenizer(src, tokens) {
                const match = src.match(/^\$\$\n?([\s\S]+?)\n?\$\$/);
                if (match) {
                    return {
                        type: 'blockMath',
                        raw: match[0],
                        formula: match[1].trim()
                    };
                }
            },
            renderer(token) {
                if (enableMathSupport && isKatexAvailable) {
                    try {
                        return `<div class="katex-block">${katex.renderToString(token.formula, { displayMode: true, throwOnError: false })}</div>`;
                    } catch (err) {
                        console.error("KaTeX block parsing error:", err);
                        return `<div class="katex-error">${escapeHtml(token.raw)}</div>`;
                    }
                }
                return `<div class="katex-fallback">${escapeHtml(token.raw)}</div>`; // Fallback: output raw text in a div
            }
        };

        const bracketText = {
            name: 'bracketText',
            level: 'inline',
            start(src) { return src.indexOf('['); },
            tokenizer(src, tokens) {
                const match = src.match(/^\[([^\]\n]+)\](?!\(|\[)/);
                if (match) {
                    return {
                        type: 'bracketText',
                        raw: match[0],
                        text: match[1]
                    };
                }
            },
            renderer(token) {
                return `<span class="md-bracket-link">[${token.text}]</span>`;
            }
        };

        markedOptions.extensions = [inlineMath, blockMath, bracketText];
        marked.use(markedOptions);
    }

    // Main Render Function with Line Mapping
    function renderMarkdown() {
        // Windows 개행문자(\r\n)를 Unix 개행문자(\n)로 통일하여 marked 토큰과 인덱스를 일치시킴
        const markdownText = cm.getValue().replace(/\r\n/g, '\n');
        if (typeof marked === 'undefined') {
            preview.innerHTML = `<div style="color: red; padding: 20px;">marked.js 라이브러리가 로드되지 않았습니다.</div>`;
            return;
        }

        try {
            // 1. 문자열 오프셋 기반 줄 번호 조회를 위한 줄 경계선 배열 생성
            const linePositions = [0];
            let pos = 0;
            while ((pos = markdownText.indexOf('\n', pos)) !== -1) {
                linePositions.push(pos + 1);
                pos++;
            }

            function getLineNumber(charIndex) {
                let low = 0;
                let high = linePositions.length - 1;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    if (linePositions[mid] === charIndex) {
                        return mid + 1;
                    } else if (linePositions[mid] < charIndex) {
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }
                return low; // 가장 가까운 줄 번호 반환
            }

            // 2. 마크다운을 블록 토큰(AST)으로 컴파일
            const tokens = marked.lexer(markdownText);
            let lastSearchIndex = 0;

            // 3. 첫 태그에 data-line을 삽입하는 헬퍼 함수
            function injectDataLine(html, line) {
                const trimmed = html.trim();
                if (trimmed.startsWith('<')) {
                    // 첫 HTML 여는 태그명 뒤에 data-line 속성 삽입 (예: <p> -> <p data-line="10">)
                    return trimmed.replace(/^<([a-zA-Z0-9\-]+)/, `<$1 data-line="${line}"`);
                }
                return html;
            }

            // 4. 개별 토큰 렌더링 후 data-line 주입 및 병합
            const htmlSegments = tokens.map(token => {
                // 토큰 텍스트의 시작 오프셋 찾기
                const index = markdownText.indexOf(token.raw, lastSearchIndex);
                let lineNum = 1;
                if (index !== -1) {
                    lineNum = getLineNumber(index);
                    lastSearchIndex = index + token.raw.length; // 검색 범위 갱신
                }
                
                // 단일 토큰 렌더링
                let rawHtml = '';
                try {
                    rawHtml = marked.parser([token]);
                } catch (err) {
                    console.error("Token parsing error:", err);
                    rawHtml = token.raw;
                }
                
                return injectDataLine(rawHtml, lineNum);
            });

            preview.innerHTML = htmlSegments.join('\n');
            
            // 컬러 스와치 주입 (순수 서브 함수 호출) - 토글이 켜져 있을 때만
            if (!colorSwatchCheckbox || colorSwatchCheckbox.checked) {
                inject_color_swatches(document, preview);
            }
            
            // Render Mermaid diagrams asynchronously if enabled and available
            if (enableDiagramSupport && isMermaidAvailable) {
                try {
                    mermaid.run({
                        querySelector: '.mermaid'
                    }).catch(err => {
                        console.error("Mermaid asynchronous render error:", err);
                    });
                } catch (e) {
                    console.error("Mermaid run invocation error:", e);
                }
            }
            
            // 렌더링 완료 후 스크롤 싱크 키프레임 목록 재구축 (Stage 1)
            if (scrollSync) {
                scrollSync.rebuildKeyframes('Stage 1: renderMarkdown');
            }

            // 에디터 텍스트 파싱을 통한 TOC 목록 동적 빌드
            buildTOC();
            
        } catch (e) {
            console.error("Rendering error:", e);
            preview.innerHTML = `<div style="color: red; padding: 20px;">마크다운 렌더링 에러: ${e.message}</div>`;
        }
    }

    // (초기 렌더링 및 입력 이벤트 리스너는 변수 TDZ 참조 오류를 방지하기 위해 스크롤 싱크 로직이 완료된 파일 최하단으로 이동 배치되었습니다)

    // ==========================================================================
    // Drag-to-Resize Panel Width Logic
    // ==========================================================================
    // Resizing logic handled by FrameManager

    // ==========================================================================
    // Customization Settings Sync (Font, Font-size, Line color)
    // ==========================================================================
    
    // 1. Font Family Selector
    fontSelect.addEventListener('change', () => {
        const selectedFont = fontSelect.value;
        if (preview) preview.style.setProperty('--preview-font-family', selectedFont);
        document.documentElement.style.setProperty('--preview-font-family', selectedFont);
        saveDocumentSession();
    });

    // 2. Font Size Selector (% 비율 기반 -> 10pt == 100% 환산 적용)
    fontSizeSelect.addEventListener('change', () => {
        const selectedVal = fontSizeSelect.value;
        const computedPt = calc_scaled_font_size(selectedVal, 10);
        if (preview) preview.style.setProperty('--preview-font-size', computedPt);
        document.documentElement.style.setProperty('--preview-font-size', computedPt);
        document.documentElement.style.setProperty('--editor-font-size', computedPt);
        if (cm && typeof cm.refresh === 'function') cm.refresh();
        saveDocumentSession();
    });

    // 2-2. Font Size Spin Buttons (Up/Down 10% / 1pt 단위 증감)
    const btnFontSizeUp = document.getElementById('btn-font-size-up');
    const btnFontSizeDown = document.getElementById('btn-font-size-down');

    if (btnFontSizeUp && btnFontSizeDown && fontSizeSelect) {
        btnFontSizeUp.addEventListener('click', () => {
            const currentVal = fontSizeSelect.value;
            let currentPercent = parseFloat(currentVal);
            if (isNaN(currentPercent)) currentPercent = 120;
            
            // 10% (1pt) 증가
            const newPercent = Math.min(300, Math.round(currentPercent + 10));
            const newPercentStr = `${newPercent}%`;
            
            let matchedOption = Array.from(fontSizeSelect.options).find(opt => opt.value === newPercentStr);
            if (!matchedOption) {
                const ptVal = calc_scaled_font_size(newPercentStr, 10);
                matchedOption = new Option(`${newPercentStr} (${ptVal})`, newPercentStr);
                fontSizeSelect.add(matchedOption);
            }
            fontSizeSelect.value = newPercentStr;
            fontSizeSelect.dispatchEvent(new Event('change'));
        });

        btnFontSizeDown.addEventListener('click', () => {
            const currentVal = fontSizeSelect.value;
            let currentPercent = parseFloat(currentVal);
            if (isNaN(currentPercent)) currentPercent = 120;
            
            // 10% (1pt) 감소 (최소 30%)
            const newPercent = Math.max(30, Math.round(currentPercent - 10));
            const newPercentStr = `${newPercent}%`;
            
            let matchedOption = Array.from(fontSizeSelect.options).find(opt => opt.value === newPercentStr);
            if (!matchedOption) {
                const ptVal = calc_scaled_font_size(newPercentStr, 10);
                matchedOption = new Option(`${newPercentStr} (${ptVal})`, newPercentStr);
                fontSizeSelect.add(matchedOption);
            }
            fontSizeSelect.value = newPercentStr;
            fontSizeSelect.dispatchEvent(new Event('change'));
        });
    }

    // 2-3. Codeblock Scroll Toggle (보기 메뉴 -> 코드블록 스크롤 토글)
    function updateCodeblockScroll(useScroll) {
        const isScrollOn = (useScroll !== false && useScroll !== 'false');
        const wsVal = isScrollOn ? 'pre' : 'pre-wrap';
        const wbVal = isScrollOn ? 'normal' : 'break-word';
        
        if (preview) {
            preview.style.setProperty('--preview-code-whitespace', wsVal);
            preview.style.setProperty('--preview-code-word-break', wbVal);
        }
        document.documentElement.style.setProperty('--preview-code-whitespace', wsVal);
        document.documentElement.style.setProperty('--preview-code-word-break', wbVal);
    }

    if (togglePreviewMaxWidthCheckbox) {
        togglePreviewMaxWidthCheckbox.addEventListener('change', () => {
            apply_preview_max_width_limit(togglePreviewMaxWidthCheckbox.checked);
            saveDocumentSession();
        });

        if (previewMaxWidthWrapper) {
            previewMaxWidthWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    if (codeblockScrollCheckbox) {
        const savedScroll = localStorage.getItem('markvi_codeblock_scroll');
        const isScrollOn = (savedScroll !== 'false');
        codeblockScrollCheckbox.checked = isScrollOn;
        updateCodeblockScroll(isScrollOn);

        codeblockScrollCheckbox.addEventListener('change', () => {
            const isChecked = codeblockScrollCheckbox.checked;
            localStorage.setItem('markvi_codeblock_scroll', isChecked ? 'true' : 'false');
            updateCodeblockScroll(isChecked);
        });

        if (codeblockScrollWrapper) {
            codeblockScrollWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // 3. Line Color Picker (Dynamic CSS Theme Variables)
    function updateThemeColors(colorHex) {
        document.documentElement.style.setProperty('--theme-color', colorHex);
        
        // Darken for hover state (approx 15% darker)
        const hoverColor = darkenColor(colorHex, 0.15);
        document.documentElement.style.setProperty('--theme-color-hover', hoverColor);
        
        // Extract and set RGB components for focus box shadow alpha
        const rgb = hexToRgb(colorHex);
        document.documentElement.style.setProperty('--theme-color-rgb', rgb);
    }

    // Color conversion helpers
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        let r = 0, g = 0, b = 0;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        return `${r}, ${g}, ${b}`;
    }

    function darkenColor(hex, percent) {
        hex = hex.replace(/^#/, '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        
        r = Math.max(0, Math.floor(r * (1 - percent)));
        g = Math.max(0, Math.floor(g * (1 - percent)));
        b = Math.max(0, Math.floor(b * (1 - percent)));
        
        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');
        return `#${rHex}${gHex}${bHex}`;
    }

    if (lineColorPicker) {
        lineColorPicker.addEventListener('input', (e) => {
            updateThemeColors(e.target.value);
            saveDocumentSession();
        });
        updateThemeColors(lineColorPicker.value);
    }

    // Attach Event Listeners to Toolbar buttons (Delegated to EditorManager)
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const markdownType = target.getAttribute('data-markdown');
            if (markdownType) {
                EditorManager.insert_formatting(cm, markdownType, () => {
                    updateFilenameDisplay(currentFilename, true);
                    renderMarkdown();
                });
            }
        });
    });

    // ==========================================================================
    // Keyboard Shortcuts & Editor Enhancements
    // ==========================================================================
    // Keyboard Shortcuts handled natively by CodeMirror extraKeys option

    // ==========================================================================
    // ==========================================================================
    // Preview 복사 (프리뷰 화면 전체 선택 및 클립보드 복사 서브 함수)
    // ==========================================================================

    /**
     * [리팩토링 목적]: 글로벌 변수 의존성을 제거하고, 프리뷰 DOM 선택/복사 및 성공 피드백 UI 처리를 순수 서브 함수로 모듈화하여 재사용성과 가독성을 높임.
     * @param {HTMLElement} previewEl - 복사 대상 프리뷰 엘리먼트
     * @param {HTMLElement|null} exportMenuEl - 닫을 내보내기 메뉴 엘리먼트
     * @param {HTMLElement|null} feedbackBtnEl - 복사 완료 성공 표시를 해줄 버튼 엘리먼트
     */
    function copyPreviewToClipboard(previewEl, exportMenuEl, feedbackBtnEl) {
        // 프리뷰 영역의 내용이 없거나 자식이 없으면 중단
        if (!previewEl || previewEl.children.length === 0) {
            alert('복사할 프리뷰 내용이 없습니다.');
            return;
        }

        // 드롭다운 메뉴 닫기
        if (exportMenuEl) {
            exportMenuEl.classList.remove('show');
        }

        // 범위(Range) 생성 및 프리뷰 요소의 콘텐츠 지정
        const range = document.createRange();
        range.selectNodeContents(previewEl);

        // 이전 선택 범위를 지우고 새로운 범위 추가
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            // 선택된 영역 복사 실행 (서식 있는 텍스트 복사)
            const successful = document.execCommand('copy');
            if (successful) {
                // 내보내기 버튼에 복사 성공 피드백 표시
                if (feedbackBtnEl) {
                    const originalHTML = feedbackBtnEl.innerHTML;
                    feedbackBtnEl.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        복사 완료!
                    `;
                    feedbackBtnEl.style.borderColor = '#10b981';
                    feedbackBtnEl.style.color = '#10b981';
                    
                    setTimeout(() => {
                        feedbackBtnEl.innerHTML = originalHTML;
                        feedbackBtnEl.style.borderColor = '';
                        feedbackBtnEl.style.color = '';
                    }, 2000);
                }
            } else {
                alert('클립보드 복사 명령을 실행할 수 없습니다.');
            }
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert('클립보드 복사에 실패했습니다.');
        } finally {
            // 복사 완료 후 선택 영역 해제 (시각적 잔상 제거 및 정리)
            selection.removeAllRanges();
        }
    }

    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            ExportManager.copyPreviewToClipboard(preview, exportMenu, btnExport);
        });
    }

    // ==========================================================================
    // 내보내기 드롭다운 토글 및 HTML 내보내기 기능
    // ==========================================================================
    // FrameManager UI Initialization & Action Delegation
    if (typeof FrameManager !== 'undefined' && typeof FrameManager.init === 'function') {
        FrameManager.init({
            elements: {
                container,
                editorPanel,
                dragDivider,
                themeIconSun,
                themeIconMoon,
                themeToggleText,
                btnThemeToggle,
                exportDropdown,
                btnExport,
                exportMenu,
                btnExportHtml,
                btnExportPdfPrint,
                btnExportPdfHtml2Pdf,
                btnOpenNewWindow,
                btnOpenNewWindowDefault,
                btnJoinParagraphs,
                viewDropdown,
                btnView,
                viewMenu,
                headingDropdown,
                btnHeadingStyle,
                headingStyleMenu,
                menuDropdown,
                btnMenu,
                mainMenu,
                btnNewFile,
                btnOpenFile,
                btnCopy,
                btnSave,
                btnSaveAs,
                btnDebug,
                editorPanel,
                fontSelect,
                fontSizeSelect,
                lineColorPicker,
                colorSwatchCheckbox,
                scrollSyncCheckbox,
                preview
            },
            actions: {
                onThemeChange: (theme) => {
                    apply_code_theme(theme);
                    const activePresetId = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
                    applyHeadingPreset(activePresetId);
                },
                onPanelResize: () => {
                    if (cm && typeof cm.refresh === 'function') cm.refresh();
                },
                onResizeComplete: () => {
                    if (cm && typeof cm.refresh === 'function') cm.refresh();
                    saveDocumentSession();
                },
                onLineColorChange: (color) => {
                    if (typeof updateThemeColors === 'function') updateThemeColors(color);
                },
                onColorSwatchToggle: (enabled) => {
                    if (!enabled) {
                        remove_color_swatches(preview);
                    } else {
                        inject_color_swatches(document, preview);
                    }
                },
                onScrollSyncToggle: (enabled) => {
                    enableScrollSync = enabled;
                    if (scrollSync) {
                        scrollSync.setEnable(enabled);
                    }
                },
                onNewFile: () => handleNewFile(),
                onOpenFile: () => trigger_open_file_dialog(),
                onCopy: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.copyPreviewToClipboard(preview, exportMenu);
                    }
                },
                onSave: () => handleSaveFile(),
                onSaveAs: () => handleSaveAsFile(),
                onExportHtml: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.downloadPreviewHtml(preview, currentFilename, collectExportOptions());
                    }
                },
                onExportPdfPrint: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.openPreviewHtmlInNewWindow(preview, currentFilename, collectExportOptions());
                    }
                },
                onExportPdfHtml2Pdf: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.openPreviewHtmlInNewWindow(preview, currentFilename, collectExportOptions());
                    }
                },
                onOpenNewWindow: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.openPreviewHtmlInNewWindow(preview, currentFilename, collectExportOptions());
                    }
                },
                onOpenNewWindowDefault: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.openDefaultPreviewHtmlInNewWindow(preview, currentFilename);
                    }
                },
                onJoinParagraphs: () => join_paragraphs(),
                onToggleDebug: () => toggle_debug_panel()
            }
        });
    }

    async function trigger_open_file_dialog() {
        if (mainMenu) mainMenu.classList.remove('show');
        if (typeof window.showOpenFilePicker === 'function') {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Markdown Documents',
                        accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }
                    }],
                    multiple: false
                });
                if (handle) {
                    const file = await handle.getFile();
                    currentFileHandle = handle;
                    add_recent_file_entry(file.name, file.path || file.name, handle, file.size);
                    loadSingleFile(file);
                    return true;
                }
            } catch (err) {
                if (err.name === 'AbortError') return false;
                console.warn('showOpenFilePicker 실패, fallback input 시도:', err);
            }
        }
        if (fileInput) fileInput.click();
        return true;
    }

    if (btnOpenFile) {
        btnOpenFile.addEventListener('click', trigger_open_file_dialog);
    }

    // 헬퍼: 현재 앱의 테마 및 CSS 스타일 변수 맵 수집 함수 (Structured Options Object 생성)
    function collectExportOptions(overrideOptions = {}) {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-editor-theme') || 'dark';
        const targetTheme = overrideOptions.theme || currentTheme;
        const activeLineColor = lineColorPicker ? lineColorPicker.value : '#3b82f6';
        const computedStyle = getComputedStyle(root);
        
        // 프리뷰의 전체 테마 (배경, 글자색, 인용구, 코드 배경) + Heading Preset 변수 수집 목록
        const cssVarList = [
            '--preview-bg', '--preview-text', '--preview-heading', '--preview-border',
            '--preview-code-bg', '--preview-code-text', '--preview-blockquote-bg', '--preview-blockquote-text',
            '--h1-color', '--h1-size', '--h1-border',
            '--h2-color', '--h2-size', '--h2-border',
            '--h3-color', '--h3-size', '--h3-border',
            '--h4-color', '--h4-size', '--h4-border',
            '--h5-color', '--h5-size', '--h5-border',
            '--h6-color', '--h6-size', '--h6-border',
            '--link-color', '--link-decoration',
            '--bold-color', '--italic-color', '--inline-code-fg', '--custom-inline-code-bg',
            '--custom-code-block-bg', '--custom-code-block-fg',
            '--blockquote-text-color', '--blockquote-border-color',
            '--list-marker-color', '--list-item-gap',
            '--line-color', '--line-border',
            '--table-header-color', '--table-header-bg', '--table-header-border-bottom',
            '--table-row-bg', '--table-stripe-bg', '--table-hover-bg',
            '--table-border-color', '--table-border-style', '--table-cell-padding',
            '--table-vertical-align', '--table-row-border-bottom',
            '--preview-font-family', '--preview-font-size',
            '--preview-code-whitespace', '--preview-code-word-break'
        ];

        const styleVars = {};
        const previewEl = document.getElementById('preview');
        const previewComputedStyle = previewEl ? getComputedStyle(previewEl) : null;
        
        // 1. 현재 DOM computedStyle (root & previewEl)로부터 기본 스타일 수집
        cssVarList.forEach(varName => {
            let val = computedStyle.getPropertyValue(varName).trim();
            if (!val && previewComputedStyle) {
                val = previewComputedStyle.getPropertyValue(varName).trim();
            }
            if (!val && previewEl && previewEl.style) {
                val = previewEl.style.getPropertyValue(varName).trim();
            }
            if (val) styleVars[varName] = val;
        });

        // 메뉴바 fontSizeSelect & fontSelect 설정값을 수집에 확정 반영 (10pt == 100% 환산 반영)
        if (typeof fontSizeSelect !== 'undefined' && fontSizeSelect && fontSizeSelect.value) {
            styleVars['--preview-font-size'] = calc_scaled_font_size(fontSizeSelect.value, 10);
        }
        if (typeof fontSelect !== 'undefined' && fontSelect && fontSelect.value) {
            styleVars['--preview-font-family'] = fontSelect.value;
        }

        // 2. targetTheme가 현재 화면 테마와 다른 경우 (예: 다크 모드 화면에서 PDF 라이트 모드 출력)
        // 활성화된 Heading Preset을 targetTheme 기준으로 재계산하여 styleVars 덮어씀
        if (targetTheme !== currentTheme && typeof EditorManager !== 'undefined' && EditorManager.apply_heading_preset) {
            const activePresetId = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
            const presets = typeof getHeadingPresets === 'function' ? getHeadingPresets() : (window.StyleEditor ? window.StyleEditor.getDefaultPresets() : []);
            const foundPreset = presets.find(p => p.id === activePresetId) || presets[0];

            if (foundPreset && foundPreset.styles) {
                const tempEl = document.createElement('div');
                EditorManager.apply_heading_preset(tempEl, foundPreset.styles, targetTheme);
                
                // tempEl에 바인딩된 targetTheme 전용 스타일 변수로 styleVars 수집
                cssVarList.forEach(varName => {
                    const tempVal = tempEl.style.getPropertyValue(varName);
                    if (tempVal) {
                        styleVars[varName] = tempVal.trim();
                    }
                });
            }
        }

        // 3. targetTheme 폴백 보정
        if (targetTheme === 'light') {
            styleVars['--preview-bg'] = '#ffffff';
            styleVars['--preview-text'] = '#1f2937';
            styleVars['--preview-heading'] = styleVars['--h1-color'] || '#0f172a';
            styleVars['--preview-border'] = '#e2e8f0';
            styleVars['--preview-blockquote-bg'] = (styleVars['--preview-blockquote-bg'] && styleVars['--preview-blockquote-bg'] !== '#0f172a') ? styleVars['--preview-blockquote-bg'] : '#f9fafb';
            styleVars['--preview-blockquote-text'] = styleVars['--blockquote-text-color'] || '#475569';
            styleVars['--blockquote-text-color'] = styleVars['--blockquote-text-color'] || '#475569';
            styleVars['--preview-code-bg'] = '#f8fafc';
            styleVars['--preview-code-text'] = '#1e293b';
        } else if (targetTheme === 'dark') {
            styleVars['--preview-bg'] = '#1e293b';
            styleVars['--preview-text'] = '#f8fafc';
            styleVars['--preview-border'] = '#334155';
            styleVars['--preview-blockquote-bg'] = '#0f172a';
        }

        const isLimited = togglePreviewMaxWidthCheckbox ? togglePreviewMaxWidthCheckbox.checked : true;
        const isColorSwatchEnabled = colorSwatchCheckbox ? colorSwatchCheckbox.checked : true;

        return {
            theme: targetTheme,
            lineColor: activeLineColor,
            isMaxWidthLimited: isLimited,
            isColorSwatchEnabled: isColorSwatchEnabled,
            styleVars: styleVars
        };
    }

    if (btnExportHtml) {
        btnExportHtml.addEventListener('click', () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            const exportOptions = collectExportOptions();
            ExportManager.downloadPreviewHtml(preview, currentFilename, exportOptions);
        });
    }

    if (btnExportPdfPrint) {
        btnExportPdfPrint.addEventListener('click', async () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            
            // 1. 인쇄 시작 전 전역 하단 배너 노출 (닫기 버튼 제외)
            showGlobalBottomBanner('[인쇄창 설정 안내] 프린터:"PDF로 저장"선택, [기타 설정 더보기]/여백: "사용자 지정" 권장', false);

            // PDF 인쇄 전용 라이트 모드 옵션 수집 (theme: 'light' 강제)
            const exportOptions = collectExportOptions({ theme: 'light' });

            try {
                // 2. PDF 인쇄 대화 상자 실행
                await ExportManager.printToPdf(preview, currentFilename, exportOptions);
            } finally {
                // 3. 인쇄 창 닫히는 즉시 전역 배너 자동 닫기
                hideGlobalBottomBanner();
            }
        });
    }

    if (btnExportPdfHtml2Pdf) {
        btnExportPdfHtml2Pdf.addEventListener('click', () => {
            if (btnExportPdfHtml2Pdf.disabled) return;
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            const exportOptions = collectExportOptions();
            ExportManager.saveToPdfFile(preview, currentFilename, exportOptions);
        });
    }

    if (btnOpenNewWindow) {
        btnOpenNewWindow.addEventListener('click', () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            const exportOptions = collectExportOptions();
            ExportManager.openPreviewHtmlInNewWindow(preview, currentFilename, exportOptions);
        });
    }

    if (btnOpenNewWindowDefault) {
        btnOpenNewWindowDefault.addEventListener('click', () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            ExportManager.openDefaultPreviewHtmlInNewWindow(preview, currentFilename);
        });
    }

    // ==========================================================================
    // 문단 모으기 (Smart Paragraph Join) 기능 (EditorManager 위임)
    // ==========================================================================

    // 문단 모으기 버튼 클릭 이벤트 핸들러 바인딩
    if (btnJoinParagraphs) {
        btnJoinParagraphs.addEventListener('click', () => {
            EditorManager.apply_paragraph_join(cm, () => {
                renderMarkdown();
            });
        });
    }

    // ==========================================================================
    // Drag & Drop Markdown File Loading Logic
    // ==========================================================================
    
    // 브라우저 기본 드래그 앤 드롭 동작(새 탭에서 파일 열기) 전역 차단
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    }, false);
    window.addEventListener('drop', (e) => {
        e.preventDefault();
    }, false);

    const editorContainer = document.querySelector('.editor-container');
    let dragCounter = 0;

    editorContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            editorContainer.classList.add('drag-over');
        }
    });

    editorContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            editorContainer.classList.remove('drag-over');
        }
    });

    editorContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });



    // 마크다운/텍스트 파일을 로드하여 에디터에 적용하는 공통 함수
    function loadSingleFile(file) {
        if (!file) return;
        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();
        const allowedExtensions = ['md', 'markdown', 'txt', 'html', 'json'];
        
        if (allowedExtensions.includes(extension) || file.type.startsWith('text/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                cm.setValue(event.target.result);
                updateFilenameDisplay(file.name, false); // 새 파일 로드 및 파일명 적용
                add_recent_file_entry(file.name, file.path || file.webkitRelativePath || file.name, null, file.size);
                renderMarkdown();
                saveDocumentSession();
                
                // 에디터와 프리뷰 패널 스크롤 최상단으로 초기화
                cm.scrollTo(0, 0);
                const previewViewport = document.querySelector('.preview-viewport');
                if (previewViewport) {
                    previewViewport.scrollTop = 0;
                    previewViewport.scrollLeft = 0;
                }
            };
            reader.readAsText(file);
        } else {
            alert('불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 열어 주세요.');
        }
    }

    // 드래그 앤 드롭 파일 로딩 연동 (새 창/새 탭 구동)
    editorContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;
        editorContainer.classList.remove('drag-over');
        
        let targetFile = null;
        let targetHandle = null;

        // FileSystemAccess API: Drag & Drop 항목에서 FileHandle 추출 시도
        if (e.dataTransfer && e.dataTransfer.items) {
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'file' && typeof item.getAsFileSystemHandle === 'function') {
                    try {
                        const handle = await item.getAsFileSystemHandle();
                        if (handle && handle.kind === 'file') {
                            targetFile = await handle.getFile();
                            targetHandle = handle;
                            break;
                        }
                    } catch (err) {
                        console.warn('getAsFileSystemHandle 실패 fallback 진행:', err);
                    }
                }
            }
        }

        if (!targetFile && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            targetFile = e.dataTransfer.files[0];
        }

        if (targetFile) {
            const fileName = targetFile.name;
            const extension = fileName.split('.').pop().toLowerCase();
            const allowedExtensions = ['md', 'markdown', 'txt', 'html', 'json'];

            if (allowedExtensions.includes(extension) || targetFile.type.startsWith('text/')) {
                // 최근 파일 목록 및 IndexedDB에 저장
                add_recent_file_entry(targetFile.name, targetFile.path || targetFile.name, targetHandle, targetFile.size);

                const isFresh = isNewSessionSkippedRestore || (!isDirty && cm && cm.getValue().trim() === '' && !currentFileHandle);
                if (isFresh) {
                    currentFileHandle = targetHandle || null;
                    loadSingleFile(targetFile);
                    isNewSessionSkippedRestore = false;
                } else {
                    // 마우스 드롭 User Gesture 문맥 내에서 즉시 새 창 구동
                    const originUrl = new URL(window.location.origin + window.location.pathname);
                    originUrl.searchParams.set('openRecent', targetFile.name);
                    window.open(originUrl.toString(), '_blank');
                }
            } else {
                alert('불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 드롭해 주세요.');
            }
        }
    });

    // CodeMirror 내부 커서 위치 파일 텍스트 끼워넣기 이중 차단
    if (cm) {
        cm.on('drop', (cmInstance, e) => {
            e.preventDefault();
            if (typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
        });
    }

    // 숨김 파일 인풋 change 이벤트 연동 (md 불러오기)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                currentFileHandle = null;
                loadSingleFile(files[0]);
                // 다음 파일 로드를 위해 input 값 초기화
                fileInput.value = '';
            }
        });
    }

    // 새 마크다운 파일 초기화 비즈니스 로직
    function handleNewFile() {
        const url = new URL(window.location.origin + window.location.pathname);
        url.search = ''; // query parameter 초기화
        url.searchParams.set('new', '1');
        window.open(url.toString(), '_blank');
    }

    // ==========================================================================
    // 실시간 키프레임 디버깅 패널 렌더링 및 제어 함수 (FrameManager 위임)
    // ==========================================================================
    function updateDebugPanelUI(keyframesList, activeSource) {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.updateDebugPanel === 'function') {
            FrameManager.updateDebugPanel(keyframesList, activeSource);
        }
    }

    function toggle_debug_panel() {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.toggleDebugPanel === 'function') {
            FrameManager.toggleDebugPanel((isOpen) => {
                if (isOpen && scrollSync) {
                    scrollSync.rebuildKeyframes('Keyframe Button Toggle');
                }
            });
        }
    }

    function updateDebugPanel() {
        if (scrollSync) {
            updateDebugPanelUI(scrollSync.keyframes, scrollSync.activeScrollSource);
        }
    }

    // 에디터 텍스트 파싱을 통한 TOC 리스트 빌드 및 렌더링 (EditorManager.build_toc 위임)
    function buildTOC() {
        const tocList = document.getElementById('toc-list');
        if (!tocList || !cm) return;

        const text = cm.getValue();
        const headings = EditorManager.build_toc(text);

        tocList.innerHTML = '';
        headings.forEach(heading => {
            const li = document.createElement('li');
            li.className = `toc-item toc-h${heading.level}`;
            li.setAttribute('data-line', heading.line + 1);

            const a = document.createElement('a');
            a.href = '#';
            a.textContent = heading.text;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (scrollSync) {
                    scrollSync.scrollToLine(heading.line + 1);
                }
            });

            li.appendChild(a);
            tocList.appendChild(li);
        });
    }

    // ==========================================================================
    // 초기 렌더링 및 이벤트 등록 (Scroll Sync 초기화 지연 방지를 위해 가장 하단에 배치)
    // ==========================================================================
    // 탐색기 더블클릭 연동으로 로드되었는지 확인 및 적용
    if (!isNewSessionSkippedRestore && window.loadedFileContent && typeof window.loadedFileContent.content === 'string') {
        cm.setValue(window.loadedFileContent.content);
        updateFilenameDisplay(window.loadedFileContent.name, false);
    }

    // 에디터와 프리뷰 패널 너비를 동일하게 맞추는 초기화 함수
    function initializePanelWidths() {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0) return;
        
        // TOC 사이드바의 실제 점유 폭 계산
        const tocWidth = tocSidebar && !tocSidebar.classList.contains('collapsed') ? tocSidebar.getBoundingClientRect().width : 0;
        const dividerWidth = 6;
        const availableWidth = containerRect.width - tocWidth - dividerWidth;
        
        if (availableWidth <= 0) return;
        
        // 에디터와 프리뷰가 동일한 너비를 갖도록 설정
        const targetEditorWidth = availableWidth / 2;
        const percentage = (targetEditorWidth / containerRect.width) * 100;
        
        editorPanel.style.width = `${percentage}%`;
        cm.refresh();
    }

    // 복원할 저장 세션이 존재하는지 확인
    const hasSavedSession = !!localStorage.getItem(SESSION_STORAGE_KEY);

    // 저장된 세션 (문서 내용, 파일명, 에디터/Preview 분할 폭, 글꼴 등) 복원
    restoreDocumentSession();
    render_recent_files_menu();
    check_and_load_recent_url_param();

    // Trigger Initial Render
    renderMarkdown();
    updateDebugPanel();
    
    // 세션 복원된 분할 폭이 없을 경우에만 초기 동등 너비 설정 실행
    if (!hasSavedSession) {
        initializePanelWidths();
        window.addEventListener('load', initializePanelWidths);
    }

    // Auto Render & Auto Save Event
    cm.on('change', () => {
        updateFilenameDisplay(currentFilename, true);
        renderMarkdown();
        saveDocumentSession();
    });

    // 브라우저 새로고침(F5) 또는 창 닫기 직전 강제 세션 저장
    window.addEventListener('beforeunload', () => {
        saveDocumentSession();
    });
    // 수식 토글 변경 시 이벤트 바인딩
    if (mathRenderCheckbox) {
        mathRenderCheckbox.addEventListener('change', () => {
            enableMathSupport = mathRenderCheckbox.checked;
            renderMarkdown();
        });
    }

    // 다이어그램 토글 변경 시 이벤트 바인딩
    if (diagramRenderCheckbox) {
        diagramRenderCheckbox.addEventListener('change', () => {
            enableDiagramSupport = diagramRenderCheckbox.checked;
            renderMarkdown();
        });
    }

    // Color 스와치 토글 변경 시 이벤트 바인딩
    if (colorSwatchCheckbox) {
        colorSwatchCheckbox.addEventListener('change', () => {
            if (colorSwatchCheckbox.checked) {
                inject_color_swatches(document, preview);
            } else {
                remove_color_swatches(preview);
            }
            saveDocumentSession();
        });
    }

    // 스크롤 동기화 토글 변경 시 이벤트 바인딩
    if (scrollSyncCheckbox) {
        scrollSyncCheckbox.addEventListener('change', () => {
            enableScrollSync = scrollSyncCheckbox.checked;
            if (scrollSync) {
                scrollSync.setEnable(enableScrollSync);
                if (enableScrollSync && typeof scrollSync.syncPreviewToCursor === 'function') {
                    scrollSync.syncPreviewToCursor();
                }
            }
            saveDocumentSession();
        });
    }

    const SAVE_SECURITY_NOTICE = '[App] 브라우저 보안사항으로 파일 접근 권한에 대한 확인창이 뜰 수 있습니다. ';

    function triggerSaveSecurityNotice() {
        showGlobalBottomBanner(SAVE_SECURITY_NOTICE, false);
    }

    function dismissSaveSecurityNoticeDelayed(delayMs = 1000) {
        setTimeout(() => {
            hideGlobalBottomBanner();
        }, delayMs);
    }

    // 새이름저장 (Save As 다이얼로그) 헬퍼 함수
    function handleSaveCurrentDocument() {
        if (!cm) return;
        triggerSaveSecurityNotice();
        const textContent = cm.getValue();
        ExportManager.downloadCurrentContent(textContent, currentFilename, (savedName, handle) => {
            if (handle) {
                currentFileHandle = handle; // 새로 지정된 저장 파일 핸들 갱신
            }
            updateFilenameDisplay(savedName, false);
            saveDocumentSession();
            showToast(`"${savedName}" 파일이 저장되었습니다.`);
            dismissSaveSecurityNoticeDelayed(1000); // 저장 완료 1초 후 배너 숨김
        });
    }

    // [저장] 버튼: 직접 덮어쓰기 저장 (Direct Overwrite) 헬퍼 함수
    async function handleSaveDirect() {
        if (!cm) return;
        triggerSaveSecurityNotice();
        const textContent = cm.getValue();

        // 1. 파일 핸들이 존재하는 경우 탐색기 팝업 없이 원본 파일에 직접 덮어쓰기
        if (currentFileHandle) {
            try {
                // 쓰기 권한 점검 및 요청
                if (typeof currentFileHandle.queryPermission === 'function') {
                    let perm = await currentFileHandle.queryPermission({ mode: 'readwrite' });
                    if (perm !== 'granted') {
                        perm = await currentFileHandle.requestPermission({ mode: 'readwrite' });
                    }
                    if (perm !== 'granted') {
                        showToast('파일 쓰기 권한이 거부되었습니다.');
                        dismissSaveSecurityNoticeDelayed(1000);
                        return;
                    }
                }

                const writable = await currentFileHandle.createWritable();
                await writable.write(textContent);
                await writable.close();

                updateFilenameDisplay(currentFileHandle.name, false);
                saveDocumentSession();
                showToast(`"${currentFileHandle.name}" 파일에 직접 저장되었습니다.`);
                dismissSaveSecurityNoticeDelayed(1000); // 저장 완료 1초 후 배너 숨김
                return;
            } catch (err) {
                console.warn('직접 덮어쓰기 저장 실패, SaveAs 다이얼로그로 fallback 진행:', err);
                dismissSaveSecurityNoticeDelayed(1000);
            }
        }

        // 2. 파일 핸들이 없거나(새 파일 등) 덮어쓰기 실패 시 SaveAs 다이얼로그로 fallback
        handleSaveCurrentDocument();
    }

    // 저장([저장]: 직접 덮어쓰기) 및 새이름저장([새이름저장]: SaveAs 다이얼로그) 버튼 클릭 이벤트 바인딩
    if (btnSave) {
        btnSave.addEventListener('click', handleSaveDirect);
    }
    if (btnSaveAs) {
        btnSaveAs.addEventListener('click', () => {
            if (mainMenu) mainMenu.classList.remove('show');
            handleSaveCurrentDocument();
        });
    }

    // 설정 모달 및 브라우저 레지스트리 다운로드 초기화 (SettingsManager 위임)
    if (typeof SettingsManager !== 'undefined') {
        SettingsManager.init();
    }

    // TOC 사이드바 토글 관련 이벤트 바인딩
    if (btnTocToggleInner && tocSidebar) {
        btnTocToggleInner.addEventListener('click', () => {
            tocSidebar.classList.add('collapsed');
            btnTocToggleInner.setAttribute('aria-expanded', 'false');
            if (tocToggleBar) {
                tocToggleBar.setAttribute('aria-expanded', 'false');
            }
        });
        btnTocToggleInner.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                btnTocToggleInner.click();
            }
        });
    }

    if (tocToggleBar && tocSidebar) {
        tocToggleBar.addEventListener('click', () => {
            tocSidebar.classList.remove('collapsed');
            if (btnTocToggleInner) {
                btnTocToggleInner.setAttribute('aria-expanded', 'true');
            }
            tocToggleBar.setAttribute('aria-expanded', 'true');
        });
        tocToggleBar.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                tocToggleBar.click();
            }
        });
    }
    // Heading Modal & Toast Control System
    // Style 편집 Dialog 전용 DOM 요소 묶음 구조체 (styleDialogElements)
    const styleDialogElements = {
        btnEditHeadingStyle: document.getElementById('btn-edit-heading-style'),
        modalHeadingSelect: document.getElementById('modal-heading-preset-select'),
        headingStyleControls: document.getElementById('heading-style-controls'),
        headingPresetSelect: document.getElementById('heading-preset-select')
    };

    function showToast(message, duration = 3000) {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.showToast === 'function') {
            FrameManager.showToast(message, duration);
        }
    }

    function renderHeadingModalControls(presetId) {
        if (window.StyleEditor) {
            window.StyleEditor.renderControls(presetId);
        }
    }

    if (styleDialogElements.btnEditHeadingStyle) {
        styleDialogElements.btnEditHeadingStyle.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            if (viewMenu) viewMenu.classList.remove('show');
            if (exportMenu) exportMenu.classList.remove('show');
            if (mainMenu) mainMenu.classList.remove('show');
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
            
            // 스타일 편집 Dialog를 띄울 때 신규 프리셋이 누락되었는지 검사하여 추가
            syncNewHeadingPresets();
            
            updatePresetSelectOptions();
            const currentActive = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
            if (styleDialogElements.modalHeadingSelect) styleDialogElements.modalHeadingSelect.value = currentActive;
            if (window.StyleEditor && typeof window.StyleEditor.openModal === 'function') {
                window.StyleEditor.openModal(currentActive);
            }
        });
    }

    function closeHeadingStyleModal() {
        if (window.StyleEditor && typeof window.StyleEditor.closeModal === 'function') {
            window.StyleEditor.closeModal();
        } else {
            const headingModal = document.getElementById('heading-modal');
            if (headingModal) headingModal.style.display = 'none';
        }
    }

    if (styleDialogElements.headingPresetSelect) {
        styleDialogElements.headingPresetSelect.addEventListener('change', (e) => {
            applyHeadingPreset(e.target.value);
            renderMarkdown();
        });
    }

    if (styleDialogElements.modalHeadingSelect) {
        styleDialogElements.modalHeadingSelect.addEventListener('change', (e) => {
            renderHeadingModalControls(e.target.value);
            applyHeadingPreset(e.target.value);
            renderMarkdown();
        });
    }

    // ==========================================================================
    // 🎨 [x] / [v] 버튼 탑재 Canvas 기반 전문 커스텀 컬러피커 팝오버 모듈
    // ==========================================================================
    // ==========================================================================
    // 🎨 [style-editor.js] 연계 커스텀 컬러피커 및 스타일 다이얼로그 초기 바인딩
    // ==========================================================================
    // ==========================================================================
    // 🎨 스타일 편집 다이얼로그 콜백 핸들러 리액티브 명명 함수 정의 (리팩토링)
    // ==========================================================================
    function handlePresetChange(presetId) {
        applyHeadingPreset(presetId);
    }

    function handleLivePreview() {
        const currentId = styleDialogElements.modalHeadingSelect ? styleDialogElements.modalHeadingSelect.value : 'github_classic';
        const tempStyles = window.StyleEditor ? window.StyleEditor.collectCurrentInputs() : null;
        applyHeadingPreset(currentId, tempStyles);
    }

    function handleModalScroll(clientX, deltaY) {
        const dragDivider = document.getElementById('drag-divider');
        const boundaryX = dragDivider 
            ? dragDivider.getBoundingClientRect().left 
            : window.innerWidth / 2;
            
        if (clientX < boundaryX) {
            if (typeof cm !== 'undefined' && cm) {
                const scrollInfo = cm.getScrollInfo();
                cm.scrollTo(null, scrollInfo.top + deltaY);
            }
        } else {
            const previewViewport = document.querySelector('.preview-viewport');
            if (previewViewport) {
                previewViewport.scrollTop += deltaY;
            }
        }
    }

    function handlePresetSave(presetName) {
        const currentId = styleDialogElements.modalHeadingSelect ? styleDialogElements.modalHeadingSelect.value : 'github_classic';
        applyHeadingPreset(currentId);
        showToast(`'${presetName}' 스타일이 저장되었습니다.`);
    }

    function handlePresetSaveAndClose(presetName) {
        closeHeadingStyleModal();
        const currentId = styleDialogElements.modalHeadingSelect ? styleDialogElements.modalHeadingSelect.value : 'github_classic';
        applyHeadingPreset(currentId);
        
        // 모달 닫기 후 에디터 활성화 복원 및 리프레시 보장
        if (typeof cm !== 'undefined' && cm) {
            cm.focus();
            requestAnimationFrame(() => {
                cm.refresh();
            });
        }
        
        showToast(`'${presetName}' 스타일이 적용되었습니다.`);
    }

    function handlePresetAdd(newId, newName) {
        updatePresetSelectOptions();
        applyHeadingPreset(newId);
        renderHeadingModalControls(newId);
        showToast(`'${newName}' 스타일이 생성되었습니다.`);
    }

    function handlePresetDelete(nextId, deletedName) {
        updatePresetSelectOptions();
        applyHeadingPreset(nextId);
        renderHeadingModalControls(nextId);
        showToast(`'${deletedName}' 스타일이 삭제되었습니다.`);
    }

    function handlePresetReset(presetId, presetName) {
        applyHeadingPreset(presetId);
        renderHeadingModalControls(presetId);
        showToast(`'${presetName}' 스타일이 초기 기본값으로 복원되었습니다.`);
    }

    if (window.StyleEditor) {
        window.StyleEditor.init({
            elements: styleDialogElements,
            controlsContainer: styleDialogElements.headingStyleControls,
            presetSelect: styleDialogElements.modalHeadingSelect,
            getPresetsData: getHeadingPresets,      // ◄ 1:1 함수 참조 매핑
            savePresetsData: saveHeadingPresets,    // ◄ 1:1 함수 참조 매핑
            onPresetChange: handlePresetChange,
            onLivePreview: handleLivePreview,
            onScroll: handleModalScroll,
            onSave: handlePresetSave,
            onSaveAndClose: handlePresetSaveAndClose,
            onAddPreset: handlePresetAdd,
            onDeletePreset: handlePresetDelete,
            onResetPreset: handlePresetReset
        });
    }

    // 문서 시작 시 Heading Preset 초기화
    updatePresetSelectOptions();
    const activePreset = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
    applyHeadingPreset(activePreset);

    // ScrollSync 인스턴스 생성 및 초기화 (최하단 배치)
    scrollSync = new ScrollSync({
        cm: cm,
        previewViewport: document.querySelector('.preview-viewport'),
        previewContainer: preview,
        enableScrollSync: enableScrollSync,
        onActiveLineChange: (lineNum) => {
            const tocItems = document.querySelectorAll('.toc-item');
            tocItems.forEach(item => {
                if (parseInt(item.getAttribute('data-line'), 10) === lineNum) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        },
        onDebugUpdate: (keyframes, activeSource) => {
            updateDebugPanelUI(keyframes, activeSource);
        },
        onToast: (msg) => {
            if (typeof showToast === 'function') {
                showToast(msg, 2000);
            }
        }
    });
    scrollSync.init();
    if (cm && typeof cm.refresh === 'function') {
        cm.refresh();
    }

    // 폰트, 이미지 등 전역 렌더링 완료 후 키프레임 보장 재구축 (load 트리거 Stage 3)
    window.addEventListener('load', () => {
        if (scrollSync) {
            scrollSync.rebuildKeyframes('Stage 3: window.onload');
        }
    });

    // 100ms 비동기 페인트 후 안전 재구축 (Stage 2)
    setTimeout(() => {
        if (scrollSync) {
            scrollSync.rebuildKeyframes('Stage 2: setTimeout 100ms');
        }
    }, 100);
});



