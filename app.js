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
     * 현재 런타임 브라우저 종류('edge' | 'chrome' | 'other')를 명확히 구별하는 pure 서브 함수
     */
    function detect_browser_type() {
        if (typeof navigator === 'undefined') return 'other';

        const ua = navigator.userAgent || '';
        if (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) {
            const isEdge = navigator.userAgentData.brands.some(b => /Microsoft Edge|Edg/i.test(b.brand));
            if (isEdge) return 'edge';

            const isChrome = navigator.userAgentData.brands.some(b => /Google Chrome|Chromium/i.test(b.brand));
            if (isChrome) return 'chrome';
        }

        if (/Edg\//i.test(ua)) return 'edge';
        if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'chrome';

        return 'other';
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

        const bType = detect_browser_type();
        banner.setAttribute('data-browser-type', bType);

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
        window.detect_browser_type = detect_browser_type;
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

    // 1. FrameManager UI 엘리먼트 자율 쿼리 및 바인딩 수신
    const frameElements = (typeof FrameManager !== 'undefined' && typeof FrameManager.getElements === 'function')
        ? FrameManager.getElements()
        : {};

    // 편리한 접근을 위한 로컬 구조 분해 할당 (Destructuring)
    const {
        container, editorPanel, dragDivider, preview, previewViewport,
        fileBadge, filenameSpan,
        btnThemeToggle, themeIconSun, themeIconMoon, themeToggleText,
        fontSelect, fontSizeSelect, lineColorPicker, scrollSyncCheckbox,
        colorSwatchCheckbox, togglePreviewMaxWidthCheckbox, previewMaxWidthWrapper,
        codeblockScrollCheckbox, codeblockScrollWrapper, mathRenderCheckbox,
        mathRenderWrapper, diagramRenderCheckbox, diagramRenderWrapper, colorSwatchWrapper,
        menuDropdown, btnMenu, mainMenu, btnNewFile, btnOpenFile, fileInput,
        viewDropdown, btnView, viewMenu,
        headingDropdown, btnHeadingStyle, headingStyleMenu, btnEditHeadingStyle, headingPresetSelect,
        exportDropdown, btnExport, exportMenu, btnExportHtml, btnExportPdfPrint,
        btnExportPdfHtml2Pdf, btnOpenNewWindow, btnOpenNewWindowDefault,
        btnCopy, btnSave, btnSaveAs, btnJoinParagraphs, btnDebug
    } = frameElements;



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
        
        if (typeof RecentFileManager !== 'undefined' && typeof RecentFileManager.addFile === 'function' && name && name !== '제목 없음.md') {
            RecentFileManager.addFile(name, name);
        }
    }

    // 초기 파일명 뱃지 표시 설정
    updateFilenameDisplay(currentFilename, false);



    // ==========================================================================
    // Preview Max Width Limit Control (snake_case sub-function)
    // ==========================================================================
    function apply_preview_max_width_limit(isLimited = true) {
        if (typeof PreviewManager !== 'undefined' && typeof PreviewManager.applyPreviewMaxWidthLimit === 'function') {
            PreviewManager.applyPreviewMaxWidthLimit(previewViewport, isLimited);
        }
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

    /**
     * 1단계 [Data Read Phase]: localStorage에서 세션 저장 데이터를 독립적으로 수집 및 파싱합니다.
     */
    function read_saved_document_session() {
        try {
            const rawData = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!rawData) return null;
            return JSON.parse(rawData);
        } catch (e) {
            console.warn('Failed to read document session from localStorage:', e);
            return null;
        }
    }

    /**
     * 2단계 [Content Restore Phase]: 문서 본문 내용 및 파일명/상태를 에디터에 반영합니다.
     */
    function restore_document_content(sessionData) {
        if (!sessionData) return;
        window.assert_arg(typeof cm !== 'undefined' && cm, 'CodeMirror instance cm must be initialized before restore_document_content!', { cm, sessionData });
        if (!isNewSessionSkippedRestore && typeof sessionData.content === 'string' && sessionData.content.length > 0) {
            cm.setValue(sessionData.content);
        }
        if (!isNewSessionSkippedRestore && sessionData.filename) {
            updateFilenameDisplay(sessionData.filename, !!sessionData.isDirty);
        }
    }

    /**
     * 3단계 [Frame UI Restore Phase]: FrameManager 액션 준비 완료 후 프레임 및 시각적 레이아웃 설정을 복원합니다.
     */
    function restore_frame_ui_settings(sessionData) {
        if (!sessionData) return;
        window.assert_arg(typeof FrameManager !== 'undefined' && typeof FrameManager.restoreFrameSettings === 'function', 'FrameManager.restoreFrameSettings is required for restore_frame_ui_settings!', { FrameManager, sessionData });
        FrameManager.restoreFrameSettings(sessionData);
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
    
    window.assert_arg(typeof PreviewManager !== 'undefined', 'PreviewManager module is required!');
    PreviewManager.initMath({ mathRenderWrapper, mathRenderCheckbox });
    PreviewManager.initDiagrams({ diagramRenderWrapper, diagramRenderCheckbox });

    // Main Render Function with Line Mapping
    function renderMarkdown() {
        window.assert_arg(typeof window.PreviewManager !== 'undefined', 'PreviewManager module is required!');
        PreviewManager.renderMarkdown(cm, preview, colorSwatchCheckbox, scrollSync, typeof buildTOC === 'function' ? buildTOC : null);
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
        if (typeof PreviewManager !== 'undefined' && typeof PreviewManager.applyPreviewFontFamily === 'function') {
            PreviewManager.applyPreviewFontFamily(preview, selectedFont);
        } else if (preview) {
            preview.style.setProperty('--preview-font-family', selectedFont);
        }
        document.documentElement.style.setProperty('--preview-font-family', selectedFont);
        saveDocumentSession();
    });

    // 2. Font Size Selector (% 비율 기반 -> 10pt == 100% 환산 적용)
    fontSizeSelect.addEventListener('change', () => {
        const selectedVal = fontSizeSelect.value;
        const computedPt = calc_scaled_font_size(selectedVal, 10);
        if (typeof PreviewManager !== 'undefined' && typeof PreviewManager.applyPreviewFontSize === 'function') {
            PreviewManager.applyPreviewFontSize(preview, computedPt);
        } else if (preview) {
            preview.style.setProperty('--preview-font-size', computedPt);
        }
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

    // 💡 주: 복사 및 내보내기 버튼 이벤트는 FrameManager.init({ actions: { onCopy: ... } })를 통해 통합 처리됩니다.

    // ==========================================================================
    // 내보내기 드롭다운 토글 및 HTML 내보내기 기능
    // ==========================================================================
    // FrameManager UI Initialization & Action Delegation
    if (typeof FrameManager !== 'undefined' && typeof FrameManager.init === 'function') {
        FrameManager.init({
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
                    if (typeof PreviewManager !== 'undefined') {
                        if (!enabled) {
                            PreviewManager.removeColorSwatches(preview);
                        } else {
                            PreviewManager.injectColorSwatches(document, preview);
                        }
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
                        ExportManager.copyPreviewToClipboard(preview, exportMenu, btnExport);
                    }
                },
                onSave: () => handleSaveDirect(),
                onSaveAs: () => handleSaveCurrentDocument(),
                onExportHtml: () => {
                    if (typeof ExportManager !== 'undefined') {
                        ExportManager.downloadPreviewHtml(preview, currentFilename, collectExportOptions());
                    }
                },
                onExportPdfPrint: async () => {
                    if (typeof ExportManager !== 'undefined') {
                        window.assert_arg(typeof ExportManager.getPdfPrintNoticeMessage === 'function', 'ExportManager.getPdfPrintNoticeMessage function missing!', { ExportManager });
                        const pdfBannerMsg = ExportManager.getPdfPrintNoticeMessage();
                        showGlobalBottomBanner(pdfBannerMsg, false);
                        const exportOptions = collectExportOptions({ theme: 'light' });
                        try {
                            await ExportManager.printToPdf(preview, currentFilename, exportOptions);
                        } finally {
                            hideGlobalBottomBanner();
                        }
                    }
                },
                onExportPdfHtml2Pdf: () => {
                    if (typeof ExportManager !== 'undefined') {
                        if (btnExportPdfHtml2Pdf && btnExportPdfHtml2Pdf.disabled) return;
                        ExportManager.saveToPdfFile(preview, currentFilename, collectExportOptions());
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
                onJoinParagraphs: () => {
                    if (typeof EditorManager !== 'undefined') {
                        EditorManager.apply_paragraph_join(cm, () => renderMarkdown());
                    }
                },
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
                    if (typeof RecentFileManager !== 'undefined' && typeof RecentFileManager.addFile === 'function') {
                        RecentFileManager.addFile(file.name, file.path || file.name, handle, file.size);
                    }
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

    // 💡 주: btnOpenFile 클릭 이벤트는 FrameManager.init({ actions: { onOpenFile: ... } })를 통해 통합 처리됩니다.

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

        // 💡 주: 내보내기 및 문단 모으기/디버그 액션 버튼 클릭 이벤트는 
        // FrameManager.init({ actions: { ... } })를 통해 캡슐화 및 단일 바인딩되어 처리됩니다.

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
                if (typeof RecentFileManager !== 'undefined' && typeof RecentFileManager.addFile === 'function') {
                    RecentFileManager.addFile(file.name, file.path || file.webkitRelativePath || file.name, null, file.size);
                }
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
                if (typeof RecentFileManager !== 'undefined' && typeof RecentFileManager.addFile === 'function') {
                    RecentFileManager.addFile(targetFile.name, targetFile.path || targetFile.name, targetHandle, targetFile.size);
                }

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

    // 에디터 텍스트 파싱을 통한 TOC 리스트 빌드 및 렌더링 (TocManager 위임)
    function buildTOC() {
        if (!cm) return;
        if (typeof TocManager !== 'undefined' && typeof TocManager.render === 'function') {
            TocManager.render(cm.getValue(), cm);
        }
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
        const tocSidebarEl = document.getElementById('toc-sidebar');
        const tocWidth = tocSidebarEl && !tocSidebarEl.classList.contains('collapsed') ? tocSidebarEl.getBoundingClientRect().width : 0;
        const dividerWidth = 6;
        const availableWidth = containerRect.width - tocWidth - dividerWidth;
        
        if (availableWidth <= 0) return;
        
        // 에디터와 프리뷰가 동일한 너비를 갖도록 설정
        const targetEditorWidth = availableWidth / 2;
        const percentage = (targetEditorWidth / containerRect.width) * 100;
        
        editorPanel.style.width = `${percentage}%`;
        cm.refresh();
    }

    // 1단계 [Data Read Phase]: localStorage 세션 데이터 독립 수집
    const savedSessionData = read_saved_document_session();
    const hasSavedSession = !!savedSessionData;

    // 2단계 [Content Restore Phase]: 문서 내용 및 파일명 복원
    restore_document_content(savedSessionData);
    if (typeof RecentFileManager !== 'undefined' && typeof RecentFileManager.init === 'function') {
        RecentFileManager.init({
            actions: {
                onLoadSingleFile: (file, handle) => {
                    currentFileHandle = handle || null;
                    loadSingleFile(file);
                    isNewSessionSkippedRestore = false;
                },
                isFreshWindow: () => {
                    return isNewSessionSkippedRestore || (!isDirty && cm && cm.getValue().trim() === '' && !currentFileHandle);
                }
            }
        });
    }

    // 3단계 [Frame UI Restore Phase]: Frame UI 세팅 및 레이아웃 복원
    restore_frame_ui_settings(savedSessionData);

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
            window.assert_arg(typeof PreviewManager !== 'undefined' && typeof PreviewManager.setMathSupport === 'function', 'PreviewManager.setMathSupport is required!', { PreviewManager });
            PreviewManager.setMathSupport(mathRenderCheckbox.checked);
            renderMarkdown();
        });
    }

    // 다이어그램 토글 변경 시 이벤트 바인딩
    if (diagramRenderCheckbox) {
        diagramRenderCheckbox.addEventListener('change', () => {
            window.assert_arg(typeof PreviewManager !== 'undefined' && typeof PreviewManager.setDiagramSupport === 'function', 'PreviewManager.setDiagramSupport is required!', { PreviewManager });
            PreviewManager.setDiagramSupport(diagramRenderCheckbox.checked);
            renderMarkdown();
        });
    }

    // Color 스와치 토글 변경 시 이벤트 바인딩
    if (colorSwatchCheckbox) {
        colorSwatchCheckbox.addEventListener('change', () => {
            window.assert_arg(typeof PreviewManager !== 'undefined' && typeof PreviewManager.injectColorSwatches === 'function', 'PreviewManager.injectColorSwatches is required!', { PreviewManager });
            if (colorSwatchCheckbox.checked) {
                PreviewManager.injectColorSwatches(document, preview);
            } else {
                PreviewManager.removeColorSwatches(preview);
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
    async function handleSaveCurrentDocument() {
        if (!cm) return;
        triggerSaveSecurityNotice();
        const textContent = cm.getValue();
        try {
            await ExportManager.downloadCurrentContent(textContent, currentFilename, (savedName, handle) => {
                if (handle) {
                    currentFileHandle = handle; // 새로 지정된 저장 파일 핸들 갱신
                }
                updateFilenameDisplay(savedName, false);
                saveDocumentSession();
                showToast(`"${savedName}" 파일이 저장되었습니다.`, 1500);
            });
        } finally {
            hideGlobalBottomBanner(); // 저장 기능 종료 즉시 배너 닫기
        }
    }

    // [저장] 버튼: 직접 덮어쓰기 저장 (Direct Overwrite) 헬퍼 함수
    async function handleSaveDirect() {
        if (!cm) return;
        triggerSaveSecurityNotice();
        const textContent = cm.getValue();

        try {
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
                            showToast('파일 쓰기 권한이 거부되었습니다.', 1500);
                            return;
                        }
                    }

                    const writable = await currentFileHandle.createWritable();
                    await writable.write(textContent);
                    await writable.close();

                    updateFilenameDisplay(currentFileHandle.name, false);
                    saveDocumentSession();
                    showToast(`"${currentFileHandle.name}" 파일에 직접 저장되었습니다.`, 1500);
                    return;
                } catch (err) {
                    console.warn('직접 덮어쓰기 저장 실패, SaveAs 다이얼로그로 fallback 진행:', err);
                }
            }

            // 2. 파일 핸들이 없거나(새 파일 등) 덮어쓰기 실패 시 SaveAs 다이얼로그로 fallback
            await handleSaveCurrentDocument();
        } finally {
            hideGlobalBottomBanner(); // 저장 기능 종료 즉시 배너 닫기
        }
    }

    // 💡 주: btnSave 및 btnSaveAs 클릭 이벤트는 FrameManager.init({ actions: { onSave: ..., onSaveAs: ... } })를 통해 통합 처리됩니다.

    // 설정 모달 및 브라우저 레지스트리 다운로드 초기화 (SettingsManager 위임)
    if (typeof SettingsManager !== 'undefined') {
        SettingsManager.init();
    }

    // TOC 사이드바 토글 및 렌더링 제어기 초기화 (TocManager 위임)
    if (typeof TocManager !== 'undefined' && typeof TocManager.init === 'function') {
        TocManager.init({
            onSelectHeading: (lineNum) => {
                if (scrollSync) {
                    scrollSync.scrollToLine(lineNum);
                }
            }
        });
    }
    // Heading Modal & Toast Control System
    const dialogEls = (typeof window.StyleEditor !== 'undefined' && typeof window.StyleEditor.getDialogElements === 'function')
        ? window.StyleEditor.getDialogElements()
        : {};
    const modalHeadingSelect = dialogEls.presetSelect || document.getElementById('modal-heading-preset-select');

    function showToast(message, duration = 3000) {
        if (typeof FrameManager !== 'undefined' && typeof FrameManager.showToast === 'function') {
            FrameManager.showToast(message, duration);
        }
    }

    function renderHeadingModalControls(presetId) {
        window.assert_arg(typeof window.StyleEditor !== 'undefined' && typeof window.StyleEditor.renderControls === 'function', 'StyleEditor.renderControls function is required!', { StyleEditor: window.StyleEditor, presetId });
        window.StyleEditor.renderControls(presetId);
    }

    if (btnEditHeadingStyle) {
        btnEditHeadingStyle.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            if (viewMenu) viewMenu.classList.remove('show');
            if (exportMenu) exportMenu.classList.remove('show');
            if (mainMenu) mainMenu.classList.remove('show');
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
            
            // 스타일 편집 Dialog를 띄울 때 신규 프리셋이 누락되었는지 검사하여 추가
            syncNewHeadingPresets();
            
            updatePresetSelectOptions();
            const currentActive = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
            if (modalHeadingSelect) modalHeadingSelect.value = currentActive;
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

    if (headingPresetSelect) {
        headingPresetSelect.addEventListener('change', (e) => {
            applyHeadingPreset(e.target.value);
            renderMarkdown();
        });
    }

    if (modalHeadingSelect) {
        modalHeadingSelect.addEventListener('change', (e) => {
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
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
        const tempStyles = window.StyleEditor ? window.StyleEditor.collectCurrentInputs() : null;
        applyHeadingPreset(currentId, tempStyles);
    }

    function handleModalScroll(clientX, deltaY) {
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
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
        applyHeadingPreset(currentId);
        showToast(`'${presetName}' 스타일이 저장되었습니다.`);
    }

    function handlePresetSaveAndClose(presetName) {
        closeHeadingStyleModal();
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
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
            getPresetsData: getHeadingPresets,      // ◄ 1:1 함수 참조 매핑
            savePresetsData: saveHeadingPresets,    // ◄ 1:1 함수 참조 매핑
            onPresetChange: handlePresetChange,
            onLivePreview: handleLivePreview,
            onScroll: handleModalScroll,
            onSave: handlePresetSave,
            onSaveAndClose: handlePresetSaveAndClose,
            onAddPreset: handlePresetAdd,
            onDeletePreset: handlePresetDelete,
            onResetPreset: handlePresetReset,
            onThemeChange: applyTheme
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
            if (typeof TocManager !== 'undefined' && typeof TocManager.highlightActive === 'function') {
                TocManager.highlightActive(lineNum);
            }
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



