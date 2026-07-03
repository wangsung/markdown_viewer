document.addEventListener('DOMContentLoaded', () => {
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
            }
        }
    });

    const preview = document.getElementById('preview');
    const dragDivider = document.getElementById('drag-divider');
    const editorPanel = document.getElementById('editor-panel');
    const container = document.querySelector('.container');
    
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

        markedOptions.extensions = [inlineMath, blockMath];
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
        
        // Calculate percentage width of the left panel
        const relativeX = clientX - containerRect.left;
        let percentage = (relativeX / containerRect.width) * 100;
        
        // Enforce boundary constraints (20% to 80%)
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
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
    });

    // 2. Font Size Selector
    fontSizeSelect.addEventListener('change', () => {
        preview.style.setProperty('--preview-font-size', fontSizeSelect.value);
    });

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

    lineColorPicker.addEventListener('input', (e) => {
        updateThemeColors(e.target.value);
    });

    // Initialize theme colors on load
    updateThemeColors(lineColorPicker.value);

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
    // Copy Rendered HTML Logic
    // ==========================================================================
    btnCopy.addEventListener('click', () => {
        const htmlContent = preview.innerHTML;
        
        // If content is empty
        if (!htmlContent || htmlContent.trim() === '') {
            alert('복사할 렌더링된 내용이 없습니다.');
            return;
        }
        
        // Modern Clipboard API
        navigator.clipboard.writeText(htmlContent).then(() => {
            // Success Feedback
            const originalHTML = btnCopy.innerHTML;
            btnCopy.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                복사 완료!
            `;
            btnCopy.style.borderColor = '#10b981';
            btnCopy.style.color = '#10b981';
            
            setTimeout(() => {
                btnCopy.innerHTML = originalHTML;
                btnCopy.style.borderColor = '';
                btnCopy.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = htmlContent;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('HTML 코드가 복사되었습니다. (대체 방식)');
            } catch (err) {
                alert('클립보드 복사 실패. 브라우저 설정을 확인해 주세요.');
            }
            document.body.removeChild(textarea);
        });
    });
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

    // 에디터 내용을 마크다운 파일(.md)로 다운로드하는 헬퍼 함수
    function downloadCurrentContent() {
        const text = cm.getValue();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 저장 완료 후 수정 안 됨 상태로 업데이트
        updateFilenameDisplay(currentFilename, false);
    }

    editorContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        editorContainer.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
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
                alert('불러올 수 없는 파일 형식입니다. 마크다운(.md) 또는 텍스트(.txt) 파일을 드롭해 주세요.');
            }
        }
    });

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

    // 2. 식별 텍스트를 기준으로 프리뷰 내 DOM 엘리먼트 검색
    function findPreviewElementByIdentifier(id) {
        if (!id || id === '[START]' || id === '[END]') return null;
        
        const candidates = preview.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table');
        const cleanId = id.trim().toLowerCase();
        
        for (let el of candidates) {
            const text = el.textContent.trim().toLowerCase();
            if (text.startsWith(cleanId) || cleanId.startsWith(text.substring(0, 30))) {
                return el;
            }
        }
        return null;
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
            const id = cleanTextForIdentifier(el.textContent, true);
            if (!isNaN(line) && id) {
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
        
        let pivotIndex = keyframes.findIndex(kf => kf.id === id);
        let oldPercent = 0;
        
        if (pivotIndex !== -1) {
            oldPercent = keyframes[pivotIndex].previewPercent;
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
                keyframes[j].previewPercent = keyframes[j].previewPercent * (newPercent / oldPercent);
                keyframes[j].previewScrollY = keyframes[j].previewPercent * maxPreviewScrollY;
            }
        }
        
        // pivotIndex + 1부터 N - 2 까지 (하단 영역)
        for (let j = pivotIndex + 1; j < N - 1; j++) {
            const denom = 1.0 - oldPercent;
            if (denom > 0) {
                const ratio = (keyframes[j].previewPercent - oldPercent) / denom;
                keyframes[j].previewPercent = newPercent + ratio * (1.0 - newPercent);
                keyframes[j].previewScrollY = keyframes[j].previewPercent * maxPreviewScrollY;
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
            const id = getLineIdentifier(cursorLine);
            if (id) {
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
            return;
        }
        if (scrollTop >= maxEditorScrollTop) {
            previewViewport.scrollTop = maxPreviewScrollY;
            lastPreviewScrollTop = maxPreviewScrollY;
            updateDebugPanel();
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

    // Trigger Initial Render
    renderMarkdown();
    updateDebugPanel();

    // Auto Render Event
    cm.on('change', () => {
        updateFilenameDisplay(currentFilename, true);
        renderMarkdown();
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
});

