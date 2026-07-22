document.addEventListener('DOMContentLoaded', () => {
    // 디버그용 전역 에러 핸들러 (localStorage 로그 기록 기능 포함)
    window.onerror = function(message, source, lineno, colno, error) {
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

    // DOM Elements
    const editor = document.getElementById('editor');
    
    // Initialize CodeMirror v5
    const cm = CodeMirror.fromTextArea(editor, {
        mode: 'markdown',
        lineNumbers: true,
        lineWrapping: true,
        theme: 'default',
        viewportMargin: Infinity,
        extraKeys: {
            "Tab": function(cm) {
                cm.replaceSelection("    ");
            },
            "Cmd-B": function(cm) {
                insertFormatting('bold');
            },
            "Ctrl-B": function(cm) {
                insertFormatting('bold');
            },
            "Cmd-I": function(cm) {
                insertFormatting('italic');
            },
            "Ctrl-I": function(cm) {
                insertFormatting('italic');
            },
            "Alt-Q": function(cm) {
                if (typeof joinParagraphsAction === 'function') {
                    joinParagraphsAction();
                }
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
    const mathRenderCheckbox = document.getElementById('math-render');
    const mathRenderWrapper = document.getElementById('math-render-wrapper');
    const diagramRenderCheckbox = document.getElementById('diagram-render');
    const diagramRenderWrapper = document.getElementById('diagram-render-wrapper');
    const btnCopy = document.getElementById('btn-copy');
    const btnSave = document.getElementById('btn-save');
    const btnDebug = document.getElementById('btn-debug');
    const exportDropdown = document.getElementById('export-dropdown');
    const btnExport = document.getElementById('btn-export');
    const exportMenu = document.getElementById('export-menu');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnOpenNewWindow = document.getElementById('btn-open-new-window');
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
        if (container) {
            container.setAttribute('data-editor-theme', theme);
        }
        document.documentElement.setAttribute('data-editor-theme', theme);
        localStorage.setItem('markvi_editor_theme', theme);

        if (theme === 'dark') {
            if (themeIconSun) themeIconSun.style.display = 'none';
            if (themeIconMoon) themeIconMoon.style.display = 'inline-block';
            if (themeToggleText) themeToggleText.textContent = 'Dark';
        } else {
            if (themeIconSun) themeIconSun.style.display = 'inline-block';
            if (themeIconMoon) themeIconMoon.style.display = 'none';
            if (themeToggleText) themeToggleText.textContent = 'Light';
        }

        const activePresetId = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
        applyHeadingPreset(activePresetId);
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('markvi_editor_theme') || 'dark';
        applyTheme(savedTheme);
    }

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const currentTheme = (container && container.getAttribute('data-editor-theme')) || document.documentElement.getAttribute('data-editor-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        });
    }

    initTheme();

    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    
    // 에디터 파일 관련 변수 및 상태 플래그
    let currentFilename = '제목 없음.md';
    let isDirty = false;
    let isSyncing = false;
    let enableScrollSync = true;

    // 파일 이름 표시 및 상태 변경 함수
    function updateFilenameDisplay(name, isModified) {
        currentFilename = name;
        isDirty = isModified;
        const filenameSpan = document.getElementById('current-filename');
        const fileBadge = document.getElementById('file-badge');
        
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
    }

    // 초기 파일명 뱃지 표시 설정
    updateFilenameDisplay(currentFilename, false);

    // ==========================================================================
    // Session Auto-Save & Restore (Content, Filename, Split Width, Views)
    // ==========================================================================
    const SESSION_STORAGE_KEY = 'markvi_document_session';

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
                lineColor: lineColorPicker ? lineColorPicker.value : ''
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

            // 1. Content Restore
            if (typeof session.content === 'string' && session.content.length > 0) {
                cm.setValue(session.content);
            }

            // 2. Filename & Status Restore
            if (session.filename) {
                updateFilenameDisplay(session.filename, !!session.isDirty);
            }

            // 3. Panel Split Width Restore
            if (session.editorWidthPercent && editorPanel) {
                editorPanel.style.width = session.editorWidthPercent;
                if (typeof cm.refresh === 'function') cm.refresh();
            }

            // 4. Font Family Restore
            if (session.fontFamily && fontSelect) {
                fontSelect.value = session.fontFamily;
                if (preview) preview.style.setProperty('--preview-font-family', session.fontFamily);
            }

            // 5. Font Size Restore
            if (session.fontSize && fontSizeSelect) {
                fontSizeSelect.value = session.fontSize;
                if (preview) preview.style.setProperty('--preview-font-size', session.fontSize);
                document.documentElement.style.setProperty('--editor-font-size', session.fontSize);
            }

            // 6. Line Color Restore
            if (session.lineColor && lineColorPicker) {
                lineColorPicker.value = session.lineColor;
                if (typeof updateThemeColors === 'function') {
                    updateThemeColors(session.lineColor);
                }
            }
        } catch (e) {
            console.warn('Failed to restore document session:', e);
        }
    }

    // ==========================================================================
    // Heading Style Presets Multi-Set System (Minimum 5 Sets)
    // ==========================================================================
    const DEFAULT_HEADING_PRESETS = [
        {
            id: 'github_classic',
            name: '1. GitHub Classic',
            styles: {
                h1: { colorLight: '#1d4ed8', colorDark: '#3b82f6', size: '2em', border: '1px solid #334155' },
                h2: { colorLight: '#0369a1', colorDark: '#0284c7', size: '1.5em', border: '1px solid #334155' },
                h3: { colorLight: '#0f172a', colorDark: '#f1f5f9', size: '1.25em', border: 'none' },
                h4: { colorLight: '#334155', colorDark: '#cbd5e1', size: '1em', border: 'none' },
                h5: { colorLight: '#475569', colorDark: '#94a3b8', size: '0.875em', border: 'none' },
                h6: { colorLight: '#64748b', colorDark: '#64748b', size: '0.85em', border: 'none' },
                link: { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' },
                strong: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                em: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                code: { colorLight: '#0969da', colorDark: '#38bdf8' },
                blockquote: { colorLight: '#475569', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
            }
        },
        {
            id: 'ocean_breeze',
            name: '2. Ocean Breeze (오션)',
            styles: {
                h1: { colorLight: '#0369a1', colorDark: '#38bdf8', size: '2.2em', border: '2px solid #38bdf8' },
                h2: { colorLight: '#0284c7', colorDark: '#7dd3fc', size: '1.6em', border: '1px dashed #7dd3fc' },
                h3: { colorLight: '#0ea5e9', colorDark: '#bae6fd', size: '1.3em', border: 'none' },
                h4: { colorLight: '#0369a1', colorDark: '#e0f2fe', size: '1.1em', border: 'none' },
                h5: { colorLight: '#1e3a8a', colorDark: '#f0f9ff', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#0284c7', colorDark: '#38bdf8', decoration: 'none' },
                strong: { colorLight: '#0369a1', colorDark: '#38bdf8' },
                em: { colorLight: '#0284c7', colorDark: '#7dd3fc' },
                code: { colorLight: '#0284c7', colorDark: '#38bdf8' },
                blockquote: { colorLight: '#0369a1', colorDark: '#bae6fd', borderLight: '#0284c7', borderDark: '#38bdf8' },
                line: { colorLight: '#38bdf8', colorDark: '#0ea5e9', border: '2px solid #38bdf8' }
            }
        },
        {
            id: 'emerald_forest',
            name: '3. Emerald Forest (에메랄드)',
            styles: {
                h1: { colorLight: '#047857', colorDark: '#34d399', size: '2.2em', border: '2px solid #059669' },
                h2: { colorLight: '#059669', colorDark: '#6ee7b7', size: '1.6em', border: '1px solid #10b981' },
                h3: { colorLight: '#10b981', colorDark: '#a7f3d0', size: '1.3em', border: 'none' },
                h4: { colorLight: '#047857', colorDark: '#d1fae5', size: '1.1em', border: 'none' },
                h5: { colorLight: '#064e3b', colorDark: '#ecfdf5', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#059669', colorDark: '#34d399', decoration: 'none' },
                strong: { colorLight: '#047857', colorDark: '#34d399' },
                em: { colorLight: '#059669', colorDark: '#6ee7b7' },
                code: { colorLight: '#059669', colorDark: '#34d399' },
                blockquote: { colorLight: '#047857', colorDark: '#a7f3d0', borderLight: '#059669', borderDark: '#34d399' },
                line: { colorLight: '#059669', colorDark: '#10b981', border: '2px solid #059669' }
            }
        },
        {
            id: 'crimson_elegant',
            name: '4. Crimson Elegant (크림슨)',
            styles: {
                h1: { colorLight: '#be123c', colorDark: '#fb7185', size: '2.2em', border: '2px solid #e11d48' },
                h2: { colorLight: '#e11d48', colorDark: '#fda4af', size: '1.6em', border: '1px solid #f43f5e' },
                h3: { colorLight: '#f43f5e', colorDark: '#fecdd3', size: '1.3em', border: 'none' },
                h4: { colorLight: '#be123c', colorDark: '#ffe4e6', size: '1.1em', border: 'none' },
                h5: { colorLight: '#881337', colorDark: '#fff1f2', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#e11d48', colorDark: '#fb7185', decoration: 'underline' },
                strong: { colorLight: '#be123c', colorDark: '#fb7185' },
                em: { colorLight: '#e11d48', colorDark: '#fda4af' },
                code: { colorLight: '#e11d48', colorDark: '#fb7185' },
                blockquote: { colorLight: '#881337', colorDark: '#fecdd3', borderLight: '#e11d48', borderDark: '#fb7185' },
                line: { colorLight: '#e11d48', colorDark: '#f43f5e', border: '2px solid #e11d48' }
            }
        },
        {
            id: 'violet_modern',
            name: '5. Violet Modern (바이올렛)',
            styles: {
                h1: { colorLight: '#6d28d9', colorDark: '#a78bfa', size: '2.2em', border: '2px solid #7c3aed' },
                h2: { colorLight: '#7c3aed', colorDark: '#c4b5fd', size: '1.6em', border: '1px dashed #8b5cf6' },
                h3: { colorLight: '#8b5cf6', colorDark: '#ddd6fe', size: '1.3em', border: 'none' },
                h4: { colorLight: '#6d28d9', colorDark: '#ede9fe', size: '1.1em', border: 'none' },
                h5: { colorLight: '#4c1d95', colorDark: '#f5f3ff', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#7c3aed', colorDark: '#a78bfa', decoration: 'none' },
                strong: { colorLight: '#6d28d9', colorDark: '#a78bfa' },
                em: { colorLight: '#7c3aed', colorDark: '#c4b5fd' },
                code: { colorLight: '#7c3aed', colorDark: '#a78bfa' },
                blockquote: { colorLight: '#4c1d95', colorDark: '#ddd6fe', borderLight: '#7c3aed', borderDark: '#a78bfa' },
                line: { colorLight: '#7c3aed', colorDark: '#8b5cf6', border: '2px dashed #8b5cf6' }
            }
        },
        {
            id: 'codemirror_classic',
            name: '6. CodeMirror Classic',
            styles: {
                h1: { colorLight: '#1d4ed8', colorDark: '#3b82f6', size: '2em', border: '1px solid #334155' },
                h2: { colorLight: '#0369a1', colorDark: '#0284c7', size: '1.5em', border: '1px solid #334155' },
                h3: { colorLight: '#0f172a', colorDark: '#f1f5f9', size: '1.25em', border: 'none' },
                h4: { colorLight: '#334155', colorDark: '#cbd5e1', size: '1em', border: 'none' },
                h5: { colorLight: '#475569', colorDark: '#94a3b8', size: '0.875em', border: 'none' },
                h6: { colorLight: '#64748b', colorDark: '#64748b', size: '0.85em', border: 'none' },
                link: { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' },
                strong: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                em: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                code: { colorLight: '#e11d48', colorDark: '#fb7185' },
                blockquote: { colorLight: '#4b5563', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
            }
        }
    ];

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
        return DEFAULT_HEADING_PRESETS;
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
                    DEFAULT_HEADING_PRESETS.forEach(defPreset => {
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

    function applyHeadingPreset(presetId) {
        const presets = getHeadingPresets();
        const found = presets.find(p => p.id === presetId) || presets[0];
        if (!found || !found.styles) return;

        const styles = found.styles;
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-editor-theme') || 'dark';

        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
            if (styles[tag]) {
                const styleObj = styles[tag];
                const targetColor = currentTheme === 'light'
                    ? (styleObj.colorLight || styleObj.color || '#1d4ed8')
                    : (styleObj.colorDark || styleObj.color || '#3b82f6');

                root.style.setProperty(`--${tag}-color`, targetColor);
                if (styleObj.size) root.style.setProperty(`--${tag}-size`, styleObj.size);
                if (styleObj.border) root.style.setProperty(`--${tag}-border`, styleObj.border);
            }
        });

        // 🔗 HyperLink / 대괄호 적용
        if (styles.link) {
            const linkObj = styles.link;
            const targetLinkColor = currentTheme === 'light'
                ? (linkObj.colorLight || linkObj.color || '#0969da')
                : (linkObj.colorDark || linkObj.color || '#38bdf8');
            root.style.setProperty('--link-color', targetLinkColor);
            root.style.setProperty('--link-decoration', linkObj.decoration || 'underline');
        }

        // 💪 굵게 (Strong / Bold)
        if (styles.strong) {
            const boldObj = styles.strong;
            const targetBoldColor = currentTheme === 'light'
                ? (boldObj.colorLight || boldObj.color || '#0f172a')
                : (boldObj.colorDark || boldObj.color || '#f8fafc');
            root.style.setProperty('--bold-color', targetBoldColor);
        }

        // ✨ 기울임 (Em / Italic)
        if (styles.em) {
            const emObj = styles.em;
            const targetItalicColor = currentTheme === 'light'
                ? (emObj.colorLight || emObj.color || '#0f172a')
                : (emObj.colorDark || emObj.color || '#f8fafc');
            root.style.setProperty('--italic-color', targetItalicColor);
        }

        // 💻 ` ` Inline code
        if (styles.code) {
            const codeObj = styles.code;
            const targetCodeColor = currentTheme === 'light'
                ? (codeObj.colorLight || codeObj.color || '#0969da')
                : (codeObj.colorDark || codeObj.color || '#38bdf8');
            root.style.setProperty('--code-color', targetCodeColor);
        }

        // 💬 인용문 (Blockquote)
        if (styles.blockquote) {
            const bqObj = styles.blockquote;
            const targetBqColor = currentTheme === 'light'
                ? (bqObj.colorLight || bqObj.color || '#475569')
                : (bqObj.colorDark || bqObj.color || '#cbd5e1');
            const targetBqBorder = currentTheme === 'light'
                ? (bqObj.borderLight || bqObj.borderColor || '#0969da')
                : (bqObj.borderDark || bqObj.borderColor || '#38bdf8');
            root.style.setProperty('--blockquote-text-color', targetBqColor);
            root.style.setProperty('--blockquote-border-color', targetBqBorder);
        }

        // ➖ Line (선 색상/구분선) 적용
        if (styles.line) {
            const lineObj = styles.line;
            const targetLineColor = currentTheme === 'light'
                ? (lineObj.colorLight || lineObj.color || '#cbd5e1')
                : (lineObj.colorDark || lineObj.color || '#334155');
            root.style.setProperty('--line-color', targetLineColor);
            root.style.setProperty('--line-border', lineObj.border || '1px solid #334155');
            root.style.setProperty('--theme-color', targetLineColor);
        }

        localStorage.setItem('markvi_active_heading_preset', presetId);

        const headingSelect = document.getElementById('heading-preset-select');
        const modalSelect = document.getElementById('modal-heading-preset-select');
        if (headingSelect) headingSelect.value = presetId;
        if (modalSelect) modalSelect.value = presetId;
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
            
            // 렌더링 완료 후 초기 주요 헤더들로 키프레임 목록 구축
            rebuildInitialKeyframes();
            
            // 렌더링 완료 후 커서가 있는 줄의 프리뷰 가시성 자동 보정 실행
            syncPreviewToCursor();

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
    let isDragging = false;

    function startDrag(e) {
        isDragging = true;
        dragDivider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        // Touch events compatibility
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    }

    function drag(e) {
        if (!isDragging) return;
        
        // Get clientX from mouse or touch event
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const containerRect = container.getBoundingClientRect();
        
        // TOC 사이드바의 실제 점유 폭 계산
        const tocSidebar = document.getElementById('toc-sidebar');
        const tocWidth = tocSidebar && !tocSidebar.classList.contains('collapsed') ? tocSidebar.getBoundingClientRect().width : 0;
        
        // TOC 시작선 및 점유 폭을 차감한 순수 에디터 시작점 기준 마우스 상대 좌표
        const relativeX = clientX - containerRect.left - tocWidth;
        
        // 전체 너비에서 TOC 폭을 제외한 가용 분할 폭
        const availableWidth = containerRect.width - tocWidth;
        
        // 1. 가용 분할 영역 기준의 백분율 비율 산출
        let percentageOfAvailable = availableWidth > 0 ? (relativeX / availableWidth) * 100 : 50;
        
        // 2. 가용 영역에 대한 좌우 경계 제약조건 (20% ~ 80%) 강제화
        if (percentageOfAvailable < 20) percentageOfAvailable = 20;
        if (percentageOfAvailable > 80) percentageOfAvailable = 80;
        
        // 3. 제약이 적용된 에디터 패널의 실제 목표 픽셀 폭 복원
        const targetEditorWidth = (percentageOfAvailable / 100) * availableWidth;
        
        // 4. 스타일 대입을 위한 전체 부모 컨테이너 기준 비율로 최종 환산
        let percentage = (targetEditorWidth / containerRect.width) * 100;
        
        editorPanel.style.width = `${percentage}%`;
        cm.refresh();
    }

    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        dragDivider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
        cm.refresh();
        saveDocumentSession();
    }

    dragDivider.addEventListener('mousedown', startDrag);
    dragDivider.addEventListener('touchstart', (e) => {
        // Prevent default only if drag divider is touched to prevent scrolling
        e.preventDefault();
        startDrag(e);
    });

    // ==========================================================================
    // Customization Settings Sync (Font, Font-size, Line color)
    // ==========================================================================
    
    // 1. Font Family Selector
    fontSelect.addEventListener('change', () => {
        preview.style.setProperty('--preview-font-family', fontSelect.value);
        saveDocumentSession();
    });

    // 2. Font Size Selector
    fontSizeSelect.addEventListener('change', () => {
        const selectedSize = fontSizeSelect.value;
        if (preview) preview.style.setProperty('--preview-font-size', selectedSize);
        document.documentElement.style.setProperty('--editor-font-size', selectedSize);
        if (cm && typeof cm.refresh === 'function') cm.refresh();
        saveDocumentSession();
    });

    // 2-2. Font Size Spin Buttons (Up/Down)
    const btnFontSizeUp = document.getElementById('btn-font-size-up');
    const btnFontSizeDown = document.getElementById('btn-font-size-down');

    if (btnFontSizeUp && btnFontSizeDown && fontSizeSelect) {
        btnFontSizeUp.addEventListener('click', () => {
            const currentIndex = fontSizeSelect.selectedIndex;
            if (currentIndex < fontSizeSelect.options.length - 1) {
                fontSizeSelect.selectedIndex = currentIndex + 1;
                fontSizeSelect.dispatchEvent(new Event('change'));
            }
        });

        btnFontSizeDown.addEventListener('click', () => {
            const currentIndex = fontSizeSelect.selectedIndex;
            if (currentIndex > 0) {
                fontSizeSelect.selectedIndex = currentIndex - 1;
                fontSizeSelect.dispatchEvent(new Event('change'));
            }
        });
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

    // ==========================================================================
    // Toolbar & Markdown Formatting Utilities
    // ==========================================================================
    
    function insertFormatting(type) {
        const selectedText = cm.getSelection();
        
        let prefix = '';
        let suffix = '';
        let placeholder = '';
        
        switch (type) {
            case 'bold':
                prefix = '**';
                suffix = '**';
                placeholder = '굵은 텍스트';
                break;
            case 'italic':
                prefix = '*';
                suffix = '*';
                placeholder = '기울임 텍스트';
                break;
            case 'h1':
                prefix = '\n# ';
                suffix = '\n';
                placeholder = '제목 1';
                break;
            case 'h2':
                prefix = '\n## ';
                suffix = '\n';
                placeholder = '제목 2';
                break;
            case 'h3':
                prefix = '\n### ';
                suffix = '\n';
                placeholder = '제목 3';
                break;
            case 'link':
                prefix = '[';
                suffix = '](https://example.com)';
                placeholder = '링크 텍스트';
                break;
            case 'image':
                prefix = '![';
                suffix = '](https://example.com/image.png)';
                placeholder = '이미지 설명';
                break;
            case 'code':
                prefix = '`';
                suffix = '`';
                placeholder = '코드';
                break;
            case 'codeblock':
                prefix = '\n```javascript\n';
                suffix = '\n```\n';
                placeholder = '// 코드 작성';
                break;
            case 'quote':
                prefix = '\n> ';
                suffix = '\n';
                placeholder = '인용문 내용';
                break;
            case 'ul':
                prefix = '\n- ';
                suffix = '';
                placeholder = '리스트 항목';
                break;
            case 'ol':
                prefix = '\n1. ';
                suffix = '';
                placeholder = '리스트 항목';
                break;
            case 'hr':
                prefix = '\n---\n';
                suffix = '';
                placeholder = '';
                break;
            case 'table':
                prefix = '\n| 헤더 1 | 헤더 2 |\n| :--- | :--- |\n| ';
                suffix = ' | 셀 2 |\n';
                placeholder = '셀 1';
                break;
            default:
                return;
        }
        
        const content = selectedText || placeholder;
        const replacement = prefix + content + suffix;
        
        cm.replaceSelection(replacement, 'around');
        updateFilenameDisplay(currentFilename, true);
        cm.focus();
        
        // Trigger render (실시간 렌더링 상시 동작)
        renderMarkdown();
    }

    // Attach Event Listeners to Toolbar buttons
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const markdownType = target.getAttribute('data-markdown');
            if (markdownType) {
                insertFormatting(markdownType);
            }
        });
    });

    // ==========================================================================
    // Keyboard Shortcuts & Editor Enhancements
    // ==========================================================================
    // Keyboard Shortcuts handled natively by CodeMirror extraKeys option

    // ==========================================================================
    // Preview 복사 (프리뷰 화면 전체 선택 및 클립보드 복사)
    // ==========================================================================
    // ==========================================================================
    // Preview 복사 (프리뷰 화면 전체 선택 및 클립보드 복사)
    // ==========================================================================
    btnCopy.addEventListener('click', () => {
        // 프리뷰 영역의 내용이 없거나 자식이 없으면 중단
        if (!preview || preview.children.length === 0) {
            alert('복사할 프리뷰 내용이 없습니다.');
            return;
        }

        // 드롭다운 메뉴 닫기
        if (exportMenu) {
            exportMenu.classList.remove('show');
        }

        // 범위(Range) 생성 및 프리뷰 요소의 콘텐츠 지정
        const range = document.createRange();
        range.selectNodeContents(preview);

        // 이전 선택 범위를 지우고 새로운 범위 추가
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            // 선택된 영역 복사 실행 (서식 있는 텍스트 복사)
            const successful = document.execCommand('copy');
            if (successful) {
                // 내보내기 버튼(btnExport)에 복사 성공 피드백 표시
                if (btnExport) {
                    const originalHTML = btnExport.innerHTML;
                    btnExport.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        복사 완료!
                    `;
                    btnExport.style.borderColor = '#10b981';
                    btnExport.style.color = '#10b981';
                    
                    setTimeout(() => {
                        btnExport.innerHTML = originalHTML;
                        btnExport.style.borderColor = '';
                        btnExport.style.color = '';
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
    });

    // ==========================================================================
    // 내보내기 드롭다운 토글 및 HTML 내보내기 기능
    // ==========================================================================
    // ==========================================================================
    // 내보내기 및 보기, 메인 메뉴 드롭다운 토글 및 닫기 처리
    // ==========================================================================
    if (btnExport && exportMenu) {
        btnExport.addEventListener('click', (e) => {
            e.stopPropagation();
            if (viewMenu) viewMenu.classList.remove('show');
            if (mainMenu) mainMenu.classList.remove('show');
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
            exportMenu.classList.toggle('show');
        });
    }

    if (btnView && viewMenu) {
        btnView.addEventListener('click', (e) => {
            e.stopPropagation();
            if (exportMenu) exportMenu.classList.remove('show');
            if (mainMenu) mainMenu.classList.remove('show');
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
            viewMenu.classList.toggle('show');
        });
    }

    if (btnMenu && mainMenu) {
        btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (exportMenu) exportMenu.classList.remove('show');
            if (viewMenu) viewMenu.classList.remove('show');
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
            mainMenu.classList.toggle('show');
        });
    }

    if (btnHeadingStyle && headingStyleMenu) {
        btnHeadingStyle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (exportMenu) exportMenu.classList.remove('show');
            if (viewMenu) viewMenu.classList.remove('show');
            if (mainMenu) mainMenu.classList.remove('show');
            headingStyleMenu.classList.toggle('show');
        });
    }

    // 드롭다운 내부 요소(셀렉트, 옵션 등) 클릭 시 드롭다운이 바로 닫히지 않도록 수용
    [exportMenu, viewMenu, mainMenu, headingStyleMenu].forEach(menuEl => {
        if (menuEl) {
            menuEl.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });

    // 문서의 다른 부분을 클릭하면 모든 드롭다운이 닫히도록 설정
    document.addEventListener('click', (e) => {
        if (exportDropdown && !exportDropdown.contains(e.target)) {
            if (exportMenu) exportMenu.classList.remove('show');
        }
        if (viewDropdown && !viewDropdown.contains(e.target)) {
            if (viewMenu) viewMenu.classList.remove('show');
        }
        if (menuDropdown && !menuDropdown.contains(e.target)) {
            if (mainMenu) mainMenu.classList.remove('show');
        }
        if (headingDropdown && !headingDropdown.contains(e.target)) {
            if (headingStyleMenu) headingStyleMenu.classList.remove('show');
        }
    });

    // 메인 메뉴 하위 액션 연결
    if (btnNewFile) {
        btnNewFile.addEventListener('click', () => {
            if (mainMenu) mainMenu.classList.remove('show');
            handleNewFile();
        });
    }

    if (btnOpenFile) {
        btnOpenFile.addEventListener('click', () => {
            if (mainMenu) mainMenu.classList.remove('show');
            if (fileInput) fileInput.click();
        });
    }

    if (btnExportHtml) {
        btnExportHtml.addEventListener('click', () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            downloadPreviewHtml();
        });
    }

    if (btnOpenNewWindow) {
        btnOpenNewWindow.addEventListener('click', () => {
            if (exportMenu) {
                exportMenu.classList.remove('show');
            }
            openPreviewHtmlInNewWindow();
        });
    }

    // 프리뷰의 스타일을 취합하여 standalone HTML 콘텐츠를 빌드하는 공통 함수
    async function generatePreviewHtmlContent() {
        if (!preview || preview.children.length === 0) {
            return null;
        }

        // CSS 파일들을 읽어온다 (실패 시 CDN 주소 폴백 또는 빈 문자열 처리)
        let githubCss = '';
        let katexCss = '';
        let styleCss = '';

        try {
            const res = await fetch(chrome.runtime.getURL('libs/github.min.css'));
            githubCss = await res.text();
        } catch (e) {
            console.warn('github.min.css fetch 실패. CDN fallback을 사용합니다.', e);
            githubCss = `@import url('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css');`;
        }

        try {
            const res = await fetch(chrome.runtime.getURL('libs/katex/katex.min.css'));
            let rawKatex = await res.text();
            // 폰트 경로를 CDN 주소로 치환하여 단독 실행 시 깨짐 방지
            katexCss = rawKatex.replace(/url\(fonts\//g, 'url(https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/');
        } catch (e) {
            console.warn('katex.min.css fetch 실패. CDN fallback을 사용합니다.', e);
            katexCss = `@import url('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css');`;
        }

        try {
            const res = await fetch(chrome.runtime.getURL('style.css'));
            styleCss = await res.text();
        } catch (e) {
            console.warn('style.css fetch 실패.', e);
        }

        // 현재 테마 설정 추출
        const fontStyle = getComputedStyle(preview).getPropertyValue('font-family').trim() || 'system-ui, -apple-system, sans-serif';
        const fontSizeStyle = getComputedStyle(preview).getPropertyValue('font-size').trim() || '16px';
        const lineColor = document.getElementById('line-color-picker')?.value || '#3b82f6';

        // HTML 문서 템플릿 반환
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentFilename.replace(/\.[^/.]+$/, "")} - Preview Export</title>
    <style>
        /* Base Variables overrides */
        :root {
            --theme-color: ${lineColor};
            --preview-bg: #ffffff;
            --preview-text: #1f2937;
            --preview-heading: #111827;
            --preview-border: #e5e7eb;
            --preview-code-bg: #f3f4f6;
            --preview-blockquote-bg: #f9fafb;
            --preview-font-family: ${fontStyle};
            --preview-font-size: ${fontSizeStyle};
        }
        
        body {
            background-color: var(--preview-bg);
            color: var(--preview-text);
            font-family: var(--preview-font-family);
            font-size: var(--preview-font-size);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
        }

        .export-container {
            width: 100%;
            max-width: 800px;
            padding: 40px 24px;
            box-sizing: border-box;
        }

        /* github code highlight styles */
        ${githubCss}

        /* katex math formulas styles */
        ${katexCss}

        /* app preview markdown styles */
        ${styleCss}
    </style>
</head>
<body>
    <div class="export-container">
        <article class="markdown-body">
            ${preview.innerHTML}
        </article>
    </div>
</body>
</html>`;
    }

    // 프리뷰 HTML을 스타일이 포함된 HTML 파일로 다운로드
    async function downloadPreviewHtml() {
        try {
            const htmlContent = await generatePreviewHtmlContent();
            if (!htmlContent) {
                alert('내보낼 프리뷰 내용이 없습니다.');
                return;
            }

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // 파일명 설정
            const lastDotIndex = currentFilename.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? currentFilename.substring(0, lastDotIndex) : currentFilename;
            const targetFilename = `${baseName}.html`;

            if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
                chrome.downloads.download({
                    url: url,
                    filename: targetFilename,
                    saveAs: true // 다른 이름으로 저장 강제 활성화
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.warn('chrome.downloads 실패, fallback 다운로드 시도:', chrome.runtime.lastError.message);
                        fallbackHtmlDownload(url, targetFilename);
                    }
                });
            } else {
                fallbackHtmlDownload(url, targetFilename);
            }
            
        } catch (err) {
            console.error('HTML 저장 실패:', err);
            alert('HTML 저장에 실패했습니다.');
        }
    }

    // HTML 다운로드 fallback 처리 함수
    function fallbackHtmlDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 프리뷰 HTML을 새창/새탭에 띄우는 함수
    async function openPreviewHtmlInNewWindow() {
        // 브라우저 팝업 차단 회피를 위해 사용자 상호작용 스레드 직속으로 창을 우선 엶
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            alert('팝업 차단이 감지되었습니다. 팝업 차단을 해제해 주세요.');
            return;
        }

        try {
            const htmlContent = await generatePreviewHtmlContent();
            if (!htmlContent) {
                alert('새 창으로 띄울 프리뷰 내용이 없습니다.');
                newWindow.close();
                return;
            }

            newWindow.document.open();
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        } catch (err) {
            console.error('HTML 새 창 열기 실패:', err);
            alert('HTML 새 창 열기에 실패했습니다.');
            newWindow.close();
        }
    }

    // ==========================================================================
    // 문단 모으기 (Smart Paragraph Join) 기능
    // ==========================================================================

    // 문단 모으기 버튼 클릭 이벤트 핸들러 바인딩
    if (btnJoinParagraphs) {
        btnJoinParagraphs.addEventListener('click', () => {
            joinParagraphsAction();
        });
    }

    // 에디터의 상황에 따라 문단 모으기를 수행하는 핵심 액션 함수
    function joinParagraphsAction() {
        const selection = cm.getSelection();
        if (selection) {
            // 선택한 텍스트 영역이 있으면 선택 영역만 변환 적용
            const joinedText = joinParagraphs(selection);
            cm.replaceSelection(joinedText);
        } else {
            // 선택 영역이 없으면 문서 전체를 대상으로 변환 적용
            const fullText = cm.getValue();
            const joinedText = joinParagraphs(fullText);
            cm.setValue(joinedText);
        }
        
        // 렌더링 갱신 및 에디터 포커스 복원
        renderMarkdown();
        cm.focus();
    }

    /**
     * 연속해서 들어간 강제 줄바꿈(엔터)들을 분석하여 의미상 한 문단인 경우 결합해 주는 함수
     */
    function joinParagraphs(text) {
        const lines = text.split(/\r?\n/);
        const result = [];
        let currentParagraph = [];

        // 마크다운 문법 요소(제목, 리스트, 인용, 표 등)로 시작하는지 판단
        const isMarkdownElement = (line) => {
            const trimmed = line.trim();
            // #, >, -, *, +, 숫자. , |, ``` 등
            return /^([#>\-*+\d\.]|\||`{3,})/.test(trimmed);
        };

        // 영단어가 행 끝에서 하이픈(-)으로 잘렸는지 판단 (예: "infor-")
        const isEnglishHyphenated = (line) => {
            return /[a-zA-Z]-$/.test(line.trim());
        };

        // 앞쪽 라인(Line A)이 자립할 수 있는 문단 구성요소를 충분히 갖췄는지 판단
        const isLineATooShort = (lineA) => {
            const trimmed = lineA.trim();
            // 단어 수가 3개 이하이거나 글자 수가 15자 미만이면 
            // 독립된 제목, 캡션, 색인 등으로 간주하여 다음 줄과 합치지 않음
            const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
            return wordCount <= 3 || trimmed.length < 15;
        };

        /**
         * 영어 단어 시작 및 대소문자 판정 힌트를 기반으로 결합 여부를 판단하는 함수
         */
        const shouldJoinEng = (trimmedA, trimmedB) => {
            const firstCharB = trimmedB.charAt(0);
            const isEnglishB = /[a-zA-Z]/.test(firstCharB);
            if (isEnglishB) {
                // Line B의 첫 영문자가 소문자라면 100% 앞 문장의 중간이 끊겨 넘어온 것이므로 결합
                const isLowerB = firstCharB === firstCharB.toLowerCase() && firstCharB !== firstCharB.toUpperCase();
                if (isLowerB) return true;

                // Line B가 대문자로 시작하더라도, 앞의 Line A가 문장 종결부(. ? ! 또는 따옴표)로 끝나지 않았다면
                // 문장 도중에 들어간 고유명사 등으로 판단하여 결합 진행
                const endsWithSentenceEnd = /[\.\?\!]["']?$/.test(trimmedA);
                if (!endsWithSentenceEnd) return true;
            }
            return null; // 영어 판정 결과 결정되지 않음
        };

        /**
         * 한글 조사 및 연결어미 판정 힌트를 기반으로 결합 여부를 판단하는 함수
         */
        const shouldJoinKor = (trimmedA, trimmedB) => {
            const lastCharA = trimmedA.slice(-1);
            const isKoreanA = /[가-힣]/.test(lastCharA);
            if (isKoreanA) {
                // Line A의 마지막 글자가 종결형 문장부호(. ? !)로 끝나지 않고 일반 한글로 끝난 경우, 
                // 문장이 아직 끝나지 않았으므로 결합
                const endsWithSentenceEnd = /[\.\?\!]["']?$/.test(trimmedA);
                if (!endsWithSentenceEnd) return true;
                
                // 혹은 문장부호 유무와 무관하게 마지막 글자가 명백한 조사나 연결어미로 끝난 경우 결합
                const endsWithParticles = /[은는이가을를고며와과의에로]$/.test(trimmedA);
                if (endsWithParticles) return true;
            }
            return null; // 한글 판정 결과 결정되지 않음
        };

        /**
         * 두 개의 연속된 행 (Line A와 Line B)을 같은 문단으로 묶어 이어 붙일지 판정하는 핵심 로직
         */
        const shouldJoin = (lineA, lineB) => {
            const trimmedA = lineA.trim();
            const trimmedB = lineB.trim();

            // 어느 한 쪽이라도 비어 있다면 결합하지 않음 (빈 줄은 명확한 문단 구분선)
            if (!trimmedA || !trimmedB) return false;
            
            // 뒤이어 나오는 Line B가 마크다운 요소로 시작한다면 본문 결합을 막아야 함
            if (isMarkdownElement(trimmedB)) return false;
            
            // Line B가 2칸 이상의 스페이스나 탭 문자 등 들여쓰기로 시작하면 새 단락의 시작으로 간주함
            if (/^\s{2,}/.test(lineB) || /^\t/.test(lineB)) return false;

            // 앞쪽 Line A 자체가 마크다운 구조의 일부로 끝났다면 결합하지 않음
            if (isMarkdownElement(trimmedA)) return false;

            // [추가 구현]: 첫 번째 줄(Line A)의 끝이 <br> 또는 <br/> 등 HTML 개행 태그라면 
            // 명시적 강제 개행 의도이므로 다음 줄과 결합하지 않고 행 분리 상태 유지
            if (/<br\s*\/?>$/i.test(trimmedA)) return false;

            // [추가된 고도화 규칙]: 앞 줄의 완성도 판단
            // 앞 줄이 너무 짧다면(단어 3개 이하 혹은 15자 미만) 단독 제목이나 캡션일 확률이 매우 높으므로 결합 안 함
            if (isLineATooShort(lineA)) return false;

            // 1. 영어 힌트 판정
            const engResult = shouldJoinEng(trimmedA, trimmedB);
            if (engResult !== null) return engResult;

            // 2. 한글 힌트 판정
            const korResult = shouldJoinKor(trimmedA, trimmedB);
            if (korResult !== null) return korResult;

            // 기본 규칙: 빈 줄 없이 1회 개행(엔터)이 들어간 텍스트 블록은 
            // 위 예외 필터(제목 방지, 들여쓰기 감지 등)를 거쳤다면 같은 문단 내의 단순 텍스트 래핑이므로
            // 공백을 두고 결합해 줍니다.
            return true;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                // 빈 줄을 만나면 기존에 누적해서 합쳐오던 문단 버퍼를 결과에 쏟아내고(flush) 빈 줄을 삽입
                if (currentParagraph.length > 0) {
                    result.push(flushParagraph(currentParagraph));
                    currentParagraph = [];
                }
                result.push(line);
                continue;
            }

            if (currentParagraph.length === 0) {
                currentParagraph.push(line);
            } else {
                const prevLine = currentParagraph[currentParagraph.length - 1];
                if (shouldJoin(prevLine, line)) {
                    currentParagraph.push(line);
                } else {
                    // 결합 대상이 아니라면 이전까지 모았던 버퍼를 변환 저장하고, 새 문단을 시작
                    result.push(flushParagraph(currentParagraph));
                    currentParagraph = [line];
                }
            }
        }

        // 마지막으로 남아있는 문단 버퍼 정리
        if (currentParagraph.length > 0) {
            result.push(flushParagraph(currentParagraph));
        }

        return result.join('\n');

        // 버퍼에 담긴 한 문단의 여러 라인을 규칙에 맞춰 결합
        function flushParagraph(paraLines) {
            if (paraLines.length === 0) return '';
            let merged = paraLines[0];
            
            for (let i = 1; i < paraLines.length; i++) {
                const current = paraLines[i];
                const prev = paraLines[i - 1];
                
                if (isEnglishHyphenated(prev)) {
                    // 영어 단어가 하이픈으로 쪼개진 경우, 끝의 하이픈(-)을 제거하고 다음 줄을 공백 없이 바짝 이어붙임
                    merged = merged.slice(0, -1) + current.trim();
                } else {
                    // 일반 문장은 영어 단어 간 혹은 한글 낱말 간 띄어쓰기를 위해 공백 한 칸을 끼워넣고 연결
                    merged += ' ' + current.trim();
                }
            }
            return merged;
        }
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

    // 에디터 내용을 마크다운 파일(.md)로 다운로드 및 저장하는 헬퍼 함수
    async function downloadCurrentContent() {
        const text = cm.getValue();

        // 1) Modern File System Access API 지원 브라우저 (실제 지정/선택한 파일 이름 반환)
        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFilename || 'untitled.md',
                    types: [{
                        description: 'Markdown Document',
                        accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(text);
                await writable.close();

                // 저장이 성공했을 때 실제 사용자가 저장한 파일이름을 topmenu 파일이름에 반영
                const savedName = handle.name;
                updateFilenameDisplay(savedName, false);
                saveDocumentSession();
                showToast(`"${savedName}" 파일이 저장되었습니다.`);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    // 사용자가 저장 창에서 취소를 클릭한 경우 아무 작업도 하지 않음
                    return;
                }
                console.warn('showSaveFilePicker 실패 fallback 다운로드 시도:', err);
            }
        }

        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // 2) chrome.downloads API를 사용하여 무조건 다른 이름으로 저장 대화상자(SaveAs)를 직접 호출
        if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
            chrome.downloads.download({
                url: url,
                filename: currentFilename,
                saveAs: true // 다른 이름으로 저장 강제 활성화
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.warn('chrome.downloads 실패, fallback 다운로드 시도:', chrome.runtime.lastError.message);
                    fallbackDownload(url, currentFilename);
                } else {
                    updateFilenameDisplay(currentFilename, false);
                    saveDocumentSession();
                    showToast(`"${currentFilename}" 파일이 저장되었습니다.`);
                }
            });
        } else {
            // 3) Fallback 다운로드
            fallbackDownload(url, currentFilename);
        }
    }

    // chrome.downloads 미지원 환경을 위한 fallback 파일 저장 함수
    function fallbackDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateFilenameDisplay(filename, false);
        saveDocumentSession();
        showToast(`"${filename}" 파일이 저장되었습니다.`);
    }

    // 마크다운/텍스트 파일을 로드하여 에디터에 적용하는 공통 함수
    function loadSingleFile(file) {
        if (!file) return;
        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();
        const allowedExtensions = ['md', 'markdown', 'txt', 'html', 'json'];
        
        if (allowedExtensions.includes(extension) || file.type.startsWith('text/')) {
            let shouldLoad = true;
            
            if (isDirty) {
                const saveConfirm = confirm(`작성 중인 내용이 변경되었습니다. 파일 로드 전에 현재 문서를 컴퓨터에 저장(다운로드)하시겠습니까?`);
                if (saveConfirm) {
                    downloadCurrentContent();
                } else {
                    // 저장 안 함 선택 시, 덮어쓰고 계속 불러올지 재차 확인 (작업 소실 방지)
                    shouldLoad = confirm(`현재 문서를 저장하지 않고 "${fileName}" 파일을 불러오시겠습니까?\n(확인을 누르면 작성 중이던 기존 수정 내용이 사라집니다.)`);
                }
            }
            
            if (shouldLoad) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    cm.setValue(event.target.result);
                    updateFilenameDisplay(file.name, false); // 새 파일 로드 및 파일명 적용
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
            }
        } else {
            alert('불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 열어 주세요.');
        }
    }

    // 드래그 앤 드롭 파일 로딩 연동
    editorContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        editorContainer.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            loadSingleFile(files[0]);
        }
    });

    // 숨김 파일 인풋 change 이벤트 연동 (md 불러오기)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                loadSingleFile(files[0]);
                // 다음 파일 로드를 위해 input 값 초기화
                fileInput.value = '';
            }
        });
    }

    // 새 마크다운 파일 초기화 비즈니스 로직
    function handleNewFile() {
        let shouldCreate = true;
        if (isDirty) {
            shouldCreate = confirm("작성 중인 내용이 변경되었습니다. 저장하지 않은 변경 사항을 모두 취소하고 새 마크다운을 만드시겠습니까?");
        }
        if (shouldCreate) {
            cm.setValue('');
            updateFilenameDisplay('제목 없음.md', false);
            renderMarkdown();
            cm.scrollTo(0, 0);
            saveDocumentSession();
        }
    }

    // ==========================================================================
    // 식별자 및 비율 기반 비례 재조정(Proportional Rescaling) 스크롤 동기화 로직
    // ==========================================================================
    const previewViewport = document.querySelector('.preview-viewport');
    let activeScrollSource = null; // 'editor' 또는 'preview'
    let keyframes = [];            // [ { id: string, line: number, editorPercent: number, previewPercent: number, previewScrollY: number }, ... ]
    let lastEditorScrollTop = -1;  // 중복 스크롤 업데이트 필터용
    let lastPreviewScrollTop = -1; // 중복 스크롤 업데이트 필터용

    // 마우스 위치에 따른 스크롤 주도권(Source) 설정
    cm.getWrapperElement().addEventListener('mouseenter', () => { activeScrollSource = 'editor'; });
    if (previewViewport) {
        previewViewport.addEventListener('mouseenter', () => { activeScrollSource = 'preview'; });
    }

    // 텍스트 라인 및 Heading 정제 헬퍼 함수
    function cleanTextForIdentifier(text, isHeading) {
        let cleanText = text
            .replace(/^[#>\s\-*+]+/g, '')   // 헤더, 인용구, 목록 불릿 기호만 제거
            .replace(/[*_`~]/g, '')         // 볼드, 이탤릭, 인라인 코드, 취소선 기호 제거 (대괄호/소괄호는 유지)
            .trim();
        return isHeading ? cleanText : cleanText.substring(0, 30);
    }

    // 1. 텍스트 라인 식별자 추출 헬퍼 함수
    function getLineIdentifier(lineNum) {
        const lines = cm.getValue().replace(/\r\n/g, '\n').split('\n');
        if (lineNum <= 0 || lineNum > lines.length) return '';
        const rawLine = lines[lineNum - 1].trim();
        if (!rawLine) return '';
        
        const isHeading = /^#+\s/.test(rawLine);
        return cleanTextForIdentifier(rawLine, isHeading);
    }

    // 2. 식별 텍스트를 기준으로 프리뷰 내 DOM 엘리먼트 검색 (고유 ID 접미사 _line_줄번호 분리 처리)
    function findPreviewElementByIdentifier(id) {
        if (!id || id === '[START]' || id === '[END]') return null;
        
        const candidates = preview.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table');
        
        // 고유 ID 접미사 (_line_숫자) 분리 처리
        let baseId = id;
        const lineSuffixMatch = id.match(/(.+)_line_\d+$/);
        if (lineSuffixMatch) {
            baseId = lineSuffixMatch[1];
        }
        
        const cleanId = baseId.trim().toLowerCase();
        
        for (let el of candidates) {
            const text = el.textContent.trim().toLowerCase();
            if (text.startsWith(cleanId) || cleanId.startsWith(text.substring(0, 30))) {
                return el;
            }
        }
        return null;
    }

    // 에디터 텍스트 파싱을 통한 TOC 리스트 빌드 및 렌더링
    function buildTOC() {
        const tocList = document.getElementById('toc-list');
        if (!tocList) return;

        const text = cm.getValue().replace(/\r\n/g, '\n');
        const lines = text.split('\n');
        const headings = [];
        let inCodeBlock = false;

        lines.forEach((lineText, idx) => {
            const trimmed = lineText.trim();
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                inCodeBlock = !inCodeBlock;
                return;
            }
            if (inCodeBlock) return;

            // Heading 1~6에 해당하는 정규식 패턴 검사 (닫는 # 기호 제외)
            const match = trimmed.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
            if (match) {
                const level = match[1].length;
                const textVal = match[2].trim();
                headings.push({
                    line: idx, // 0-based index
                    level: level,
                    text: textVal
                });
            }
        });

        tocList.innerHTML = '';
        headings.forEach(heading => {
            const li = document.createElement('li');
            li.className = `toc-item toc-h${heading.level}`;
            li.setAttribute('data-line', heading.line + 1); // data-line은 1-based

            const a = document.createElement('a');
            a.href = '#';
            a.textContent = heading.text;
            a.addEventListener('click', (e) => {
                e.preventDefault();

                const line = heading.line; // 0-based
                isSyncing = true;

                // 에디터 커서 이동 및 포커스
                cm.setCursor({line: line, ch: 0});
                cm.focus();

                // 에디터 스크롤 연동 (화면 중앙 부근에 오도록 정렬)
                const charCoords = cm.charCoords({line: line, ch: 0}, 'local');
                const editorHeight = cm.getWrapperElement().clientHeight;
                const targetEditorScrollTop = Math.max(0, charCoords.top - editorHeight / 2);
                cm.scrollTo(null, targetEditorScrollTop);
                lastEditorScrollTop = targetEditorScrollTop;

                // 프리뷰 뷰포트 스크롤 연동 (중앙 뷰 스크롤 연동, 스냅백 방지를 위해 behavior: 'auto' 적용)
                const targetEl = preview.querySelector(`[data-line="${line + 1}"]`);
                if (targetEl && previewViewport) {
                    const targetScrollTop = previewViewport.scrollTop + targetEl.getBoundingClientRect().top - previewViewport.getBoundingClientRect().top - previewViewport.clientHeight / 2 + targetEl.clientHeight / 2;
                    const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
                    const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxPreviewScrollY));

                    previewViewport.scrollTo({
                        top: clampedScrollTop,
                        behavior: 'auto'
                    });
                    lastPreviewScrollTop = clampedScrollTop;
                }

                // 이동 트랜지션 완료 고려하여 300ms 후 동기화 상태 원복
                setTimeout(() => {
                    isSyncing = false;
                    updateActiveTOCItem();
                }, 300);
            });

            li.appendChild(a);
            tocList.appendChild(li);
        });

        updateActiveTOCItem();
    }

    // 현재 보고 있는 프리뷰 위치에 따라 TOC 아이템 active 상태 업데이트
    function updateActiveTOCItem() {
        if (!previewViewport) return;
        const headings = Array.from(preview.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line]'));
        if (headings.length === 0) return;

        const viewportRect = previewViewport.getBoundingClientRect();
        let activeHeading = null;

        for (let i = 0; i < headings.length; i++) {
            const el = headings[i];
            const rect = el.getBoundingClientRect();

            // 뷰포트 상단으로부터 약 100px 이내 영역에 헤더가 있는 경우를 활성화 기준으로 처리
            if (rect.top - viewportRect.top <= 100) {
                activeHeading = el;
            } else {
                break;
            }
        }

        if (!activeHeading && headings.length > 0) {
            activeHeading = headings[0];
        }

        if (activeHeading) {
            const line = activeHeading.getAttribute('data-line');
            const tocItems = document.querySelectorAll('.toc-item');
            tocItems.forEach(item => {
                if (item.getAttribute('data-line') === line) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    // 3. 초기 렌더링 시 Heading들을 추출하여 초기 키프레임 자동 구축
    function rebuildInitialKeyframes() {
        if (!previewViewport) return;
        const lines = cm.getValue().replace(/\r\n/g, '\n').split('\n');
        const totalLines = lines.length;
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
        
        const rawKeyframes = [];
        
        // 시작 지점 경계 노드
        rawKeyframes.push({
            id: '[START]',
            line: 0,
            editorPercent: 0,
            previewPercent: 0,
            previewScrollY: 0
        });
        
        // 프리뷰 내 주요 Heading 요소들(h1~h6) 중 data-line 속성을 가진 노드 추출
        const headings = Array.from(preview.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line]'));
        headings.forEach(el => {
            const line = parseInt(el.getAttribute('data-line'), 10);
            const cleanText = cleanTextForIdentifier(el.textContent, true);
            if (!isNaN(line) && cleanText) {
                const id = `${cleanText}_line_${line}`;
                const editorPercent = totalLines > 1 ? (line - 1) / (totalLines - 1) : 0;
                
                // 초기 previewPercent를 editorPercent와 비례하게(동일하게) 세팅
                const previewPercent = editorPercent;
                const previewScrollY = previewPercent * maxPreviewScrollY;
                
                rawKeyframes.push({
                    id: id,
                    line: line,
                    editorPercent: editorPercent,
                    previewPercent: previewPercent,
                    previewScrollY: previewScrollY
                });
            }
        });
        
        // 끝 지점 경계 노드
        rawKeyframes.push({
            id: '[END]',
            line: totalLines,
            editorPercent: 1.0,
            previewPercent: 1.0,
            previewScrollY: Math.max(0, maxPreviewScrollY)
        });
        
        // 줄 번호 오름차순 정렬
        rawKeyframes.sort((a, b) => a.line - b.line);
        
        // 중복 제거
        keyframes = [];
        const seenIds = new Set();
        rawKeyframes.forEach(kf => {
            if (kf.id === '[START]' || kf.id === '[END]' || !seenIds.has(kf.id)) {
                seenIds.add(kf.id);
                keyframes.push(kf);
            }
        });
        
        if (typeof updateDebugPanel === 'function') {
            updateDebugPanel();
        }
    }

    // 4. 프리뷰 높이 변화 갱신(Reflow) 시 각 키프레임 위치 캐시 일괄 업데이트
    function recalculateKeyframePositions() {
        if (!previewViewport) return;
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
        const lines = cm.getValue().replace(/\r\n/g, '\n').split('\n');
        const totalLines = lines.length;
        
        keyframes.forEach(kf => {
            if (kf.id === '[START]') {
                kf.previewScrollY = 0;
                kf.previewPercent = 0;
                kf.editorPercent = 0;
            } else if (kf.id === '[END]') {
                kf.previewScrollY = Math.max(0, maxPreviewScrollY);
                kf.previewPercent = 1.0;
                kf.editorPercent = 1.0;
                kf.line = totalLines;
            } else {
                // 비율 비례 배분에 기반하므로, 기존 비율(previewPercent)을 유지하면서
                // 갱신된 maxPreviewScrollY에 맞게 absolute Y 캐시만 동기화합니다.
                kf.previewScrollY = kf.previewPercent * maxPreviewScrollY;
                kf.editorPercent = totalLines > 1 ? (kf.line - 1) / (totalLines - 1) : 0;
            }
        });
        
        if (typeof updateDebugPanel === 'function') {
            updateDebugPanel();
        }
    }

    // 5. 키프레임 추가/갱신 및 비례 비율 조정(Proportional Re-scaling)
    function addOrUpdateKeyframe(id, line, newPercent, targetScrollTop) {
        if (!id) return;
        
        const totalLines = cm.getValue().replace(/\r\n/g, '\n').split('\n').length;
        const editorPercent = totalLines > 1 ? (line - 1) / (totalLines - 1) : 0;
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
        
        let pivotIndex = keyframes.findIndex(kf => kf.id === id);
        let oldPercent = 0;
        
        if (pivotIndex !== -1) {
            oldPercent = keyframes[pivotIndex].previewPercent;
            
            // 단조 증가(Monotonicity) 검증 및 범위 제한 (클램핑)
            const kfBefore = keyframes[pivotIndex - 1] || keyframes[0];
            const kfAfter = keyframes[pivotIndex + 1] || keyframes[keyframes.length - 1];
            const minAllowed = kfBefore.previewPercent;
            const maxAllowed = kfAfter.previewPercent;
            
            newPercent = Math.max(minAllowed, Math.min(newPercent, maxAllowed));
            targetScrollTop = newPercent * maxPreviewScrollY;

            keyframes[pivotIndex].line = line;
            keyframes[pivotIndex].editorPercent = editorPercent;
            keyframes[pivotIndex].previewPercent = newPercent;
            keyframes[pivotIndex].previewScrollY = targetScrollTop;
        } else {
            const newKf = {
                id: id,
                line: line,
                editorPercent: editorPercent,
                previewPercent: newPercent,
                previewScrollY: targetScrollTop
            };
            keyframes.push(newKf);
            keyframes.sort((a, b) => a.line - b.line);
            
            pivotIndex = keyframes.findIndex(kf => kf.id === id);
            const kfBefore = keyframes[pivotIndex - 1] || keyframes[0];
            const kfAfter = keyframes[pivotIndex + 1] || keyframes[keyframes.length - 1];
            
            // 단조 증가(Monotonicity) 검증 및 범위 제한 (클램핑)
            const minAllowed = kfBefore.previewPercent;
            const maxAllowed = kfAfter.previewPercent;
            
            newPercent = Math.max(minAllowed, Math.min(newPercent, maxAllowed));
            targetScrollTop = newPercent * maxPreviewScrollY;
            
            keyframes[pivotIndex].previewPercent = newPercent;
            keyframes[pivotIndex].previewScrollY = targetScrollTop;

            const dist = kfAfter.line - kfBefore.line;
            const ratio = dist > 0 ? (line - kfBefore.line) / dist : 0.5;
            oldPercent = kfBefore.previewPercent + ratio * (kfAfter.previewPercent - kfBefore.previewPercent);
        }
        
        rescaleKeyframePercentages(pivotIndex, oldPercent, newPercent);
        
        if (typeof updateDebugPanel === 'function') {
            updateDebugPanel();
        }
    }

    // 6. 비례 비율 조절 연산 적용 함수
    function rescaleKeyframePercentages(pivotIndex, oldPercent, newPercent) {
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
        const N = keyframes.length;
        
        // 0부터 pivotIndex - 1 까지 (상단 영역)
        for (let j = 1; j < pivotIndex; j++) {
            if (oldPercent > 0) {
                let adjustedPercent = keyframes[j].previewPercent * (newPercent / oldPercent);
                // 범위 제한 (Clamping)
                adjustedPercent = Math.max(0.0, Math.min(1.0, adjustedPercent));
                
                keyframes[j].previewPercent = adjustedPercent;
                keyframes[j].previewScrollY = adjustedPercent * maxPreviewScrollY;
            }
        }
        
        // pivotIndex + 1부터 N - 2 까지 (하단 영역)
        for (let j = pivotIndex + 1; j < N - 1; j++) {
            const denom = 1.0 - oldPercent;
            if (denom > 0) {
                const ratio = (keyframes[j].previewPercent - oldPercent) / denom;
                let adjustedPercent = newPercent + ratio * (1.0 - newPercent);
                // 범위 제한 (Clamping)
                adjustedPercent = Math.max(0.0, Math.min(1.0, adjustedPercent));
                
                keyframes[j].previewPercent = adjustedPercent;
                keyframes[j].previewScrollY = adjustedPercent * maxPreviewScrollY;
            }
        }
        
        // 시작과 끝 경계선 키프레임 보존 강제화
        keyframes[0].previewPercent = 0;
        keyframes[0].previewScrollY = 0;
        keyframes[N - 1].previewPercent = 1.0;
        keyframes[N - 1].previewScrollY = Math.max(0, maxPreviewScrollY);
    }

    // 7. 커서/선택영역 가시성 보정 및 비율 보정 키프레임 등록
    function syncPreviewToCursor() {
        if (!enableScrollSync) return;
        const hasSelection = cm.somethingSelected();
        const cursor = cm.getCursor('start');
        const cursorLine = cursor.line + 1;
        
        // 프리뷰 내에 현재 커서 라인과 인접한 data-line 엘리먼트 탐색
        const elements = Array.from(preview.querySelectorAll('[data-line]'));
        if (elements.length === 0) return;
        
        let targetEl = null;
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const line = parseInt(el.getAttribute('data-line'), 10);
            if (line <= cursorLine) {
                targetEl = el;
            } else {
                break;
            }
        }
        
        if (!targetEl || !previewViewport) return;
        
        // getBoundingClientRect를 활용하여 프리뷰 뷰포트 내의 상대적 위치 계산
        const elRect = targetEl.getBoundingClientRect();
        const viewportRect = previewViewport.getBoundingClientRect();
        
        const relativeTop = elRect.top - viewportRect.top;
        const relativeBottom = elRect.bottom - viewportRect.top;
        const viewportHeight = previewViewport.clientHeight;
        
        let targetScrollTop = -1;
        
        // 이미 가시 범위 내에 노출되어 있다면 추가 스크롤 보정을 일절 수행하지 않음 (20px 패딩 버퍼)
        if (relativeTop < 20) {
            targetScrollTop = previewViewport.scrollTop + relativeTop - 20;
        } else if (relativeBottom > viewportHeight - 20) {
            targetScrollTop = previewViewport.scrollTop + relativeBottom - viewportHeight + 20;
        }
        
        if (targetScrollTop !== -1) {
            // 스크롤 상단/하단 경계 보정
            const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
            targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxPreviewScrollY));
            
            isSyncing = true;
            previewViewport.scrollTop = targetScrollTop;
            
            // 수동 스크롤 조작 위치를 기록하여 redundant 스크롤 이벤트 자동 무시 처리
            lastPreviewScrollTop = targetScrollTop;
            lastEditorScrollTop = cm.getScrollInfo().top;
            
            // 에디터 포커스 및 커서 이동 시 스크롤 보정이 실질적으로 발생했다면, 
            // 뷰포트 정렬 왜곡 방지를 위해 해당 키프레임의 실제 스크롤 비율을 함께 보정 업데이트합니다.
            const cleanText = getLineIdentifier(cursorLine);
            if (cleanText) {
                const id = `${cleanText}_line_${cursorLine}`;
                const newPercent = maxPreviewScrollY > 0 ? targetScrollTop / maxPreviewScrollY : 0;
                addOrUpdateKeyframe(id, cursorLine, newPercent, targetScrollTop);
            }
            
            setTimeout(() => {
                isSyncing = false;
            }, 200); // 200ms 동안 비동기 브라우저 클릭 스크롤 이벤트가 오동작을 유발하는 현상 차단
        }
    }

    // 커서 이동/클릭/입력에 따른 가시성 검사 등록
    cm.on('cursorActivity', () => {
        syncPreviewToCursor();
    });

    cm.on('focus', () => {
        activeScrollSource = 'editor';
    });

    // 8. 에디터 -> 프리뷰 방향 스크롤 매핑 함수 (비율 기반 보간)
    function getPreviewScrollForEditor(editorScrollTop) {
        if (keyframes.length === 0) return 0;
        
        const scrollInfo = cm.getScrollInfo();
        const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;
        const currentPercent = maxEditorScrollTop > 0 ? editorScrollTop / maxEditorScrollTop : 0;
        
        let kfBefore = keyframes[0];
        let kfAfter = keyframes[keyframes.length - 1];
        
        for (let i = 0; i < keyframes.length; i++) {
            const kf = keyframes[i];
            if (kf.editorPercent <= currentPercent) {
                kfBefore = kf;
            } else {
                kfAfter = kf;
                break;
            }
        }
        
        if (kfBefore === kfAfter) {
            return kfBefore.previewScrollY;
        }
        
        const denom = kfAfter.editorPercent - kfBefore.editorPercent;
        const ratio = denom > 0 ? (currentPercent - kfBefore.editorPercent) / denom : 0;
        
        return kfBefore.previewScrollY + ratio * (kfAfter.previewScrollY - kfBefore.previewScrollY);
    }

    // 9. 프리뷰 -> 에디터 방향 스크롤 매핑 함수 (비율 기반 보간)
    function getEditorScrollForPreview(previewScrollTop) {
        if (keyframes.length === 0) return 0;
        
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;
        const currentPercent = maxPreviewScrollY > 0 ? previewScrollTop / maxPreviewScrollY : 0;
        
        let kfBefore = keyframes[0];
        let kfAfter = keyframes[keyframes.length - 1];
        
        for (let i = 0; i < keyframes.length; i++) {
            const kf = keyframes[i];
            if (kf.previewPercent <= currentPercent) {
                kfBefore = kf;
            } else {
                kfAfter = kf;
                break;
            }
        }
        
        const scrollInfo = cm.getScrollInfo();
        const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;
        
        if (kfBefore === kfAfter) {
            return kfBefore.editorPercent * maxEditorScrollTop;
        }
        
        const denom = kfAfter.previewPercent - kfBefore.previewPercent;
        const ratio = denom > 0 ? (currentPercent - kfBefore.previewPercent) / denom : 0;
        const targetEditorPercent = kfBefore.editorPercent + ratio * (kfAfter.editorPercent - kfBefore.editorPercent);
        
        return targetEditorPercent * maxEditorScrollTop;
    }

    /* 기존 절대 매핑 스크롤 동기화 로직 주석 처리
    // 에디터 스크롤 이벤트 바인딩
    cm.on('scroll', () => {
        if (isSyncing) return;
        if (activeScrollSource !== 'editor' || !previewViewport) return;
        
        const scrollInfo = cm.getScrollInfo();
        const scrollTop = scrollInfo.top;
        if (scrollTop === lastEditorScrollTop) return; // 변경사항이 없다면 동기화 스킵 (클릭에 의한 떨림 차단)
        
        lastEditorScrollTop = scrollTop;
        const targetScroll = getPreviewScrollForEditor(scrollTop);
        lastPreviewScrollTop = targetScroll;
        previewViewport.scrollTop = targetScroll;
        updateDebugPanel();
    });
    */

    // 에디터 스크롤 이벤트 바인딩 (상대적 델타 기반 동기화 로직)
    cm.on('scroll', () => {
        if (!enableScrollSync) return; // 스크롤 동기화 비활성화 시 동작 방지
        if (isSyncing) return;
        if (activeScrollSource !== 'editor' || !previewViewport) return;
        
        const scrollInfo = cm.getScrollInfo();
        const scrollTop = scrollInfo.top;
        if (scrollTop === lastEditorScrollTop) return; // 변경사항이 없다면 동기화 스킵 (클릭에 의한 떨림 차단)
        
        // 최초 스크롤 이벤트 시 lastEditorScrollTop 초기화 처리 (튀지 않도록 방지)
        if (lastEditorScrollTop === -1) {
            lastEditorScrollTop = scrollTop;
            return;
        }

        const deltaY_ed = scrollTop - lastEditorScrollTop;
        lastEditorScrollTop = scrollTop;

        const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;
        const maxPreviewScrollY = previewViewport.scrollHeight - previewViewport.clientHeight;

        // 예외 처리: 완전한 최상단/최하단 도달 시 강제 정렬 (누적 오차 해결)
        if (scrollTop <= 0) {
            previewViewport.scrollTop = 0;
            lastPreviewScrollTop = 0;
            updateDebugPanel();
            updateActiveTOCItem();
            return;
        }
        if (scrollTop >= maxEditorScrollTop) {
            previewViewport.scrollTop = maxPreviewScrollY;
            lastPreviewScrollTop = maxPreviewScrollY;
            updateDebugPanel();
            updateActiveTOCItem();
            return;
        }

        // 현재 스크롤 비율 계산
        const currentPercent = maxEditorScrollTop > 0 ? scrollTop / maxEditorScrollTop : 0;
        
        // 보간 구간 탐색
        let kfBefore = keyframes[0];
        let kfAfter = keyframes[keyframes.length - 1];
        
        for (let i = 0; i < keyframes.length; i++) {
            const kf = keyframes[i];
            if (kf.editorPercent <= currentPercent) {
                kfBefore = kf;
            } else {
                kfAfter = kf;
                break;
            }
        }

        // 현재 구간의 스크롤 배율(S) 계산
        const height_ed_range = (kfAfter.editorPercent - kfBefore.editorPercent) * maxEditorScrollTop;
        const height_pr_range = kfAfter.previewScrollY - kfBefore.previewScrollY;
        
        // Division by zero 방지
        const scaleFactor = height_ed_range > 0 ? height_pr_range / height_ed_range : 1.0;

        // 프리뷰 이동할 델타 및 새로운 스크롤탑 적용
        const deltaY_pr = deltaY_ed * scaleFactor;
        let newPreviewScrollTop = previewViewport.scrollTop + deltaY_pr;

        // 범위 값 제한 (Clamping)
        newPreviewScrollTop = Math.max(0, Math.min(newPreviewScrollTop, maxPreviewScrollY));

        lastPreviewScrollTop = newPreviewScrollTop;
        previewViewport.scrollTop = newPreviewScrollTop;
        
        updateDebugPanel();
        updateActiveTOCItem();
    });

    // 프리뷰 스크롤 이벤트 바인딩
    if (previewViewport) {
        previewViewport.addEventListener('scroll', () => {
            if (!enableScrollSync) return; // 스크롤 동기화 비활성화 시 동작 방지
            if (isSyncing) return;
            if (activeScrollSource !== 'preview') return;
            if (previewViewport.scrollTop === lastPreviewScrollTop) return; // 변경사항이 없다면 동기화 스킵
            
            lastPreviewScrollTop = previewViewport.scrollTop;
            const targetScroll = getEditorScrollForPreview(previewViewport.scrollTop);
            lastEditorScrollTop = targetScroll;
            cm.scrollTo(null, targetScroll);
            updateDebugPanel();
            updateActiveTOCItem();
        });
    }

    // 프리뷰 영역의 크기/레이아웃 변화(이미지 로드, 폰트 적용, 창 크기 변경 등)를 감지하여 키프레임 캐시 재구축
    if (preview && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
            recalculateKeyframePositions();
        });
        resizeObserver.observe(preview);
    }

    // ==========================================================================
    // 실시간 키프레임 디버깅 패널 생성 로직
    // ==========================================================================
    const debugPanel = document.createElement('div');
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
    debugPanel.style.display = 'none'; // 기본 숨김
    document.body.appendChild(debugPanel);

    if (btnDebug) {
        btnDebug.addEventListener('click', () => {
            if (debugPanel.style.display === 'none') {
                debugPanel.style.display = 'block';
                updateDebugPanel();
            } else {
                debugPanel.style.display = 'none';
            }
        });
    }

    function updateDebugPanel() {
        if (debugPanel.style.display === 'none') return;
        
        let html = `<div style="font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🔑 Keyframes Debug List (${keyframes.length})</span>
            <span style="color: var(--theme-color);">Active: ${activeScrollSource || 'None'}</span>
        </div>`;
        
        html += `<table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
                <tr style="color: #94a3b8; border-bottom: 1px solid #1e293b;">
                    <th style="padding: 2px;">Line</th>
                    <th style="padding: 2px;">ID (Text)</th>
                    <th style="padding: 2px; text-align: right;">Ed%</th>
                    <th style="padding: 2px; text-align: right;">Pr%</th>
                    <th style="padding: 2px; text-align: right;">Y(px)</th>
                </tr>
            </thead>
            <tbody>`;
            
        keyframes.forEach((kf) => {
            const edPct = (kf.editorPercent * 100).toFixed(0) + '%';
            const prPct = (kf.previewPercent * 100).toFixed(0) + '%';
            const isBoundary = kf.id === '[START]' || kf.id === '[END]';
            const rowColor = isBoundary ? '#64748b' : '#38bdf8';
            
            html += `<tr style="color: ${rowColor}; border-bottom: 1px dashed #1e293b;">
                <td style="padding: 3px 2px;">${kf.line.toFixed(1)}</td>
                <td style="padding: 3px 2px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${kf.id}">${kf.id}</td>
                <td style="padding: 3px 2px; text-align: right;">${edPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${prPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${Math.round(kf.previewScrollY)}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        debugPanel.innerHTML = html;
    }

    // ==========================================================================
    // 초기 렌더링 및 이벤트 등록 (Scroll Sync 초기화 지연 방지를 위해 가장 하단에 배치)
    // ==========================================================================
    // 탐색기 더블클릭 연동으로 로드되었는지 확인 및 적용
    if (window.loadedFileContent && typeof window.loadedFileContent.content === 'string') {
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

    // 스크롤 동기화 토글 변경 시 이벤트 바인딩
    if (scrollSyncCheckbox) {
        scrollSyncCheckbox.addEventListener('change', () => {
            enableScrollSync = scrollSyncCheckbox.checked;
            if (enableScrollSync) {
                // 동기화 활성화 시 현재 커서 위치로 즉시 프리뷰 정렬
                syncPreviewToCursor();
            }
        });
    }

    // 저장 버튼 클릭 이벤트 바인딩
    if (btnSave) {
        btnSave.addEventListener('click', downloadCurrentContent);
    }

    // 설정 모달 관련 엘리먼트 및 이벤트 바인딩
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const btnRegChrome = document.getElementById('btn-reg-chrome');
    const btnRegEdge = document.getElementById('btn-reg-edge');

    if (btnSettings && settingsModal) {
        btnSettings.addEventListener('click', () => {
            settingsModal.style.display = 'block';
        });
    }

    if (closeSettings && settingsModal) {
        closeSettings.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // 레지스트리(.reg) 파일 다운로드 헬퍼
    function downloadRegFile(filename, regContent) {
        const blob = new Blob([regContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (btnRegChrome) {
        btnRegChrome.addEventListener('click', () => {
            const chromeReg = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\.md]
@="ChromeHTML"
`;
            downloadRegFile('associate_chrome.reg', chromeReg);
            alert('Chrome 연결등록 레지스트리 파일(associate_chrome.reg)이 다운로드되었습니다.\n\n다운로드된 파일을 더블 클릭하여 실행(병합)해 주세요!');
            settingsModal.style.display = 'none';
        });
    }

    if (btnRegEdge) {
        btnRegEdge.addEventListener('click', () => {
            const edgeReg = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\.md]
@="MSEdgeHTM"
`;
            downloadRegFile('associate_edge.reg', edgeReg);
            alert('Edge 연결등록 레지스트리 파일(associate_edge.reg)이 다운로드되었습니다.\n\n다운로드된 파일을 더블 클릭하여 실행(병합)해 주세요!');
            settingsModal.style.display = 'none';
        });
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
    const btnEditHeadingStyle = document.getElementById('btn-edit-heading-style');
    const headingModal = document.getElementById('heading-modal');
    const closeHeadingModal = document.getElementById('close-heading-modal');
    const modalHeadingSelect = document.getElementById('modal-heading-preset-select');
    const headingStyleControls = document.getElementById('heading-style-controls');
    const btnSaveHeadingPreset = document.getElementById('btn-save-heading-preset');
    const btnAddHeadingPreset = document.getElementById('btn-add-heading-preset');
    const btnDeleteHeadingPreset = document.getElementById('btn-delete-heading-preset');
    const btnResetHeadingPresets = document.getElementById('btn-reset-heading-presets');
    const btnSaveOnlyHeadingPreset = document.getElementById('btn-save-only-heading-preset');
    const btnCloseHeadingModal = document.getElementById('btn-close-heading-modal');
    const headingPresetSelect = document.getElementById('heading-preset-select');

    function showToast(message, duration = 3000) {
        let toast = document.getElementById('markvi-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'markvi-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');

        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function renderHeadingModalControls(presetId) {
        if (!headingStyleControls) return;
        headingStyleControls.innerHTML = '';

        const presets = getHeadingPresets();
        const found = presets.find(p => p.id === presetId) || presets[0];
        if (!found || !found.styles) return;

        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
            const styleObj = found.styles[tag] || {};
            const colorLight = styleObj.colorLight || styleObj.color || '#1d4ed8';
            const colorDark = styleObj.colorDark || styleObj.color || '#3b82f6';
            const size = styleObj.size || '1em';
            const border = styleObj.border || 'none';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.padding = '3px 8px';
            row.style.background = 'var(--input-frame-bg)';
            row.style.border = '1px solid var(--border-frame)';
            row.style.borderRadius = '4px';

            row.innerHTML = `
                <span style="font-weight: 700; width: 42px; font-size: 0.8rem; color: var(--frame-accent-color);"># ${tag.toUpperCase()}</span>
                <label style="font-size: 0.75rem; color: var(--text-frame-muted);">크기:</label>
                <input type="text" id="modal-${tag}-size" value="${size}" style="width: 45px; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                <span style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) Heading 색상">
                    ☀️<input type="color" id="modal-${tag}-color-light" value="${colorLight}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) Heading 색상">
                    🌙<input type="color" id="modal-${tag}-color-dark" value="${colorDark}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">하단선:</label>
                <input type="text" id="modal-${tag}-border" value="${border}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
            `;
            headingStyleControls.appendChild(row);
        });

        // 🔗 [ ] 대괄호 링크 행 생성
        const linkObj = found.styles.link || { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' };
        const linkRow = document.createElement('div');
        linkRow.style.display = 'flex';
        linkRow.style.alignItems = 'center';
        linkRow.style.gap = '6px';
        linkRow.style.padding = '3px 8px';
        linkRow.style.background = 'var(--input-frame-bg)';
        linkRow.style.border = '1px solid var(--border-frame)';
        linkRow.style.borderRadius = '4px';

        linkRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #38bdf8; display:flex; align-items:center; gap:2px;">🔗 [ 대괄호 링크 ]</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) 대괄호 링크 색상">
                ☀️<input type="color" id="modal-link-color-light" value="${linkObj.colorLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) 대괄호 링크 색상">
                🌙<input type="color" id="modal-link-color-dark" value="${linkObj.colorDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">밑줄:</label>
            <select id="modal-link-decoration" style="padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem; flex:1;">
                <option value="underline" ${linkObj.decoration === 'underline' ? 'selected' : ''}>underline (밑줄 있음)</option>
                <option value="none" ${linkObj.decoration === 'none' ? 'selected' : ''}>none (밑줄 없음)</option>
            </select>
        `;
        headingStyleControls.appendChild(linkRow);

        // 💪 굵게 행 생성
        const strongObj = found.styles.strong || { colorLight: '#0f172a', colorDark: '#f8fafc' };
        const strongRow = document.createElement('div');
        strongRow.style.display = 'flex';
        strongRow.style.alignItems = 'center';
        strongRow.style.gap = '6px';
        strongRow.style.padding = '3px 8px';
        strongRow.style.background = 'var(--input-frame-bg)';
        strongRow.style.border = '1px solid var(--border-frame)';
        strongRow.style.borderRadius = '4px';

        strongRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #f59e0b; display:flex; align-items:center; gap:2px;"><strong style="font-size:0.85rem; font-weight:800; font-family:serif; margin-right:6px;">B</strong> ** 굵게 **</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 굵게 글자 색상">
                ☀️<input type="color" id="modal-strong-color-light" value="${strongObj.colorLight || '#0f172a'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 굵게 글자 색상">
                🌙<input type="color" id="modal-strong-color-dark" value="${strongObj.colorDark || '#f8fafc'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
        `;
        headingStyleControls.appendChild(strongRow);

        // ✨ * 기울임 * 행 생성
        const emObj = found.styles.em || { colorLight: '#0f172a', colorDark: '#f8fafc' };
        const emRow = document.createElement('div');
        emRow.style.display = 'flex';
        emRow.style.alignItems = 'center';
        emRow.style.gap = '6px';
        emRow.style.padding = '3px 8px';
        emRow.style.background = 'var(--input-frame-bg)';
        emRow.style.border = '1px solid var(--border-frame)';
        emRow.style.borderRadius = '4px';

        emRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #eab308; display:flex; align-items:center; gap:2px;"><em style="font-size:0.85rem; font-style:italic; font-family:serif; margin-right:6px;">I</em> * 기울임 *</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 기울임 글자 색상">
                ☀️<input type="color" id="modal-em-color-light" value="${emObj.colorLight || '#0f172a'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 기울임 글자 색상">
                🌙<input type="color" id="modal-em-color-dark" value="${emObj.colorDark || '#f8fafc'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
        `;
        headingStyleControls.appendChild(emRow);

        // 💻 ` ` Inline code 행 생성
        const codeObj = found.styles.code || { colorLight: '#0969da', colorDark: '#38bdf8' };
        const codeRow = document.createElement('div');
        codeRow.style.display = 'flex';
        codeRow.style.alignItems = 'center';
        codeRow.style.gap = '6px';
        codeRow.style.padding = '3px 8px';
        codeRow.style.background = 'var(--input-frame-bg)';
        codeRow.style.border = '1px solid var(--border-frame)';
        codeRow.style.borderRadius = '4px';

        codeRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #ec4899; display:flex; align-items:center; gap:2px;">💻 \` Inline code \`</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 Inline Code 색상">
                ☀️<input type="color" id="modal-code-color-light" value="${codeObj.colorLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 Inline Code 색상">
                🌙<input type="color" id="modal-code-color-dark" value="${codeObj.colorDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
        `;
        headingStyleControls.appendChild(codeRow);

        // 💬 인용문 (Blockquote) 행 생성
        const bqObj = found.styles.blockquote || { colorLight: '#475569', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' };
        const bqRow = document.createElement('div');
        bqRow.style.display = 'flex';
        bqRow.style.alignItems = 'center';
        bqRow.style.gap = '6px';
        bqRow.style.padding = '3px 8px';
        bqRow.style.background = 'var(--input-frame-bg)';
        bqRow.style.border = '1px solid var(--border-frame)';
        bqRow.style.borderRadius = '4px';

        bqRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #a855f7; display:flex; align-items:center; gap:2px;">💬 > 인용문</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">글자:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 인용문 글자 색상">
                ☀️<input type="color" id="modal-blockquote-color-light" value="${bqObj.colorLight || '#475569'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 인용문 글자 색상">
                🌙<input type="color" id="modal-blockquote-color-dark" value="${bqObj.colorDark || '#cbd5e1'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 4px;">테두리:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 인용문 테두리 색상">
                ☀️<input type="color" id="modal-blockquote-border-light" value="${bqObj.borderLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 인용문 테두리 색상">
                🌙<input type="color" id="modal-blockquote-border-dark" value="${bqObj.borderDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
        `;
        headingStyleControls.appendChild(bqRow);

        // ➖ Line (선 색상/구분선) 행 생성
        const lineObj = found.styles.line || { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' };
        const lineRow = document.createElement('div');
        lineRow.style.display = 'flex';
        lineRow.style.alignItems = 'center';
        lineRow.style.gap = '6px';
        lineRow.style.padding = '3px 8px';
        lineRow.style.background = 'var(--input-frame-bg)';
        lineRow.style.border = '1px solid var(--border-frame)';
        lineRow.style.borderRadius = '4px';

        lineRow.innerHTML = `
            <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #10b981; display:flex; align-items:center; gap:2px;">➖ --- line 구분선</span>
            <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
            <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) 선 색상">
                ☀️<input type="color" id="modal-line-color-light" value="${lineObj.colorLight || '#cbd5e1'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) 선 색상">
                🌙<input type="color" id="modal-line-color-dark" value="${lineObj.colorDark || '#334155'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
            </label>
            <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">선 스타일:</label>
            <input type="text" id="modal-line-border" value="${lineObj.border || '1px solid #334155'}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
        `;
        headingStyleControls.appendChild(lineRow);
    }

    if (btnEditHeadingStyle && headingModal) {
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
            renderHeadingModalControls(currentActive);
            headingModal.style.display = 'block';
        });
    }

    function closeHeadingStyleModal() {
        if (headingModal) {
            headingModal.style.display = 'none';
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

    if (closeHeadingModal) closeHeadingModal.addEventListener('click', closeHeadingStyleModal);
    if (btnCloseHeadingModal) btnCloseHeadingModal.addEventListener('click', closeHeadingStyleModal);

    function saveCurrentHeadingModalInputs() {
        const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
        const presets = getHeadingPresets();
        const foundIdx = presets.findIndex(p => p.id === currentId);
        if (foundIdx !== -1) {
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const colorLightEl = document.getElementById(`modal-${tag}-color-light`);
                const colorDarkEl = document.getElementById(`modal-${tag}-color-dark`);
                const sizeEl = document.getElementById(`modal-${tag}-size`);
                const borderEl = document.getElementById(`modal-${tag}-border`);
                if (colorLightEl && colorDarkEl && sizeEl && borderEl) {
                    presets[foundIdx].styles[tag] = {
                        colorLight: colorLightEl.value,
                        colorDark: colorDarkEl.value,
                        size: sizeEl.value,
                        border: borderEl.value
                    };
                }
            });

            // 🔗 Link 수거
            const linkLight = document.getElementById('modal-link-color-light');
            const linkDark = document.getElementById('modal-link-color-dark');
            const linkDeco = document.getElementById('modal-link-decoration');
            if (linkLight && linkDark && linkDeco) {
                presets[foundIdx].styles.link = {
                    colorLight: linkLight.value,
                    colorDark: linkDark.value,
                    decoration: linkDeco.value
                };
            }

            // 💪 굵게 수거
            const strongLight = document.getElementById('modal-strong-color-light');
            const strongDark = document.getElementById('modal-strong-color-dark');
            if (strongLight && strongDark) {
                presets[foundIdx].styles.strong = {
                    colorLight: strongLight.value,
                    colorDark: strongDark.value
                };
            }

            // ✨ 기울임 수거
            const emLight = document.getElementById('modal-em-color-light');
            const emDark = document.getElementById('modal-em-color-dark');
            if (emLight && emDark) {
                presets[foundIdx].styles.em = {
                    colorLight: emLight.value,
                    colorDark: emDark.value
                };
            }

            // 💻 ` ` Inline code 수거
            const codeLight = document.getElementById('modal-code-color-light');
            const codeDark = document.getElementById('modal-code-color-dark');
            if (codeLight && codeDark) {
                presets[foundIdx].styles.code = {
                    colorLight: codeLight.value,
                    colorDark: codeDark.value
                };
            }

            // 💬 인용문 수거
            const bqLight = document.getElementById('modal-blockquote-color-light');
            const bqDark = document.getElementById('modal-blockquote-color-dark');
            const bqBorderLight = document.getElementById('modal-blockquote-border-light');
            const bqBorderDark = document.getElementById('modal-blockquote-border-dark');
            if (bqLight && bqDark && bqBorderLight && bqBorderDark) {
                presets[foundIdx].styles.blockquote = {
                    colorLight: bqLight.value,
                    colorDark: bqDark.value,
                    borderLight: bqBorderLight.value,
                    borderDark: bqBorderDark.value
                };
            }

            // ➖ Line 수거
            const lineLight = document.getElementById('modal-line-color-light');
            const lineDark = document.getElementById('modal-line-color-dark');
            const lineBorder = document.getElementById('modal-line-border');
            if (lineLight && lineDark && lineBorder) {
                presets[foundIdx].styles.line = {
                    colorLight: lineLight.value,
                    colorDark: lineDark.value,
                    border: lineBorder.value
                };
            }
            saveHeadingPresets(presets);
            applyHeadingPreset(currentId);
            renderMarkdown();
            return presets[foundIdx].name;
        }
        return null;
    }

    if (btnSaveOnlyHeadingPreset) {
        btnSaveOnlyHeadingPreset.addEventListener('click', () => {
            const presetName = saveCurrentHeadingModalInputs();
            if (presetName) {
                showToast(`'${presetName}' 세트 스타일이 저장되었습니다.`);
            }
        });
    }

    if (btnSaveHeadingPreset) {
        btnSaveHeadingPreset.addEventListener('click', () => {
            const presetName = saveCurrentHeadingModalInputs();
            closeHeadingStyleModal();
            if (presetName) {
                showToast(`'${presetName}' 세트가 적용되었습니다.`);
            }
        });
    }

    if (btnAddHeadingPreset) {
        btnAddHeadingPreset.addEventListener('click', () => {
            const name = prompt('새로운 Heading Style Set의 이름을 입력하세요:', '새 스타일 세트');
            if (name && name.trim()) {
                const newId = 'custom_' + Date.now();
                const presets = getHeadingPresets();
                const newPreset = {
                    id: newId,
                    name: `${presets.length + 1}. ${name.trim()}`,
                    styles: {
                        h1: { colorLight: '#1d4ed8', colorDark: '#3b82f6', size: '2.2em', border: '2px solid #3b82f6' },
                        h2: { colorLight: '#0369a1', colorDark: '#60a5fa', size: '1.6em', border: '1px solid #60a5fa' },
                        h3: { colorLight: '#0ea5e9', colorDark: '#93c5fd', size: '1.3em', border: 'none' },
                        h4: { colorLight: '#38bdf8', colorDark: '#cbd5e1', size: '1.1em', border: 'none' },
                        h5: { colorLight: '#7dd3fc', colorDark: '#94a3b8', size: '0.9em', border: 'none' },
                        h6: { colorLight: '#bae6fd', colorDark: '#64748b', size: '0.85em', border: 'none' },
                        link: { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' },
                        strong: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                        em: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                        code: { colorLight: '#0969da', colorDark: '#38bdf8' },
                        blockquote: { colorLight: '#475569', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                        line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
                    }
                };
                presets.push(newPreset);
                saveHeadingPresets(presets);
                updatePresetSelectOptions();
                applyHeadingPreset(newId);
                renderHeadingModalControls(newId);
                renderMarkdown();
                showToast(`'${newPreset.name}' 세트가 생성되었습니다.`);
            }
        });
    }

    if (btnDeleteHeadingPreset) {
        btnDeleteHeadingPreset.addEventListener('click', () => {
            const currentId = modalHeadingSelect ? modalHeadingSelect.value : '';
            const presets = getHeadingPresets();
            if (presets.length <= 1) {
                showToast('최소 1개의 Heading Style Set은 유지되어야 합니다.');
                return;
            }
            const foundIdx = presets.findIndex(p => p.id === currentId);
            if (foundIdx !== -1) {
                if (confirm(`'${presets[foundIdx].name}' 세트를 삭제하시겠습니까?`)) {
                    const deletedName = presets[foundIdx].name;
                    presets.splice(foundIdx, 1);
                    saveHeadingPresets(presets);
                    updatePresetSelectOptions();
                    applyHeadingPreset(presets[0].id);
                    renderHeadingModalControls(presets[0].id);
                    renderMarkdown();
                    showToast(`'${deletedName}' 세트가 삭제되었습니다.`);
                }
            }
        });
    }

    if (btnResetHeadingPresets) {
        btnResetHeadingPresets.addEventListener('click', () => {
            const currentId = modalHeadingSelect ? modalHeadingSelect.value : 'github_classic';
            const presets = getHeadingPresets();
            const defaultPreset = DEFAULT_HEADING_PRESETS.find(p => p.id === currentId);

            if (defaultPreset) {
                if (confirm(`'${defaultPreset.name}' 스타일 세트를 초기 기본값으로 복원하시겠습니까?`)) {
                    const foundIdx = presets.findIndex(p => p.id === currentId);
                    if (foundIdx !== -1) {
                        presets[foundIdx] = JSON.parse(JSON.stringify(defaultPreset));
                        saveHeadingPresets(presets);
                        applyHeadingPreset(currentId);
                        renderHeadingModalControls(currentId);
                        renderMarkdown();
                        showToast(`'${defaultPreset.name}' 세트가 초기 기본값으로 복원되었습니다.`);
                    }
                }
            } else {
                showToast('기본 제공 5종 프리셋만 초기값 복원이 가능합니다.');
            }
        });
    }

    // 문서 시작 시 Heading Preset 초기화
    updatePresetSelectOptions();
    const activePreset = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
    applyHeadingPreset(activePreset);
});

