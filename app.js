document.addEventListener('DOMContentLoaded', async () => {
    // 💡 Step 1. 극초기 전처리: URL 쿼리 파라미터(?file=...) 더블클릭 파일 경로 캡처
    // [GATE-EXCEPTION] 게이트(11-39줄)보다 먼저 실행되는 부트스트랩 가드 — 제거 금지
    if (typeof SysEnvManager !== 'undefined' && typeof SysEnvManager.capturePendingExtensionFile === 'function') {
        SysEnvManager.capturePendingExtensionFile();
    }

    // 💡 Extension 환경 감지 및 비확장 모드 동기 사전 단증 (Fail-Fast Policy)
    // 확장 모드에서는 게이트 B(ensureExtensionOpenReady)의 5초 비동기 유예 정책에 전적으로 위임합니다.
    const isExtensionEnv = (typeof chrome !== 'undefined' && chrome && chrome.runtime && typeof chrome.runtime.id === 'string');

    if (!isExtensionEnv && typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
        // [GATE-EXCEPTION] 이 블록이 게이트 자체 — 이후 "가드 없이 직접 호출 안전" 전제의
        // 근거이므로 정책 적용 대상이 아니라 출처. 제거 금지
        const isCoreReady = (
            typeof FrameManager !== 'undefined' &&
            typeof ExportManager !== 'undefined' &&
            typeof PreviewManager !== 'undefined' &&
            typeof EditorManager !== 'undefined' &&
            typeof StylePresetManager !== 'undefined' &&
            typeof ScrollSyncManager !== 'undefined' &&
            typeof SettingsManager !== 'undefined'
        );

        window.assert_arg(
            isCoreReady,
            '[Web/File Standard Error] 필수 모듈 로드 실패! markdown_viewer.html의 6단계 스크립트 로딩 태그 순서를 점검하세요.',
            {
                isExtensionEnv: false,
                location: window.location.href,
                modulesStatus: {
                    FrameManager: typeof FrameManager,
                    ExportManager: typeof ExportManager,
                    PreviewManager: typeof PreviewManager,
                    EditorManager: typeof EditorManager,
                    StylePresetManager: typeof StylePresetManager,
                    ScrollSyncManager: typeof ScrollSyncManager,
                    SettingsManager: typeof SettingsManager
                }
            }
        );
    }

    // 전역 디버그 에러 핸들러는 frame-man.js 로드 직후 자체 수립되므로 여기서 재호출하지 않음

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



    // DOM Elements
    const editor = document.getElementById('editor');
    
    // Initialize CodeMirror v5 (dragDrop: false로 커서 위치 파일 텍스트 끼워넣기 차단)
    const cm = CodeMirror.fromTextArea(editor, {
        mode: 'markdown',
        lineNumbers: true,
        lineWrapping: true,
        dragDrop: false
    });

    // EditorManager 단축키 바인딩 전담 위임 (app.js에서 extraKeys 속성 완전 분리)
    EditorManager.initShortcuts(cm, {
        onFormatChange: (type) => {
            updateFilenameDisplay(currentFilename, true);
            renderMarkdown();
        },
        onParagraphJoin: () => {
            renderMarkdown();
        }
    });

    // 1. FrameManager UI 엘리먼트 자율 쿼리 및 바인딩 수신
    const frameElements = FrameManager.getElements();

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

    // ExportManager.collectOptions(elements, overrideOptions)에 주입할 DOM 엘리먼트 묶음
    const exportUiElements = {
        lineColorPicker,
        fontSizeSelect,
        fontSelect,
        togglePreviewMaxWidthCheckbox,
        colorSwatchCheckbox
    };



    function applyTheme(theme) {
        FrameManager.applyTheme(theme);
    }

    function initTheme() {
        FrameManager.initTheme();
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
        
        FrameManager.updateFilenameDisplay(name, isModified);

        if (name && name !== '제목 없음.md') {
            RecentFileManager.addFile(name, name);
        }
    }

    // 초기 파일명 뱃지 표시 설정
    updateFilenameDisplay(currentFilename, false);



    // ==========================================================================
    // Preview Max Width Limit Control (snake_case sub-function)
    // ==========================================================================
    function apply_preview_max_width_limit(isLimited = true) {
        PreviewManager.applyPreviewMaxWidthLimit(previewViewport, isLimited);
        FrameManager.applyPreviewMaxWidthLimit(isLimited);
    }

    // ==========================================================================
    // Session Auto-Save & Restore (Delegated to SessionManager in frame-man.js)
    // ==========================================================================
    const SessionManagerInstance = SessionManager;

    SessionManagerInstance.init();

    function saveDocumentSession() {
        if (!cm) return;
        try {
            SessionManagerInstance.saveSession(
                { cm: cm },
                { filename: currentFilename, isDirty: isDirty }
            );
        } catch (e) {
            console.warn('Failed to save document session:', e);
        }
    }

    // ==========================================================================
    // Heading Style Presets Multi-Set System (StylePresetManager)
    // ==========================================================================

    // ==========================================================================
    // Markdown & Syntax Highlight & Math Configuration
    // ==========================================================================
    
    PreviewManager.initMath({ mathRenderWrapper, mathRenderCheckbox });
    PreviewManager.initDiagrams({ diagramRenderWrapper, diagramRenderCheckbox });

    // Main Render Function with Line Mapping
    function renderMarkdown() {
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
    
    // ==========================================================================
    // Customization Settings Sync (Preview UI Controls via PreviewManager)
    // ==========================================================================
    const btnFontSizeUp = document.getElementById('btn-font-size-up');
    const btnFontSizeDown = document.getElementById('btn-font-size-down');

    PreviewManager.initUIControls({
        preview: preview,
        fontSelect: fontSelect,
        fontSizeSelect: fontSizeSelect,
        btnFontSizeUp: btnFontSizeUp,
        btnFontSizeDown: btnFontSizeDown,
        codeblockScrollCheckbox: codeblockScrollCheckbox,
        codeblockScrollWrapper: codeblockScrollWrapper,
        togglePreviewMaxWidthCheckbox: togglePreviewMaxWidthCheckbox,
        previewMaxWidthWrapper: previewMaxWidthWrapper
    }, {
        onSettingChange: () => saveDocumentSession(),
        onRefreshEditor: () => {
            if (cm && typeof cm.refresh === 'function') cm.refresh();
        }
    });

    // Line color dynamic theme variables update delegated to FrameManager.applyThemeColors(color)

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

    // 💡 주: 복사 및 내보내기 버튼 이벤트는 FrameManager.init({ actions: { onCopy: ... } })를 통해 통합 처리됩니다.

    // ==========================================================================
    // 내보내기 드롭다운 토글 및 HTML 내보내기 기능
    // ==========================================================================
    // FrameManager UI Initialization & Action Delegation
    FrameManager.init({
        actions: {
            onThemeChange: (theme) => {
                apply_code_theme(theme);
                const activePresetId = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
                StylePresetManager.applyPreset(activePresetId);
            },
            onPanelResize: () => {
                if (cm && typeof cm.refresh === 'function') cm.refresh();
            },
            onResizeComplete: () => {
                if (cm && typeof cm.refresh === 'function') cm.refresh();
                saveDocumentSession();
            },
            onColorSwatchToggle: (enabled) => {
                if (!enabled) {
                    PreviewManager.removeColorSwatches(preview);
                } else {
                    PreviewManager.injectColorSwatches(document, preview);
                }
            },
            // [INIT-ORDER] 세션 복원 시 ScrollSyncManager.init() 이전에 frame-man.js의
            // restore_frame_settings_ui가 직접 호출할 수 있음 — 안전(scroll-sync.js _instance 가드)
            onScrollSyncToggle: (enabled) => {
                enableScrollSync = enabled;
                ScrollSyncManager.setEnable(enabled);
            },
            onNewFile: () => handleNewFile(),
            onOpenFile: () => trigger_open_file_dialog(),
            onCopy: () => {
                ClipboardManager.copyPreview(preview, exportMenu, btnExport);
            },
            onSave: () => handleSaveDirect(),
            onSaveAs: () => handleSaveCurrentDocument(),
            onExportHtml: () => {
                ExportManager.downloadPreviewHtml(preview, currentFilename, ExportManager.collectOptions(exportUiElements));
            },
            onExportPdfPrint: async () => {
                window.assert_arg(typeof ExportManager.getPdfPrintNoticeMessage === 'function', 'ExportManager.getPdfPrintNoticeMessage function missing!', { ExportManager });
                const pdfBannerMsg = ExportManager.getPdfPrintNoticeMessage();
                SysEnvManager.showNotice(pdfBannerMsg, false);
                const exportOptions = ExportManager.collectOptions(exportUiElements, { theme: 'light' });
                try {
                    await ExportManager.printToPdf(preview, currentFilename, exportOptions);
                } finally {
                    SysEnvManager.hideNotice();
                }
            },
            onExportPdfHtml2Pdf: () => {
                if (btnExportPdfHtml2Pdf && btnExportPdfHtml2Pdf.disabled) return;
                ExportManager.saveToPdfFile(preview, currentFilename, ExportManager.collectOptions(exportUiElements));
            },
            onOpenNewWindow: () => {
                ExportManager.openPreviewHtmlInNewWindow(preview, currentFilename, ExportManager.collectOptions(exportUiElements));
            },
            onOpenNewWindowDefault: () => {
                ExportManager.openDefaultPreviewHtmlInNewWindow(preview, currentFilename);
            },
            onJoinParagraphs: () => {
                EditorManager.apply_paragraph_join(cm, () => renderMarkdown());
            },
            onToggleDebug: () => toggle_debug_panel()
        }
    });

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
                    RecentFileManager.addFile(file.name, file.path || file.name, handle, file.size);
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

    // 💡 주: 내보내기 옵션 수집(collectExportOptions)은 export-man.js의
    // ExportManager.collectOptions(exportUiElements, overrideOptions)로 이전되었습니다.

        // 💡 주: 내보내기 및 문단 모으기/디버그 액션 버튼 클릭 이벤트는 
        // FrameManager.init({ actions: { ... } })를 통해 캡슐화 및 단일 바인딩되어 처리됩니다.

    // ==========================================================================
    // Drag & Drop Markdown File Loading Logic (Delegated to FileDropManager)
    // ==========================================================================

    const editorContainer = document.querySelector('.editor-container');

    const FileDropManagerInstance = FileDropManager;

    function isFreshWindow() {
        const skipped = SessionManagerInstance.isNewSessionSkippedRestore();
        return skipped || (!isDirty && cm && cm.getValue().trim() === '' && !currentFileHandle);
    }

    if (FileDropManagerInstance) {
        FileDropManagerInstance.init({
            editorContainerEl: editorContainer,
            callbacks: {
                isFreshWindow,
                onFileExtracted: function(file, handle) {
                    RecentFileManager.addFile(file.name, file.path || file.name, handle, file.size);
                },
                onFileLoaded: function(content, file, handle) {
                    if (handle) currentFileHandle = handle;
                    cm.setValue(content);
                    updateFilenameDisplay(file.name, false);
                    RecentFileManager.addFile(file.name, file.path || file.webkitRelativePath || file.name, handle, file.size);
                    renderMarkdown();
                    saveDocumentSession();

                    cm.scrollTo(0, 0);
                    const previewViewport = document.querySelector('.preview-viewport');
                    if (previewViewport) {
                        previewViewport.scrollTop = 0;
                        previewViewport.scrollLeft = 0;
                    }
                    SessionManagerInstance.setNewSessionSkippedRestore(false);
                },
                onOpenNewWindow: function(file, handle) {
                    const originUrl = new URL(window.location.origin + window.location.pathname);
                    originUrl.searchParams.set('openRecent', file.name);
                    window.open(originUrl.toString(), '_blank');
                }
            }
        });

        function loadSingleFile(file) {
            FileDropManagerInstance.loadSingleFile(file);
        }

        if (editorContainer) {
            editorContainer.addEventListener('drop', (e) => {
                FileDropManagerInstance.handleDropEvent(e);
            });
        }

        if (cm) {
            cm.on('drop', (cmInstance, e) => {
                e.preventDefault();
                if (typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                FileDropManagerInstance.handleDropEvent(e);
            });
        }
    }

    // 숨김 파일 인풋 change 이벤트 연동 (md 불러오기)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                currentFileHandle = null;
                FileDropManagerInstance.loadSingleFile(files[0]);
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
        FrameManager.updateDebugPanel(keyframesList, activeSource);
    }

    function toggle_debug_panel() {
        FrameManager.toggleDebugPanel((isOpen) => {
            if (isOpen) {
                ScrollSyncManager.rebuildKeyframes('Keyframe Button Toggle');
            }
        });
    }

    function updateDebugPanel() {
        const activeSync = ScrollSyncManager.getInstance();
        if (activeSync) {
            updateDebugPanelUI(activeSync.keyframes, activeSync.activeScrollSource);
        }
    }

    // 에디터 텍스트 파싱을 통한 TOC 리스트 빌드 및 렌더링 (TocManager 위임)
    function buildTOC() {
        if (!cm) return;
        TocManager.render(cm.getValue(), cm);
    }

    // ==========================================================================
    // 초기 렌더링 및 이벤트 등록 (Scroll Sync 초기화 지연 방지를 위해 가장 하단에 배치)
    // ==========================================================================
    // [PENDING-OPEN] 탐색기 더블클릭(window.loadedFileContent)으로 로드된 파일은 여기서
    // 즉시 반영하지 않는다 — Editor/Frame/Preview 전체 초기화가 끝난 뒤 게이트 콜백(Step 9,
    // initExtensionModulesAndPendingOpen)에서만 반영해야 세션 복원(아래)에 덮어써지지 않는다.

    // 에디터와 프리뷰 패널 너비를 동일하게 맞추는 초기화 함수 (FrameManager 위임 & Flicker-Free)
    function initializePanelWidths() {
        const savedWidth = (savedSessionData && savedSessionData.editorPanelWidth) ? savedSessionData.editorPanelWidth : null;
        return FrameManager.initializePanelWidths(container, editorPanel, cm, savedWidth);
    }

    // 1단계 [Data Read Phase]: localStorage 세션 데이터 수집 (SessionManager)
    const savedSessionData = SessionManagerInstance.readData();
    const hasSavedSession = !!savedSessionData;

    // 2단계 [Content Restore Phase]: 문서 내용 및 파일명 복원 (SessionManager)
    if (savedSessionData) {
        SessionManagerInstance.restoreContent(cm, savedSessionData, {
            onUpdateFilename: (name, isModified) => updateFilenameDisplay(name, isModified)
        });
    }

    RecentFileManager.init({
        actions: {
            onLoadSingleFile: (file, handle) => {
                currentFileHandle = handle || null;
                loadSingleFile(file);
                SessionManagerInstance.setNewSessionSkippedRestore(false);
            },
            isFreshWindow
        }
    });

    // 3단계 [Frame UI Restore Phase]: Frame UI 세팅 및 레이아웃 복원 (SessionManager)
    if (savedSessionData) {
        SessionManagerInstance.restoreUI(savedSessionData);
    }

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
            PreviewManager.setMathSupport(mathRenderCheckbox.checked);
            renderMarkdown();
        });
    }

    // 다이어그램 토글 변경 시 이벤트 바인딩
    if (diagramRenderCheckbox) {
        diagramRenderCheckbox.addEventListener('change', () => {
            PreviewManager.setDiagramSupport(diagramRenderCheckbox.checked);
            renderMarkdown();
        });
    }

    // Color 스와치 토글 변경 시 이벤트 바인딩
    if (colorSwatchCheckbox) {
        colorSwatchCheckbox.addEventListener('change', () => {
            if (colorSwatchCheckbox.checked) {
                PreviewManager.injectColorSwatches(document, preview);
            } else {
                PreviewManager.removeColorSwatches(preview);
            }
            saveDocumentSession();
        });
    }

    // 🚨 상부 FrameManager 초기화 통과 여부 사전 단증 장치 (중도 스코프/문법 차단 검출)
    // [GATE-EXCEPTION] 크로스 스크립트 로딩이 아닌 FrameManager.init() 완료 여부를
    // 확인하는 별개 관심사 — 게이트 정책과 무관
    window.assert_arg(
        typeof FrameManager !== 'undefined' && FrameManager.isInitialized === true,
        'Critical Initialization Error: FrameManager.init was skipped or interrupted prior to registering bottom listeners!',
        { isInitialized: typeof FrameManager !== 'undefined' ? FrameManager.isInitialized : false }
    );

    // 스크롤 동기화 토글 변경 시 이벤트 바인딩
    if (scrollSyncCheckbox) {
        scrollSyncCheckbox.addEventListener('change', () => {
            enableScrollSync = scrollSyncCheckbox.checked;
            ScrollSyncManager.setEnable(enableScrollSync);
            if (enableScrollSync) {
                ScrollSyncManager.syncPreviewToCursor();
            }
            saveDocumentSession();
        });
    }

    const SAVE_SECURITY_NOTICE = '[App] 브라우저 보안사항으로 파일 접근 권한에 대한 확인창이 뜰 수 있습니다. ';

    function triggerSaveSecurityNotice() {
        SysEnvManager.showNotice(SAVE_SECURITY_NOTICE, false);
    }

    function dismissSaveSecurityNoticeDelayed(delayMs = 1000) {
        setTimeout(() => {
            SysEnvManager.hideNotice();
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
            SysEnvManager.hideNotice();
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
            SysEnvManager.hideNotice();
        }
    }

    // 💡 주: btnSave 및 btnSaveAs 클릭 이벤트는 FrameManager.init({ actions: { onSave: ..., onSaveAs: ... } })를 통해 통합 처리됩니다.

    // 설정 모달 및 브라우저 레지스트리 다운로드 초기화 (SettingsManager 위임)
    SettingsManager.init();

    // TOC 사이드바 토글 및 렌더링 제어기 초기화 (TocManager 위임)
    TocManager.init({
        onSelectHeading: (lineNum) => {
            ScrollSyncManager.scrollToLine(lineNum);
        }
    });
    // Heading Modal & Toast Control System
    const dialogEls = (typeof window.StyleEditor !== 'undefined' && typeof window.StyleEditor.getDialogElements === 'function')
        ? window.StyleEditor.getDialogElements()
        : {};
    const modalHeadingSelect = dialogEls.presetSelect || document.getElementById('modal-heading-preset-select');

    function showToast(message, duration = 3000) {
        FrameManager.showToast(message, duration);
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
            StylePresetManager.syncPresets();
            
            StylePresetManager.updateSelects();
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
            StylePresetManager.applyPreset(e.target.value);
            renderMarkdown();
        });
    }

    if (modalHeadingSelect) {
        modalHeadingSelect.addEventListener('change', (e) => {
            renderHeadingModalControls(e.target.value);
            StylePresetManager.applyPreset(e.target.value);
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
        StylePresetManager.applyPreset(presetId);
    }

    function handleLivePreview() {
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
        const tempStyles = window.StyleEditor ? window.StyleEditor.collectCurrentInputs() : null;
        StylePresetManager.applyPreset(currentId, tempStyles);
    }

    function handleModalScroll(clientX, deltaY) {
        const boundaryX = dragDivider 
            ? dragDivider.getBoundingClientRect().left 
            : window.innerWidth / 2;
            
        if (clientX < boundaryX) {
            if (cm) {
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
        StylePresetManager.applyPreset(currentId);
        showToast(`'${presetName}' 스타일이 저장되었습니다.`);
    }

    function handlePresetSaveAndClose(presetName) {
        closeHeadingStyleModal();
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
        StylePresetManager.applyPreset(currentId);
        
        // 모달 닫기 후 에디터 활성화 복원 및 리프레시 보장
        if (cm) {
            cm.focus();
            requestAnimationFrame(() => {
                cm.refresh();
            });
        }
        
        showToast(`'${presetName}' 스타일이 적용되었습니다.`);
    }

    function handlePresetAdd(newId, newName) {
        renderHeadingModalControls(newId);
        showToast(`'${newName}' 스타일이 생성되었습니다.`);
    }

    function handlePresetDelete(nextId, deletedName) {
        renderHeadingModalControls(nextId);
        showToast(`'${deletedName}' 스타일이 삭제되었습니다.`);
    }

    function handlePresetReset(presetId, presetName) {
        StylePresetManager.resetPreset(presetId);
        renderHeadingModalControls(presetId);
        showToast(`'${presetName}' 스타일이 초기 기본값으로 복원되었습니다.`);
    }

    if (window.StyleEditor) {
        window.StyleEditor.init({
            getPresetsData: StylePresetManager.getPresets,      // ◄ 1:1 함수 참조 매핑
            savePresetsData: StylePresetManager.savePresets,    // ◄ 1:1 함수 참조 매핑
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

    // ==========================================================================
    // Step 3. 오픈 준비 완비 보장 & 모듈/파일 렌더링 게이트웨이
    // ==========================================================================
    const initExtensionModulesAndPendingOpen = (loadedFileContent, pendingPath) => {
        // 1. 문서 시작 시 Heading Preset 초기화 및 적용
        StylePresetManager.updateSelects();
        const activePreset = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
        StylePresetManager.applyPreset(activePreset);

        // 2. 펜딩 파일이 있으면 최초 렌더 전에 먼저 반영한다 — ScrollSyncManager가 처음부터
        // 최종 내용 기준으로 키프레임을 계산하도록, 렌더는 아래에서 한 번만 수행한다.
        // [PENDING-OPEN] 초기화 도중(세션 복원 등)에는 절대 반영하지 않는 것이 설계 의도.
        if (loadedFileContent && typeof loadedFileContent.content === 'string') {
            cm.setValue(loadedFileContent.content);
            updateFilenameDisplay(loadedFileContent.name, false);
            SessionManagerInstance.setNewSessionSkippedRestore(true);
        }

        // 3. `?file=` 펜딩 경로(레거시) — 내용 반영 로직은 아직 없음, 파일명만 갱신
        if (pendingPath) {
            const fileName = pendingPath.split(/[/\\]/).pop() || pendingPath;
            updateFilenameDisplay(fileName, false);
            console.log('🔗 Step 3: Standard file loader safely executed for pending path:', pendingPath);
        }

        // 4. CodeMirror 레이아웃을 먼저 확정한 뒤 ScrollSync를 초기화한다 — ScrollSyncManager가
        // cm.refresh() 이전의 stale한 레이아웃 측정값으로 키프레임을 계산하지 않도록.
        if (cm && typeof cm.refresh === 'function') {
            cm.refresh();
        }

        // 5. 프리뷰 마크다운 HTML 및 DOM 렌더링 완성 (최종 내용 기준, 단 한 번만)
        renderMarkdown();

        // 6. 최종 내용·레이아웃이 모두 확정된 후 ScrollSync 인스턴스 초기화 (cm, preview 인자 명시 전달)
        // [INIT-ORDER] 이 호출 이전에도 세션 복원 등으로 ScrollSyncManager가 호출될 수 있음(scroll-sync.js _instance 가드 참고)
        scrollSync = ScrollSyncManager.init(cm, preview, {
            previewViewport: document.querySelector('.preview-viewport'),
            enableScrollSync: enableScrollSync,
            onActiveLineChange: (lineNum) => {
                TocManager.highlightActive(lineNum);
            },
            onDebugUpdate: (keyframes, activeSource) => {
                if (typeof updateDebugPanelUI === 'function') {
                    updateDebugPanelUI(keyframes, activeSource);
                }
            },
            onToast: (msg) => {
                if (typeof showToast === 'function') {
                    showToast(msg, 2000);
                }
            }
        });
        if (typeof window !== 'undefined') {
            window.scrollSync = scrollSync;
        }
    };

    // 펜딩 파일(loadedFileContent/pendingPath)을 캡처해 초기화를 진행하는 공통 처리부.
    // 비확장 모드와, 확장 모드에서 게이트 B를 쓸 수 없는 극단적 폴백이 동일한 로직을 쓰므로 공유한다.
    function proceedWithPendingFile() {
        const loadedFileContent = window.loadedFileContent;
        window.loadedFileContent = null;
        const pendingPath = (typeof SysEnvManager !== 'undefined' && typeof SysEnvManager.clearPendingExtensionFile === 'function')
            ? SysEnvManager.clearPendingExtensionFile()
            : null;
        initExtensionModulesAndPendingOpen(loadedFileContent, pendingPath);
    }

    // 중앙 게이트웨이를 통해 모듈 완비 대기 후 정돈된 바인딩 실행!
    // [GATE-EXCEPTION] 비확장 모드는 게이트 A(위)가 이미 동기적으로 모듈 준비를 확인했으므로,
    // 게이트 B(ensureExtensionOpenReady, 비동기 5초 폴링)를 거칠 필요가 없다.
    const canUseGateB = isExtensionEnv && typeof SysEnvManager !== 'undefined' && typeof SysEnvManager.ensureExtensionOpenReady === 'function';

    if (canUseGateB) {
        const { ready, missing } = await SysEnvManager.ensureExtensionOpenReady();
        if (ready) {
            proceedWithPendingFile();
        } else {
            console.error('🚨 Extension Entry Module Error: Failed to load modules in time:', missing);
            if (typeof SysEnvManager.showSystemError === 'function') {
                SysEnvManager.showSystemError(`[Module Load Error] 일부 필수 모듈(${missing.join(', ')}) 로딩이 지연되었습니다. 페이지를 새로고침(F5) 해주세요.`);
            }
        }
    } else {
        // 비확장 모드, 또는 확장 모드인데 SysEnvManager.ensureExtensionOpenReady 자체가 없는 극단적 폴백
        proceedWithPendingFile();
    }
});



