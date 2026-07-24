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
    let enableScrollSync = true;
    let scrollSync = null;

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

    // 헬퍼: 현재 앱의 테마 및 CSS 스타일 변수 맵 수집 함수 (Structured Options Object 생성)
    function collectExportOptions() {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-editor-theme') || 'dark';
        const activeLineColor = lineColorPicker ? lineColorPicker.value : '#3b82f6';
        const computedStyle = getComputedStyle(root);
        
        // 프리뷰의 전체 테마 (배경, 글자색, 인용구, 코드 배경) + Heading Preset 변수 수집 목록
        const cssVarList = [
            '--preview-bg', '--preview-text', '--preview-heading', '--preview-border',
            '--preview-code-bg', '--preview-blockquote-bg', '--preview-blockquote-text',
            '--h1-color', '--h1-size', '--h1-border',
            '--h2-color', '--h2-size', '--h2-border',
            '--h3-color', '--h3-size', '--h3-border',
            '--h4-color', '--h4-size', '--h4-border',
            '--h5-color', '--h5-size', '--h5-border',
            '--h6-color', '--h6-size', '--h6-border',
            '--link-color', '--link-decoration',
            '--bold-color', '--italic-color', '--code-color',
            '--blockquote-text-color', '--blockquote-border-color',
            '--line-color', '--line-border',
            '--preview-font-family', '--preview-font-size'
        ];

        const styleVars = {};
        cssVarList.forEach(varName => {
            const val = computedStyle.getPropertyValue(varName).trim();
            if (val) styleVars[varName] = val;
        });

        return {
            theme: currentTheme,
            lineColor: activeLineColor,
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
            let shouldLoad = true;
            
            if (isDirty) {
                const saveConfirm = confirm(`작성 중인 내용이 변경되었습니다. 파일 로드 전에 현재 문서를 컴퓨터에 저장(다운로드)하시겠습니까?`);
                if (saveConfirm) {
                    handleSaveCurrentDocument();
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
    // 실시간 키프레임 디버깅 패널 렌더링 함수 (ScrollSync 연동)
    // ==========================================================================
    function updateDebugPanelUI(keyframesList, activeSource) {
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
            const sfVal = kf.scaleFactor !== null ? kf.scaleFactor : '-';
            
            const sfHighlight = kf.isActiveSegment 
                ? `background: #0284c7; color: #ffffff; padding: 1px 5px; border-radius: 4px; font-weight: bold; box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);` 
                : `color: ${rowColor};`;

            const rowBg = kf.isActiveSegment ? 'background: rgba(2, 132, 199, 0.15);' : '';

            html += `<tr style="color: ${rowColor}; ${rowBg} border-bottom: 1px dashed #1e293b;">
                <td style="padding: 3px 2px;">${Math.round(kf.line)}</td>
                <td style="padding: 3px 2px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${kf.id}">${kf.id}</td>
                <td style="padding: 3px 2px; text-align: right;">${edPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${prPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${Math.round(kf.previewScrollY)}</td>
                <td style="padding: 3px 2px; text-align: right;"><span style="${sfHighlight}">${sfVal}</span></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        debugPanel.innerHTML = html;
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
                if (scrollSync) {
                    scrollSync.rebuildKeyframes('Keyframe Button Toggle');
                }
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

    // 저장 처리 헬퍼 함수
    function handleSaveCurrentDocument() {
        if (!cm) return;
        const textContent = cm.getValue();
        ExportManager.downloadCurrentContent(textContent, currentFilename, (savedName) => {
            updateFilenameDisplay(savedName, false);
            saveDocumentSession();
            showToast(`"${savedName}" 파일이 저장되었습니다.`);
        });
    }

    // 저장 버튼 클릭 이벤트 바인딩
    if (btnSave) {
        btnSave.addEventListener('click', handleSaveCurrentDocument);
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
        if (window.StyleEditor) {
            window.StyleEditor.renderControls(presetId);
        }
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
            // 모달 닫기 시 드래그 누적 위치 및 인라인 transform 원복 리셋
            if (window.StyleEditor && typeof window.StyleEditor.resetModalPosition === 'function') {
                window.StyleEditor.resetModalPosition();
            }
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
            controlsContainer: headingStyleControls,
            presetSelect: modalHeadingSelect,
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



