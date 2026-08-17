/**
 * frame-man.js - 레이아웃 프레임 및 메뉴 UI 제어 전용 서브 모듈
 * 
 * 주요 담당 기능:
 * 1. 테마(Dark/Light) UI 적용 및 아이콘/텍스트 토글
 * 2. 패널 드래그 리사이징 (Editor <-> Preview Splitter)
 * 3. 메뉴 드롭다운 UI 팝업 열기/닫기 및 바깥 영역 클릭 시 자동 숨김
 * 4. 메뉴 버튼과 비즈니스 로직 콜백 연결
 */

(function(window) {
    'use strict';

    function assert_arg(condition, message, context = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            return window.assert_arg(condition, message, context);
        }
        if (!condition) console.error(`[System Warning] ${message}`, context);
        return !!condition;
    }

    const RECENT_FILES_KEY = 'markvi_recent_files';
    const IDB_NAME = 'markvi_recent_db';
    const IDB_STORE = 'handles';

    let options = {
        elements: {},
        actions: {}
    };

    let isDragging = false;

    // ==========================================================================
    // 순수 서브 함수 (Pure Sub-functions in snake_case)
    // ==========================================================================

    /**
     * 매개변수(Argument) 및 상태 검증 전용 단증 서브 함수 (assert_arg)
     * 단증 실패 시 최상단 System Warning 디버깅 배너를 노출하고 에러 로그를 누적 기록합니다.
     * 
     * @param {boolean} condition - 검증 조건식 (true이어야 정상)
     * @param {string} message - 단증 실패 시 표시할 시스템 경고 문구
     * @param {Object} [context={}] - 트러블슈팅용 부가 정보
     * @returns {boolean}
     */
    function assert_arg(condition, message, context = {}) {
        if (!condition) {
            const fullMessage = `[System Assertion Failed] ${message}`;
            console.error(fullMessage, context);

            // 1. 최상단 System Warning 디버깅 배너 출력
            report_system_theme_error(fullMessage);

            // 2. Error Log 스토리지 및 누적 기록 (로그 파일 연동용)
            try {
                if (typeof localStorage !== 'undefined') {
                    const rawLogs = localStorage.getItem('markvi_error_logs');
                    const logs = rawLogs ? JSON.parse(rawLogs) : [];
                    const newLog = {
                        timestamp: new Date().toISOString(),
                        type: 'ASSERTION_FAILURE',
                        message: fullMessage,
                        context: context,
                        stack: new Error(fullMessage).stack
                    };
                    logs.unshift(newLog);
                    if (logs.length > 50) logs.length = 50;
                    localStorage.setItem('markvi_error_logs', JSON.stringify(logs));
                }
            } catch (e) {
                console.warn('Failed to record assertion log to localStorage:', e);
            }

            // 3. 디버그 환경 시 Fail-Fast를 위한 Error throw
            if (typeof window !== 'undefined' && window.ENABLE_DEBUG_HANDLER !== false) {
                throw new Error(fullMessage);
            }
            return false;
        }
        return true;
    }

    if (typeof window !== 'undefined') {
        window.assert_arg = assert_arg;
    }

    function report_system_theme_error(message) {
        console.error('[FrameManager System Error]', message);
        if (typeof document === 'undefined') return;
        let banner = document.getElementById('system-theme-warning-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'system-theme-warning-banner';
            banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; background: #dc2626; color: #ffffff; z-index: 999999; padding: 10px 16px; font-size: 13px; font-weight: 700; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: space-between;';
            document.body.appendChild(banner);
        }
        banner.innerHTML = `<span>🚨 ${message}</span><button style="background:transparent;border:none;color:#fff;font-weight:bold;cursor:pointer;padding:0 8px;" onclick="this.parentElement.remove()">✕</button>`;
    }

    /**
     * 순수 하위 서브 함수: DOM 프레임 및 메뉴 UI 엘리먼트들을 자율 탐색 및 쿼리합니다.
     */
    function get_default_elements() {
        if (typeof document === 'undefined') return {};
        const els = {
            container: document.getElementById('container') || document.querySelector('.container'),
            editorPanel: document.getElementById('editor-panel'),
            dragDivider: document.getElementById('drag-divider'),
            preview: document.getElementById('preview'),
            previewViewport: document.querySelector('.preview-viewport'),

            fileBadge: document.getElementById('file-badge'),
            filenameSpan: document.getElementById('current-filename'),

            btnThemeToggle: document.getElementById('btn-theme-toggle'),
            themeIconSun: document.querySelector('.theme-icon-sun'),
            themeIconMoon: document.querySelector('.theme-icon-moon'),
            themeToggleText: document.getElementById('theme-toggle-text'),

            fontSelect: document.getElementById('font-select'),
            fontSizeSelect: document.getElementById('font-size-select'),
            lineColorPicker: document.getElementById('line-color-picker'),
            scrollSyncCheckbox: document.getElementById('scroll-sync'),
            colorSwatchCheckbox: document.getElementById('color-swatch-toggle'),
            togglePreviewMaxWidthCheckbox: document.getElementById('toggle-preview-max-width'),
            previewMaxWidthWrapper: document.getElementById('preview-max-width-wrapper'),
            codeblockScrollCheckbox: document.getElementById('codeblock-scroll'),
            codeblockScrollWrapper: document.getElementById('codeblock-scroll-wrapper'),
            mathRenderCheckbox: document.getElementById('math-render'),
            mathRenderWrapper: document.getElementById('math-render-wrapper'),
            diagramRenderCheckbox: document.getElementById('diagram-render'),
            diagramRenderWrapper: document.getElementById('diagram-render-wrapper'),
            colorSwatchWrapper: document.getElementById('color-swatch-wrapper'),

            menuDropdown: document.getElementById('menu-dropdown'),
            btnMenu: document.getElementById('btn-menu'),
            mainMenu: document.getElementById('main-menu'),
            btnNewFile: document.getElementById('btn-new-file'),
            btnOpenFile: document.getElementById('btn-open-file'),
            fileInput: document.getElementById('file-input'),

            viewDropdown: document.getElementById('view-dropdown'),
            btnView: document.getElementById('btn-view'),
            viewMenu: document.getElementById('view-menu'),

            headingDropdown: document.getElementById('heading-dropdown'),
            btnHeadingStyle: document.getElementById('btn-heading-style'),
            headingStyleMenu: document.getElementById('heading-style-menu'),
            btnEditHeadingStyle: document.getElementById('btn-edit-heading-style'),
            headingPresetSelect: document.getElementById('heading-preset-select'),

            exportDropdown: document.getElementById('export-dropdown'),
            btnExport: document.getElementById('btn-export'),
            exportMenu: document.getElementById('export-menu'),
            btnExportHtml: document.getElementById('btn-export-html'),
            btnExportPdfPrint: document.getElementById('btn-export-pdf-print'),
            btnExportPdfHtml2Pdf: document.getElementById('btn-export-pdf-html2pdf'),
            btnOpenNewWindow: document.getElementById('btn-open-new-window'),
            btnOpenNewWindowDefault: document.getElementById('btn-open-new-window-default'),

            btnCopy: document.getElementById('btn-copy'),
            btnSave: document.getElementById('btn-save'),
            btnSaveAs: document.getElementById('btn-save-as'),
            btnJoinParagraphs: document.getElementById('btn-join-paragraphs'),
            btnDebug: document.getElementById('btn-debug'),

            // TOC Elements
            tocSidebar: document.getElementById('toc-sidebar'),
            tocList: document.getElementById('toc-list'),
            btnTocToggleInner: document.getElementById('btn-toc-toggle-inner'),
            tocToggleBar: document.getElementById('toc-toggle-bar')
        };
        assert_arg(els.container && els.preview, 'Core DOM elements container and preview must exist in get_default_elements!', { container: els.container, preview: els.preview });
        return els;
    }

    function apply_theme_ui(theme, elements, onThemeChange) {
        const targetTheme = (theme === 'light' || theme === 'dark') ? theme : 'dark';
        
        if (elements && elements.container) {
            elements.container.setAttribute('data-editor-theme', targetTheme);
        } else if (typeof document !== 'undefined') {
            const containerEl = document.querySelector('.container');
            if (containerEl) {
                containerEl.setAttribute('data-editor-theme', targetTheme);
            }
        }

        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-editor-theme', targetTheme);
        }

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('markvi_editor_theme', targetTheme);
            }
        } catch (e) {
            console.warn('Failed to save theme to localStorage:', e);
        }

        if (targetTheme === 'dark') {
            if (elements && elements.themeIconSun) elements.themeIconSun.style.display = 'none';
            if (elements && elements.themeIconMoon) elements.themeIconMoon.style.display = 'inline-block';
            if (elements && elements.themeToggleText) elements.themeToggleText.textContent = 'Dark';
        } else {
            if (elements && elements.themeIconSun) elements.themeIconSun.style.display = 'inline-block';
            if (elements && elements.themeIconMoon) elements.themeIconMoon.style.display = 'none';
            if (elements && elements.themeToggleText) elements.themeToggleText.textContent = 'Light';
        }

        if (typeof onThemeChange === 'function') {
            onThemeChange(targetTheme);
        }
    }

    function init_theme_ui(elements, onThemeChange) {
        let savedTheme = null;
        try {
            if (typeof localStorage !== 'undefined') {
                savedTheme = localStorage.getItem('markvi_editor_theme');
            }
        } catch (e) {
            console.warn('Failed to read theme from localStorage:', e);
        }

        // 테마 확정 (Pre-determination before Frame/Editor/Preview rendering)
        // 저장된 테마가 없으면 초기 기본값 'dark'로 명시적 확정
        const deterministicTheme = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';

        // DOM 컨테이너 단증 검증
        const container = (elements && elements.container) || (typeof document !== 'undefined' ? document.querySelector('.container') : null);
        assert_arg(container || typeof document === 'undefined', 'Frame Container element (.container) missing during pre-rendering theme initialization!', { elements });

        // 테마 확정 적용
        apply_theme_ui(deterministicTheme, elements, onThemeChange);

        // 검증: DOM 속성 확정 여부 단증 확인
        const currentAttr = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement.getAttribute('data-editor-theme') : null;
        assert_arg(currentAttr, 'Structural Theme Error! data-editor-theme attribute was not established prior to rendering!', { deterministicTheme });
    }

    function close_all_dropdowns(elements) {
        if (!elements) return;
        const menus = [elements.exportMenu, elements.viewMenu, elements.headingStyleMenu, elements.mainMenu];
        menus.forEach(menu => {
            if (menu && menu.classList) {
                menu.classList.remove('show');
            }
        });
    }

    function toggle_dropdown_menu(menuEl, allElements) {
        if (!menuEl) return;
        const isShow = menuEl.classList.contains('show');
        close_all_dropdowns(allElements);
        if (!isShow) {
            menuEl.classList.add('show');
        }
    }

    function setup_outside_click_dismissal(elements) {
        if (!elements || elements._outsideDismissalBound || typeof document === 'undefined') return;
        elements._outsideDismissalBound = true;

        document.addEventListener('click', (e) => {
            if (elements.exportDropdown && !elements.exportDropdown.contains(e.target)) {
                if (elements.exportMenu) elements.exportMenu.classList.remove('show');
            }
            if (elements.viewDropdown && !elements.viewDropdown.contains(e.target)) {
                if (elements.viewMenu) elements.viewMenu.classList.remove('show');
            }
            if (elements.menuDropdown && !elements.menuDropdown.contains(e.target)) {
                if (elements.mainMenu) elements.mainMenu.classList.remove('show');
            }
            if (elements.headingDropdown && !elements.headingDropdown.contains(e.target)) {
                if (elements.headingStyleMenu) elements.headingStyleMenu.classList.remove('show');
            }
        });
    }

    function calculate_split_percentage(clientX, containerEl, editorPanelEl) {
        if (!containerEl || !editorPanelEl) return 50;
        
        const containerRect = containerEl.getBoundingClientRect();
        const tocSidebar = typeof document !== 'undefined' ? document.getElementById('toc-sidebar') : null;
        const tocWidth = tocSidebar && !tocSidebar.classList.contains('collapsed') ? tocSidebar.getBoundingClientRect().width : 0;
        
        const relativeX = clientX - containerRect.left - tocWidth;
        const availableWidth = containerRect.width - tocWidth;
        
        let percentageOfAvailable = availableWidth > 0 ? (relativeX / availableWidth) * 100 : 50;
        if (percentageOfAvailable < 20) percentageOfAvailable = 20;
        if (percentageOfAvailable > 80) percentageOfAvailable = 80;
        
        const targetEditorWidth = (percentageOfAvailable / 100) * availableWidth;
        let percentage = (targetEditorWidth / containerRect.width) * 100;
        return percentage;
    }

    function start_drag(e, dragDividerEl) {
        isDragging = true;
        if (dragDividerEl) dragDividerEl.classList.add('dragging');
        if (typeof document !== 'undefined' && document.body) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
    }

    function drag_move(e, containerEl, editorPanelEl, onPanelResize) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percentage = calculate_split_percentage(clientX, containerEl, editorPanelEl);
        if (editorPanelEl) {
            editorPanelEl.style.width = `${percentage}%`;
        }
        if (typeof onPanelResize === 'function') {
            onPanelResize(percentage);
        }
    }

    function stop_drag(dragDividerEl, onResizeComplete) {
        if (!isDragging) return;
        isDragging = false;
        if (dragDividerEl) dragDividerEl.classList.remove('dragging');
        if (typeof document !== 'undefined' && document.body) {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        if (typeof onResizeComplete === 'function') {
            onResizeComplete();
        }
    }

    function setup_splitter_events(elements, actions) {
        if (!elements || elements._splitterBound) return;
        const { dragDivider, container, editorPanel } = elements;
        if (!dragDivider || typeof document === 'undefined') return;
        elements._splitterBound = true;

        const handleMove = (e) => drag_move(e, container, editorPanel, actions.onPanelResize);
        const handleStop = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleStop);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleStop);
            stop_drag(dragDivider, actions.onResizeComplete);
        };

        const handleStart = (e) => {
            start_drag(e, dragDivider);
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleStop);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleStop);
        };

        dragDivider.addEventListener('mousedown', handleStart);
        dragDivider.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleStart(e);
        });
    }

    function setup_menu_toggles(elements) {
        if (!elements || elements._menuTogglesBound) return;
        elements._menuTogglesBound = true;

        if (elements.btnExport) {
            elements.btnExport.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.exportMenu, elements);
            });
        }
        if (elements.btnView) {
            elements.btnView.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.viewMenu, elements);
            });
        }
        if (elements.btnHeadingStyle) {
            elements.btnHeadingStyle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.headingStyleMenu, elements);
            });
        }
        if (elements.btnMenu) {
            elements.btnMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.mainMenu, elements);
            });
        }
    }

    function setup_button_actions(elements, actions) {
        if (!elements || !actions || elements._buttonActionsBound) return;
        elements._buttonActionsBound = true;

        // Theme Toggle Button
        if (elements.btnThemeToggle) {
            elements.btnThemeToggle.addEventListener('click', () => {
                let currentTheme = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement.getAttribute('data-editor-theme') : null;
                if (!currentTheme && elements.container) {
                    currentTheme = elements.container.getAttribute('data-editor-theme');
                }
                
                // 구조적 문제 감지: 테마 속성이 DOM에 확정되어 있지 않은 경우 System Warning 및 에러 로그 기록
                if (!assert_arg(currentTheme, 'Theme state missing on DOM! data-editor-theme attribute was uninitialized prior to toggle click.', { elements })) {
                    currentTheme = 'dark';
                }

                const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
                apply_theme_ui(newTheme, elements, actions.onThemeChange);
            });
        }

        // Action Buttons with Auto Dropdown Close
        const actionBindings = [
            { el: elements.btnNewFile, action: actions.onNewFile },
            { el: elements.btnOpenFile, action: actions.onOpenFile },
            { el: elements.btnCopy, action: actions.onCopy },
            { el: elements.btnSave, action: actions.onSave },
            { el: elements.btnSaveAs, action: actions.onSaveAs },
            { el: elements.btnExportHtml, action: actions.onExportHtml },
            { el: elements.btnExportPdfPrint, action: actions.onExportPdfPrint },
            { el: elements.btnExportPdfHtml2Pdf, action: actions.onExportPdfHtml2Pdf },
            { el: elements.btnOpenNewWindow, action: actions.onOpenNewWindow },
            { el: elements.btnOpenNewWindowDefault, action: actions.onOpenNewWindowDefault },
            { el: elements.btnJoinParagraphs, action: actions.onJoinParagraphs },
            { el: elements.btnDebug, action: actions.onToggleDebug }
        ];

        actionBindings.forEach(binding => {
            if (binding.el && typeof binding.action === 'function') {
                binding.el.addEventListener('click', (e) => {
                    close_all_dropdowns(elements);
                    binding.action(e);
                });
            }
        });
    }

    function update_filename_display_ui(name, isModified, elements) {
        if (!name) return;
        const filenameSpan = (elements && elements.filenameSpan) || (typeof document !== 'undefined' ? document.getElementById('current-filename') : null);
        const fileBadge = (elements && elements.fileBadge) || (typeof document !== 'undefined' ? document.getElementById('file-badge') : null);
        
        if (filenameSpan && fileBadge) {
            filenameSpan.textContent = isModified ? `${name} *` : name;
            if (isModified) {
                fileBadge.classList.add('modified');
                fileBadge.title = "현재 파일 (수정됨)";
            } else {
                fileBadge.classList.remove('modified');
                fileBadge.title = "현재 파일";
            }
        }
        if (typeof document !== 'undefined') {
            document.title = isModified ? `* ${name} - MarkVi` : `${name} - MarkVi`;
        }
    }

    function format_file_size(bytes) {
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 KB';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function format_recent_time(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '';
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }

    function render_recent_files_ui(files, elements, onSelectFile) {
        if (typeof document === 'undefined') return;
        if (files !== undefined && files !== null) {
            if (!assert_arg(Array.isArray(files), 'render_recent_files_ui: files parameter must be an array', { files })) {
                return;
            }
        }
        if (onSelectFile !== undefined && onSelectFile !== null) {
            if (!assert_arg(typeof onSelectFile === 'function', 'render_recent_files_ui: onSelectFile must be a function', { onSelectFile })) {
                return;
            }
        }
        const wrapperEl = (elements && elements.recentFilesWrapper) || document.getElementById('recent-files-wrapper');
        const submenuEl = (elements && elements.recentFilesSubmenu) || document.getElementById('recent-files-submenu');
        if (!submenuEl) return;
        if (wrapperEl) wrapperEl.style.display = 'block';

        if (!files || files.length === 0) {
            submenuEl.innerHTML = '<div class="dropdown-submenu-empty">최근 파일이 없습니다.</div>';
            return;
        }

        submenuEl.innerHTML = '';
        files.forEach((entry) => {
            const itemBtn = document.createElement('button');
            itemBtn.className = 'recent-file-item';
            const timeStr = format_recent_time(entry.timestamp);
            const sizeStr = format_file_size(entry.size);
            const metaText = timeStr ? `${timeStr} · ${sizeStr}` : sizeStr;

            itemBtn.title = `${entry.name}\n작업 일시: ${timeStr}\n크기: ${sizeStr}\n클릭 시 파일 열기`;
            itemBtn.innerHTML = `
                <div class="recent-file-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>${entry.name}</span>
                </div>
                <div class="recent-file-path">${metaText}</div>
            `;
            itemBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                close_all_dropdowns(elements);
                if (typeof onSelectFile === 'function') {
                    onSelectFile(entry);
                }
            });
            submenuEl.appendChild(itemBtn);
        });
    }

    // ==========================================================================
    // Recent Files Management Sub-functions (snake_case)
    // ==========================================================================

    function init_recent_db() {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
            const req = window.indexedDB.open(IDB_NAME, 1);
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
        if (!assert_arg(typeof name === 'string' && name.trim().length > 0, 'save_handle_to_idb: name parameter must be a non-empty string', { name })) {
            return;
        }
        if (!assert_arg(handle && typeof handle === 'object', 'save_handle_to_idb: handle parameter must be a valid object', { handle })) {
            return;
        }
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
        if (!assert_arg(typeof name === 'string' && name.trim().length > 0, 'get_handle_from_idb: name parameter must be a non-empty string', { name })) {
            return null;
        }
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

    function get_recent_files() {
        try {
            if (typeof localStorage === 'undefined') return [];
            const raw = localStorage.getItem(RECENT_FILES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to parse recent files:', e);
            return [];
        }
    }

    function save_recent_files(files) {
        if (!assert_arg(Array.isArray(files), 'save_recent_files: files parameter must be an Array', { files })) {
            return;
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
            }
        } catch (e) {
            console.warn('Failed to save recent files:', e);
        }
    }

    function add_recent_file_entry(name, fullPath, handle = null, size = 0) {
        if (!assert_arg(typeof name === 'string' && name.trim().length > 0, 'add_recent_file_entry: name parameter must be a non-empty string', { name })) {
            return;
        }
        if (size !== undefined && size !== null) {
            if (!assert_arg(typeof size === 'number' && !isNaN(size) && size >= 0, 'add_recent_file_entry: size parameter must be a non-negative number', { size })) {
                return;
            }
        }
        if (name === '제목 없음.md') return;

        const pathToSave = fullPath || name;
        let files = get_recent_files();
        files = files.filter(f => f.fullPath !== pathToSave && f.name !== name);
        
        let contentSize = size;
        if (!contentSize && typeof window !== 'undefined' && window.cm) {
            try {
                contentSize = new Blob([window.cm.getValue()]).size;
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
        const selectCb = (options.actions && typeof options.actions.onSelectRecentFile === 'function')
            ? options.actions.onSelectRecentFile
            : ((entry) => open_recent_file_in_new_window(entry));
        render_recent_files_ui(files, options.elements, selectCb);
    }

    async function open_recent_file_in_new_window(fileEntry) {
        if (!assert_arg(fileEntry && typeof fileEntry === 'object' && typeof fileEntry.name === 'string', 'open_recent_file_in_new_window: fileEntry must be an object with name property', { fileEntry })) {
            return;
        }
        
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
        if (!hasValidHandle && typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
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
            if (options.actions && typeof options.actions.isFreshWindow === 'function') {
                return options.actions.isFreshWindow();
            }
            if (typeof window !== 'undefined') {
                const isNewSessionSkippedRestore = !!window.isNewSessionSkippedRestore;
                const isDirty = !!window.isDirty;
                const cm = window.cm;
                const currentFileHandle = window.currentFileHandle;
                return isNewSessionSkippedRestore || (!isDirty && cm && cm.getValue().trim() === '' && !currentFileHandle);
            }
            return false;
        }

        // 새 창 막 열린 상태/깨끗한 상태라면 현재 창에 불러오기
        if (isFreshWindow()) {
            if (hasValidHandle && handle) {
                try {
                    const file = await handle.getFile();
                    if (options.actions && typeof options.actions.onLoadSingleFile === 'function') {
                        options.actions.onLoadSingleFile(file, handle);
                    } else if (typeof window !== 'undefined') {
                        window.currentFileHandle = handle;
                        add_recent_file_entry(file.name, file.path || file.name, handle, file.size);
                        if (typeof window.loadSingleFile === 'function') {
                            window.loadSingleFile(file);
                        }
                        window.isNewSessionSkippedRestore = false;
                    }
                    return;
                } catch (err) {
                    console.warn('현재 창에 최근 파일 불러오기 실패:', err);
                }
            }
        }

        // 원본 경로로 깔끔한 새 URL 계산 (openRecent 파라미터 중첩 방지)
        if (typeof window !== 'undefined' && window.location) {
            const originUrl = new URL(window.location.origin + window.location.pathname);
            originUrl.searchParams.set('openRecent', fileEntry.name);
            window.open(originUrl.toString(), '_blank');
        }
    }

    async function check_and_load_recent_url_param(onLoadFile) {
        if (onLoadFile !== undefined && onLoadFile !== null) {
            if (!assert_arg(typeof onLoadFile === 'function', 'check_and_load_recent_url_param: onLoadFile must be a function', { onLoadFile })) {
                return;
            }
        }
        if (typeof window === 'undefined' || !window.location || !window.location.search) return;

        const urlParams = new URLSearchParams(window.location.search);
        const recentName = urlParams.get('openRecent');
        if (!recentName) return;

        // URL 파라미터 수신 및 로드 처리 후 히스토리에서 쿼리 클린업
        try {
            const cleanUrl = window.location.origin + window.location.pathname;
            if (window.history && typeof window.history.replaceState === 'function') {
                window.history.replaceState({}, document.title, cleanUrl);
            }
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
                        const loadCb = onLoadFile || (options.actions && options.actions.onLoadSingleFile);
                        if (typeof loadCb === 'function') {
                            loadCb(file, handle);
                        } else if (typeof window !== 'undefined') {
                            window.currentFileHandle = handle;
                            add_recent_file_entry(file.name, file.path || file.name, handle, file.size);
                            if (typeof window.loadSingleFile === 'function') {
                                window.loadSingleFile(file);
                            }
                        }
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
            if (typeof window !== 'undefined') {
                if (window.currentFileHandle !== undefined) window.currentFileHandle = null;
                if (window.cm && typeof window.cm.setValue === 'function') window.cm.setValue('');
                if (typeof window.updateFilenameDisplay === 'function') {
                    window.updateFilenameDisplay('제목 없음.md', false);
                } else {
                    update_filename_display_ui('제목 없음.md', false, options.elements);
                }
                if (typeof window.renderMarkdown === 'function') window.renderMarkdown();
                if (typeof window.saveDocumentSession === 'function') window.saveDocumentSession();
            }
            show_toast_ui(`최근 파일 "${recentName}"을(를) 여시려면 상단 'md 불러오기'를 이용해 주세요.`, 5000, options.elements);
            const selectCb = (options.actions && typeof options.actions.onSelectRecentFile === 'function')
                ? options.actions.onSelectRecentFile
                : ((entry) => open_recent_file_in_new_window(entry));
            render_recent_files_ui(get_recent_files(), options.elements, selectCb);
        }
    }

    function show_toast_ui(message, duration = 3000, elements = {}) {
        if (typeof document === 'undefined') return;
        let toastEl = (elements && elements.toastEl) || document.getElementById('toast-container');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'toast-container';
            toastEl.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #1e293b; color: #f8fafc; padding: 10px 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 13px; transition: opacity 0.3s; opacity: 0; pointer-events: none;';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = message;
        toastEl.style.opacity = '1';
        toastEl.style.pointerEvents = 'auto';

        if (toastEl._timer) clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.pointerEvents = 'none';
        }, duration);
    }

    function apply_preview_max_width_limit_ui(isLimited = true, elements = {}) {
        if (typeof document === 'undefined') return;
        const previewViewport = (elements && elements.previewViewport) || document.querySelector('.preview-viewport');
        if (previewViewport) {
            if (isLimited) {
                previewViewport.classList.remove('full-width');
            } else {
                previewViewport.classList.add('full-width');
            }
        }
        const checkbox = (elements && elements.togglePreviewMaxWidthCheckbox) || document.getElementById('toggle-preview-max-width');
        if (checkbox) {
            checkbox.checked = !!isLimited;
        }
    }

    function init_debug_panel_ui(elements = {}) {
        if (typeof document === 'undefined') return null;
        let debugPanel = (elements && elements.debugPanel) || document.getElementById('debug-keyframe-panel');
        if (!debugPanel) {
            debugPanel = document.createElement('div');
            debugPanel.id = 'debug-keyframe-panel';
            debugPanel.style.position = 'fixed';
            debugPanel.style.bottom = '20px';
            debugPanel.style.right = '20px';
            debugPanel.style.width = '420px';
            debugPanel.style.maxHeight = '280px';
            debugPanel.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
            debugPanel.style.backdropFilter = 'blur(8px)';
            debugPanel.style.border = '1px solid var(--theme-color, #3b82f6)';
            debugPanel.style.borderRadius = '8px';
            debugPanel.style.color = '#f1f5f9';
            debugPanel.style.fontFamily = 'monospace';
            debugPanel.style.fontSize = '11px';
            debugPanel.style.padding = '12px';
            debugPanel.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
            debugPanel.style.zIndex = '9999';
            debugPanel.style.overflowY = 'auto';
            debugPanel.style.display = 'none';
            if (document.body) document.body.appendChild(debugPanel);
        }
        return debugPanel;
    }

    function toggle_debug_panel_ui(elements = {}, onToggle) {
        const debugPanel = init_debug_panel_ui(elements);
        if (!debugPanel) return;
        if (debugPanel.style.display === 'none') {
            debugPanel.style.display = 'block';
            if (typeof onToggle === 'function') {
                onToggle(true);
            }
        } else {
            debugPanel.style.display = 'none';
            if (typeof onToggle === 'function') {
                onToggle(false);
            }
        }
    }

    function render_debug_panel_ui(keyframesList, activeSource, elements = {}) {
        const debugPanel = init_debug_panel_ui(elements);
        if (!debugPanel || debugPanel.style.display === 'none') return;
        
        const list = keyframesList || [];
        let html = `<div style="font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🔑 Keyframes Debug List (${list.length})</span>
            <span style="color: var(--theme-color);">Active: ${activeSource || 'None'}</span>
        </div>`;
        
        html += `<table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
                <tr style="color: #94a3b8; border-bottom: 1px solid #1e293b;">
                    <th style="padding: 2px;">Line</th>
                    <th style="padding: 2px;">ID (Text)</th>
                    <th style="padding: 2px; text-align: right;">Ed%</th>
                    <th style="padding: 2px; text-align: right;">Pr%</th>
                    <th style="padding: 2px; text-align: right;">Y(px)</th>
                    <th style="padding: 2px; text-align: right;">ScaleFactor</th>
                </tr>
            </thead>
            <tbody>`;
            
        list.forEach((kf) => {
            const edPct = (kf.editorPercent * 100).toFixed(0) + '%';
            const prPct = (kf.previewPercent * 100).toFixed(0) + '%';
            const isBoundary = kf.id === '[START]' || kf.id === '[END]';
            const rowColor = isBoundary ? '#64748b' : '#38bdf8';
            const sfVal = kf.scaleFactor !== null && kf.scaleFactor !== undefined ? kf.scaleFactor : '-';
            
            const sfHighlight = kf.isActiveSegment 
                ? `background: #0284c7; color: #ffffff; padding: 1px 5px; border-radius: 4px; font-weight: bold; box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);` 
                : `color: ${rowColor};`;

            const rowBg = kf.isActiveSegment ? 'background: rgba(2, 132, 199, 0.15);' : '';
            const pinnedPrefix = kf.isUserPinned ? '📌 ' : '';

            html += `<tr style="color: ${rowColor}; ${rowBg} border-bottom: 1px dashed #1e293b;">
                <td style="padding: 3px 2px;">${Math.round(kf.line)}</td>
                <td style="padding: 3px 2px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${kf.id}">${pinnedPrefix}${kf.id}</td>
                <td style="padding: 3px 2px; text-align: right;">${edPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${prPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${Math.round(kf.previewScrollY)}</td>
                <td style="padding: 3px 2px; text-align: right;"><span style="${sfHighlight}">${sfVal}</span></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        debugPanel.innerHTML = html;
    }

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

    function restore_frame_settings_ui(sessionData, elements = {}, callbacks = {}) {
        if (!sessionData) return;
        const els = elements || {};
        const cb = callbacks || {};

        // 1. Panel Split Width Restore
        const editorPanel = els.editorPanel || (typeof document !== 'undefined' ? document.getElementById('editor-panel') : null);
        if (sessionData.editorWidthPercent && editorPanel) {
            editorPanel.style.width = sessionData.editorWidthPercent;
            if (typeof cb.onPanelResize === 'function') {
                cb.onPanelResize();
            }
        }

        // 2. Font Family Restore
        const fontSelect = els.fontSelect || (typeof document !== 'undefined' ? document.getElementById('font-select') : null);
        const preview = els.preview || (typeof document !== 'undefined' ? document.getElementById('markdown-body') : null);
        if (sessionData.fontFamily && fontSelect) {
            fontSelect.value = sessionData.fontFamily;
            if (preview && preview.style && typeof preview.style.setProperty === 'function') {
                preview.style.setProperty('--preview-font-family', sessionData.fontFamily);
            }
        }

        // 3. Font Size Restore
        const fontSizeSelect = els.fontSizeSelect || (typeof document !== 'undefined' ? document.getElementById('font-size-select') : null);
        if (fontSizeSelect || sessionData.fontSize) {
            let valToSet = sessionData.fontSize || '120%';
            if (valToSet.endsWith('px')) {
                if (valToSet === '12px') valToSet = '100%';
                else if (valToSet === '14px') valToSet = '110%';
                else if (valToSet === '16px') valToSet = '120%';
                else if (valToSet === '18px') valToSet = '130%';
                else if (valToSet === '20px') valToSet = '140%';
                else valToSet = '120%';
            }
            if (fontSizeSelect) fontSizeSelect.value = valToSet;
            const computedPt = calc_scaled_font_size(valToSet, 10);
            if (preview && preview.style && typeof preview.style.setProperty === 'function') {
                preview.style.setProperty('--preview-font-size', computedPt);
            }
            if (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && typeof document.documentElement.style.setProperty === 'function') {
                document.documentElement.style.setProperty('--preview-font-size', computedPt);
                document.documentElement.style.setProperty('--editor-font-size', computedPt);
            }
        }

        // 4. Line Color Restore
        const lineColorPicker = els.lineColorPicker || (typeof document !== 'undefined' ? document.getElementById('line-color-picker') : null);
        if (sessionData.lineColor && lineColorPicker) {
            lineColorPicker.value = sessionData.lineColor;
            if (typeof cb.onLineColorChange === 'function') {
                cb.onLineColorChange(sessionData.lineColor);
            }
        }

        // 5. Preview Max Width Limit Restore
        if (typeof sessionData.previewMaxWidthLimited === 'boolean') {
            apply_preview_max_width_limit_ui(sessionData.previewMaxWidthLimited, els);
        } else {
            apply_preview_max_width_limit_ui(true, els);
        }

        // 6. Color Swatch Restore
        const colorSwatchCheckbox = els.colorSwatchCheckbox || (typeof document !== 'undefined' ? document.getElementById('color-swatch-toggle') : null);
        if (colorSwatchCheckbox) {
            colorSwatchCheckbox.checked = typeof sessionData.colorSwatchEnabled === 'boolean' ? sessionData.colorSwatchEnabled : true;
            if (typeof cb.onColorSwatchToggle === 'function') {
                cb.onColorSwatchToggle(colorSwatchCheckbox.checked);
            }
        }

        // 7. Scroll Sync Restore
        const scrollSyncCheckbox = els.scrollSyncCheckbox || (typeof document !== 'undefined' ? document.getElementById('scroll-sync') : null);
        if (scrollSyncCheckbox) {
            scrollSyncCheckbox.checked = typeof sessionData.scrollSyncEnabled === 'boolean' ? sessionData.scrollSyncEnabled : true;
            if (typeof cb.onScrollSyncToggle === 'function') {
                cb.onScrollSyncToggle(scrollSyncCheckbox.checked);
            }
        }
    }

    /**
     * pure sub-function: 마크다운 텍스트에서 목차(TOC) 헤딩 목록을 추출 파싱합니다.
     */
    function parse_toc_headings(text) {
        if (typeof text !== 'string') return [];
        if (typeof EditorManager !== 'undefined' && typeof EditorManager.build_toc === 'function') {
            return EditorManager.build_toc(text);
        }
        const headings = [];
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: index
                });
            }
        });
        return headings;
    }

    /**
     * pure sub-function: TOC 헤딩 트리를 DOM(tocList) UI에 렌더링합니다.
     */
    function render_toc_tree_ui(headings, elements, onSelectHeading) {
        if (!assert_arg(Array.isArray(headings), 'render_toc_tree_ui: headings must be an array', { headings })) {
            return false;
        }
        if (!assert_arg(typeof onSelectHeading === 'function', 'render_toc_tree_ui: onSelectHeading must be a function', { onSelectHeading })) {
            return false;
        }
        const els = elements || {};
        const tocList = els.tocList || (typeof document !== 'undefined' ? document.getElementById('toc-list') : null);
        if (!tocList) return false;

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
                onSelectHeading(heading.line + 1);
            });

            li.appendChild(a);
            tocList.appendChild(li);
        });
        return true;
    }

    /**
     * pure sub-function: TOC 사이드바의 접기/열기 상태 및 ARIA 속성을 토글/전환합니다.
     */
    function toggle_toc_sidebar_ui(elements, forceState) {
        const els = elements || {};
        const tocSidebar = els.tocSidebar || (typeof document !== 'undefined' ? document.getElementById('toc-sidebar') : null);
        if (!assert_arg(tocSidebar && typeof tocSidebar === 'object', 'toggle_toc_sidebar_ui: elements.tocSidebar DOM element is required', { tocSidebar })) {
            return false;
        }
        if (!assert_arg(typeof forceState === 'boolean', 'toggle_toc_sidebar_ui: forceState must be a boolean', { forceState })) {
            return false;
        }

        const btnTocToggleInner = els.btnTocToggleInner || (typeof document !== 'undefined' ? document.getElementById('btn-toc-toggle-inner') : null);
        const tocToggleBar = els.tocToggleBar || (typeof document !== 'undefined' ? document.getElementById('toc-toggle-bar') : null);

        if (forceState) {
            tocSidebar.classList.add('collapsed');
            if (btnTocToggleInner) btnTocToggleInner.setAttribute('aria-expanded', 'false');
            if (tocToggleBar) tocToggleBar.setAttribute('aria-expanded', 'false');
        } else {
            tocSidebar.classList.remove('collapsed');
            if (btnTocToggleInner) btnTocToggleInner.setAttribute('aria-expanded', 'true');
            if (tocToggleBar) tocToggleBar.setAttribute('aria-expanded', 'true');
        }
        return true;
    }

    /**
     * pure sub-function: 현재 에디터 활성 라인(activeLine)에 해당하는 TOC 항목을 하이라이트 표시합니다.
     */
    function highlight_active_toc_ui(elements, activeLine) {
        if (!assert_arg(typeof activeLine === 'number' && activeLine >= 0, 'highlight_active_toc_ui: activeLine must be a non-negative number', { activeLine })) {
            return false;
        }
        const els = elements || {};
        const tocList = els.tocList || (typeof document !== 'undefined' ? document.getElementById('toc-list') : null);
        const tocItems = tocList ? tocList.querySelectorAll('.toc-item') : (typeof document !== 'undefined' ? document.querySelectorAll('.toc-item') : []);

        tocItems.forEach(item => {
            const lineAttr = item.getAttribute('data-line');
            if (lineAttr !== null && parseInt(lineAttr, 10) === activeLine) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        return true;
    }

    /**
     * pure sub-function: 브라우저 기본 드래그 앤 드롭 동작(새 탭 파일 열기)을 전역 차단합니다.
     */
    function prevent_window_default_drop() {
        if (typeof window === 'undefined' || !window.addEventListener) return;
        if (window._preventWindowDropBound) return;
        window.addEventListener('dragover', (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
        }, false);
        window.addEventListener('drop', (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
        }, false);
        window._preventWindowDropBound = true;
    }

    /**
     * pure sub-function: 에디터 컨테이너 드래그 앤 드롭 오버레이 UI 감지 및 CSS 클래스 토글을 설정합니다.
     */
    function setup_drag_drop_overlay_ui(editorContainerEl) {
        if (!assert_arg(editorContainerEl && typeof editorContainerEl === 'object' && (editorContainerEl.nodeType || typeof editorContainerEl.addEventListener === 'function'), 'setup_drag_drop_overlay_ui: editorContainerEl DOM element is required', { editorContainerEl })) {
            return null;
        }
        let dragCounter = 0;

        const handleDragEnter = (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            dragCounter++;
            if (dragCounter === 1 && editorContainerEl.classList) {
                editorContainerEl.classList.add('drag-over');
            }
        };

        const handleDragLeave = (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0 && editorContainerEl.classList) {
                editorContainerEl.classList.remove('drag-over');
                dragCounter = 0;
            }
        };

        const handleDragOver = (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
        };

        editorContainerEl.addEventListener('dragenter', handleDragEnter);
        editorContainerEl.addEventListener('dragleave', handleDragLeave);
        editorContainerEl.addEventListener('dragover', handleDragOver);

        return {
            resetCounter: function() {
                dragCounter = 0;
                if (editorContainerEl && editorContainerEl.classList) {
                    editorContainerEl.classList.remove('drag-over');
                }
            }
        };
    }

    /**
     * pure sub-function: Drop 이벤트 dataTransfer 객체로부터 File 및 FileSystemHandle을 추출합니다.
     */
    async function extract_dropped_file_and_handle(dataTransfer) {
        let targetFile = null;
        let targetHandle = null;

        if (dataTransfer && dataTransfer.items) {
            for (const item of dataTransfer.items) {
                if (item.kind === 'file' && typeof item.getAsFileSystemHandle === 'function') {
                    try {
                        const handle = await item.getAsFileSystemHandle();
                        if (handle && handle.kind === 'file') {
                            targetFile = await handle.getFile();
                            targetHandle = handle;
                            break;
                        }
                    } catch (err) {
                        console.warn('getAsFileSystemHandle fallback 진행:', err);
                    }
                }
            }
        }

        if (!targetFile && dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
            targetFile = dataTransfer.files[0];
        }

        return { file: targetFile, handle: targetHandle, targetFile: targetFile, targetHandle: targetHandle };
    }

    /**
     * pure sub-function: 확장자 및 MIME 타입을 검증하여 허용된 마크다운/텍스트 파일 여부를 판단합니다.
     */
    function is_allowed_markdown_file(fileName, fileType) {
        if (!assert_arg(typeof fileName === 'string' && fileName.trim().length > 0, 'is_allowed_markdown_file: fileName must be a non-empty string', { fileName })) {
            return false;
        }
        const extension = fileName.split('.').pop().toLowerCase();
        const allowedExtensions = ['md', 'markdown', 'txt', 'html', 'json'];
        if (allowedExtensions.includes(extension)) return true;
        if (typeof fileType === 'string' && fileType.startsWith('text/')) return true;
        return false;
    }

    /**
     * pure sub-function: FileReader API를 사용하여 파일을 비동기 텍스트로 읽고 콜백을 호출합니다.
     */
    function read_file_content_as_text(file, onComplete) {
        if (!assert_arg(file && typeof file === 'object' && typeof file.name === 'string', 'read_file_content_as_text: file object with name is required', { file })) {
            return false;
        }
        if (!assert_arg(typeof onComplete === 'function', 'read_file_content_as_text: onComplete callback function is required', { onComplete })) {
            return false;
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB 상한선
        if (typeof file.size === 'number') {
            if (!assert_arg(file.size <= MAX_FILE_SIZE, 'read_file_content_as_text: file size exceeds maximum limit (50MB)', { size: file.size })) {
                return false;
            }
        }

        if (typeof FileReader !== 'undefined') {
            const async_file_reader = new FileReader();
            async_file_reader.onload = function(event) {
                onComplete(event.target ? event.target.result : (event.result || ''));
            };
            async_file_reader.readAsText(file);
            return true;
        } else if (typeof file.text === 'function') {
            file.text().then(text => onComplete(text)).catch(() => onComplete(''));
            return true;
        } else {
            const content = file.content || file._content || '';
            onComplete(content);
            return true;
        }
    }

    // ==========================================================================
    // Public API (camelCase)
    // ==========================================================================

    const RecentFileManager = {
        init: function(userOpts) {
            if (userOpts !== undefined && userOpts !== null) {
                if (!assert_arg(typeof userOpts === 'object', 'RecentFileManager.init: userOpts must be an object if provided', { userOpts })) {
                    return get_recent_files();
                }
                if (userOpts.elements) {
                    options.elements = Object.assign({}, options.elements, userOpts.elements);
                }
                if (userOpts.actions) {
                    options.actions = Object.assign({}, options.actions, userOpts.actions);
                }
            }

            if (typeof window !== 'undefined' && window.addEventListener && !window._recentFilesStorageListenerAdded) {
                window.addEventListener('storage', (e) => {
                    if (e.key === RECENT_FILES_KEY) {
                        const selectCb = (options.actions && typeof options.actions.onSelectRecentFile === 'function')
                            ? options.actions.onSelectRecentFile
                            : ((entry) => open_recent_file_in_new_window(entry));
                        render_recent_files_ui(get_recent_files(), options.elements, selectCb);
                    }
                });
                window._recentFilesStorageListenerAdded = true;
            }

            const files = get_recent_files();
            const selectCb = (options.actions && typeof options.actions.onSelectRecentFile === 'function')
                ? options.actions.onSelectRecentFile
                : ((entry) => open_recent_file_in_new_window(entry));
            render_recent_files_ui(files, options.elements, selectCb);
            check_and_load_recent_url_param(options.actions && options.actions.onLoadSingleFile);
            return files;
        },

        addFile: function(name, fullPath, handle, size) {
            return add_recent_file_entry(name, fullPath, handle, size);
        },

        getFiles: function() {
            return get_recent_files();
        },

        getHandle: function(name) {
            return get_handle_from_idb(name);
        },

        checkAndLoadUrlParam: function(onLoadFile) {
            return check_and_load_recent_url_param(onLoadFile);
        }
    };

    const TocManager = {
        options: {
            elements: {},
            onSelectHeading: null
        },

        init: function(userOpts = {}) {
            if (!assert_arg(typeof userOpts === 'object' && userOpts !== null, 'TocManager.init: userOpts must be an object', { userOpts })) {
                return false;
            }
            const defaultEls = get_default_elements();
            const userEls = (userOpts.elements && typeof userOpts.elements === 'object') ? userOpts.elements : {};
            const els = Object.assign({}, defaultEls, userEls);

            this.options = {
                elements: els,
                onSelectHeading: userOpts.onSelectHeading || null
            };

            this.bindEvents();
            return true;
        },

        bindEvents: function() {
            const els = (this.options && this.options.elements) ? this.options.elements : get_default_elements();
            if (els.btnTocToggleInner && els.tocSidebar) {
                els.btnTocToggleInner.onclick = () => {
                    this.toggleSidebar(true);
                };
                els.btnTocToggleInner.onkeydown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        this.toggleSidebar(true);
                    }
                };
            }
            if (els.tocToggleBar && els.tocSidebar) {
                els.tocToggleBar.onclick = () => {
                    this.toggleSidebar(false);
                };
                els.tocToggleBar.onkeydown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        this.toggleSidebar(false);
                    }
                };
            }
        },

        render: function(markdownText, cmInstance) {
            if (!assert_arg(typeof markdownText === 'string', 'TocManager.render: markdownText must be a string', { markdownText })) {
                return false;
            }
            const headings = parse_toc_headings(markdownText);
            const onSelect = (line) => {
                if (typeof this.options.onSelectHeading === 'function') {
                    this.options.onSelectHeading(line);
                } else if (cmInstance && typeof cmInstance.scrollToLine === 'function') {
                    cmInstance.scrollToLine(line);
                } else if (window.scrollSync && typeof window.scrollSync.scrollToLine === 'function') {
                    window.scrollSync.scrollToLine(line);
                }
            };
            return render_toc_tree_ui(headings, this.options.elements, onSelect);
        },

        toggleSidebar: function(forceState) {
            const els = (this.options && this.options.elements) ? this.options.elements : get_default_elements();
            let targetState = forceState;
            if (targetState === undefined) {
                targetState = els.tocSidebar ? !els.tocSidebar.classList.contains('collapsed') : true;
            }
            return toggle_toc_sidebar_ui(els, targetState);
        },

        highlightActive: function(activeLine) {
            if (!assert_arg(typeof activeLine === 'number' && activeLine >= 0, 'TocManager.highlightActive: activeLine must be a non-negative number', { activeLine })) {
                return false;
            }
            const els = (this.options && this.options.elements) ? this.options.elements : get_default_elements();
            return highlight_active_toc_ui(els, activeLine);
        }
    };

    const FileDropManager = {
        options: {
            editorContainerEl: null,
            maxFileSize: 50 * 1024 * 1024, // 기본 50MB (환경설정 변경 지원)
            callbacks: {}
        },
        overlayState: null,

        prevent_window_default_drop: prevent_window_default_drop,
        setup_drag_drop_overlay_ui: setup_drag_drop_overlay_ui,
        extract_dropped_file_and_handle: extract_dropped_file_and_handle,
        is_allowed_markdown_file: is_allowed_markdown_file,
        read_file_content_as_text: read_file_content_as_text,

        init: function(userOpts = {}) {
            if (userOpts !== undefined && userOpts !== null) {
                if (!assert_arg(typeof userOpts === 'object', 'FileDropManager.init: userOpts must be an object', { userOpts })) {
                    return this;
                }
            }
            prevent_window_default_drop();

            const opts = userOpts || {};
            const container = opts.editorContainerEl || (typeof document !== 'undefined' ? document.querySelector('.editor-container') : null);

            if (container) {
                this.overlayState = setup_drag_drop_overlay_ui(container);
                this.options.editorContainerEl = container;
            }

            if (opts.maxFileSize && typeof opts.maxFileSize === 'number') {
                this.options.maxFileSize = opts.maxFileSize;
            }

            if (opts.callbacks) {
                this.options.callbacks = Object.assign({}, this.options.callbacks, opts.callbacks);
            }

            return this;
        },

        handleDropEvent: async function(event, callbacks = {}) {
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }

            if (this.overlayState && typeof this.overlayState.resetCounter === 'function') {
                this.overlayState.resetCounter();
            }

            const cb = Object.assign({}, this.options.callbacks, callbacks);
            const dataTransfer = (event && event.dataTransfer) ? event.dataTransfer : null;
            const { file, handle } = await extract_dropped_file_and_handle(dataTransfer);

            if (file) {
                const isAllowed = is_allowed_markdown_file(file.name, file.type || '');
                if (isAllowed) {
                    if (typeof cb.onFileExtracted === 'function') {
                        cb.onFileExtracted(file, handle);
                    }

                    const isFresh = (typeof cb.isFreshWindow === 'function') ? cb.isFreshWindow() : true;
                    if (isFresh) {
                        this.loadSingleFile(file, cb, handle);
                    } else {
                        if (typeof cb.onOpenNewWindow === 'function') {
                            cb.onOpenNewWindow(file, handle);
                        } else if (typeof window !== 'undefined' && window.location) {
                            const originUrl = new URL(window.location.origin + window.location.pathname);
                            originUrl.searchParams.set('openRecent', file.name);
                            window.open(originUrl.toString(), '_blank');
                        }
                    }
                } else {
                    const msg = '불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 드롭해 주세요.';
                    if (typeof cb.onError === 'function') {
                        cb.onError(msg);
                    } else if (typeof alert !== 'undefined') {
                        alert(msg);
                    }
                }
            }
            return { file, handle };
        },

        loadSingleFile: function(file, callbacks = {}, handle = null) {
            if (!assert_arg(file && typeof file === 'object' && typeof file.name === 'string', 'FileDropManager.loadSingleFile: file object with name is required', { file })) {
                return false;
            }

            const cb = Object.assign({}, this.options.callbacks, callbacks);
            const isAllowed = is_allowed_markdown_file(file.name, file.type || '');

            if (!isAllowed) {
                const msg = '불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 열어 주세요.';
                if (typeof cb.onError === 'function') {
                    cb.onError(msg);
                } else if (typeof alert !== 'undefined') {
                    alert(msg);
                }
                return false;
            }

            // 파일 크기 제한 검증 (기본값 50MB, 환경설정 커스텀 지원)
            const maxFileSize = (this.options && typeof this.options.maxFileSize === 'number') ? this.options.maxFileSize : (50 * 1024 * 1024);
            if (typeof file.size === 'number' && file.size > maxFileSize) {
                const maxMb = Math.round(maxFileSize / (1024 * 1024));
                const msg = `파일 크기가 제한 용량(${maxMb}MB)을 초과하였습니다. 더 작은 마크다운 파일(${maxMb}MB 이하)을 열어 주세요.`;
                if (typeof cb.onError === 'function') {
                    cb.onError(msg);
                } else if (typeof alert !== 'undefined') {
                    alert(msg);
                }
                return false;
            }

            return read_file_content_as_text(file, (content) => {
                if (typeof cb.onFileLoaded === 'function') {
                    cb.onFileLoaded(content, file, handle);
                }
            });
        }
    };

    const FrameManager = {
        init: function(userOptions) {
            const userOpts = userOptions || {};
            const defaultEls = get_default_elements();
            const userEls = (userOpts.elements && typeof userOpts.elements === 'object') ? userOpts.elements : {};
            const els = Object.assign({}, defaultEls, userEls);
            const acts = (userOpts.actions && typeof userOpts.actions === 'object') ? userOpts.actions : {};

            options = { elements: els, actions: acts };

            assert_arg(els && typeof els === 'object', 'FrameManager.init: elements struct is missing or invalid!', { els });
            assert_arg(acts && typeof acts === 'object', 'FrameManager.init: actions struct is missing or invalid!', { acts });

            init_theme_ui(els, acts.onThemeChange);
            setup_splitter_events(els, acts);
            setup_menu_toggles(els);
            setup_outside_click_dismissal(els);
            setup_button_actions(els, acts);

            return els;
        },

        getElements: function() {
            if (!options.elements || Object.keys(options.elements).length === 0) {
                options.elements = get_default_elements();
            }
            return options.elements;
        },

        applyTheme: function(theme) {
            apply_theme_ui(theme, options.elements, options.actions.onThemeChange);
        },

        initTheme: function() {
            init_theme_ui(options.elements, options.actions.onThemeChange);
        },

        closeAllDropdowns: function() {
            close_all_dropdowns(options.elements);
        },

        toggleDropdown: function(menuEl) {
            toggle_dropdown_menu(menuEl, options.elements);
        },

        updateFilenameDisplay: function(name, isModified) {
            update_filename_display_ui(name, isModified, options.elements);
        },

        renderRecentFilesMenu: function(files, onSelectFile) {
            render_recent_files_ui(files, options.elements, onSelectFile);
        },

        showToast: function(message, duration) {
            show_toast_ui(message, duration, options.elements);
        },

        applyPreviewMaxWidthLimit: function(isLimited) {
            apply_preview_max_width_limit_ui(isLimited, options.elements);
        },

        initDebugPanel: function() {
            return init_debug_panel_ui(options.elements);
        },

        toggleDebugPanel: function(onToggle) {
            toggle_debug_panel_ui(options.elements, onToggle);
        },

        updateDebugPanel: function(keyframesList, activeSource) {
            render_debug_panel_ui(keyframesList, activeSource, options.elements);
        },

        restoreFrameSettings: function(sessionData) {
            restore_frame_settings_ui(sessionData, options.elements, {
                onPanelResize: options.actions.onPanelResize,
                onLineColorChange: options.actions.onLineColorChange,
                onColorSwatchToggle: options.actions.onColorSwatchToggle,
                onScrollSyncToggle: options.actions.onScrollSyncToggle
            });
        },

        calcScaledFontSize: calc_scaled_font_size,
        formatFileSize: format_file_size,
        formatRecentTime: format_recent_time,

        RecentFileManager: RecentFileManager,

        initRecentFiles: function(userOpts) {
            return RecentFileManager.init(userOpts);
        },

        addRecentFile: function(name, fullPath, handle, size) {
            return RecentFileManager.addFile(name, fullPath, handle, size);
        },

        getRecentFiles: function() {
            return RecentFileManager.getFiles();
        },

        getRecentFileHandle: function(name) {
            return RecentFileManager.getHandle(name);
        },

        checkAndLoadRecentUrlParam: function(onLoadFile) {
            return RecentFileManager.checkAndLoadUrlParam(onLoadFile);
        },

        TocManager: TocManager,

        initToc: function(userOpts) {
            return TocManager.init(userOpts);
        },

        renderToc: function(markdownText, cmInstance) {
            return TocManager.render(markdownText, cmInstance);
        },

        toggleTocSidebar: function(forceState) {
            return TocManager.toggleSidebar(forceState);
        },

        highlightActiveToc: function(activeLine) {
            return TocManager.highlightActive(activeLine);
        },

        FileDropManager: FileDropManager,

        initFileDrop: function(userOpts) {
            return FileDropManager.init(userOpts);
        },

        handleDropEvent: function(event, callbacks) {
            return FileDropManager.handleDropEvent(event, callbacks);
        },

        loadSingleFile: function(file, callbacks, handle) {
            return FileDropManager.loadSingleFile(file, callbacks, handle);
        }
    };

    if (typeof window !== 'undefined') {
        window.RecentFileManager = RecentFileManager;
        window.TocManager = TocManager;
        window.FileDropManager = FileDropManager;
    }
    FrameManager.RecentFileManager = RecentFileManager;
    FrameManager.TocManager = TocManager;
    FrameManager.FileDropManager = FileDropManager;

    window.FrameManager = FrameManager;

})(typeof window !== 'undefined' ? window : this);
