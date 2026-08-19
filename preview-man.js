window.PreviewManager = (function() {
    function assert_arg(condition, message, context = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function' && window.assert_arg !== assert_arg) {
            return window.assert_arg(condition, message, context);
        }
        if (!condition) console.error(`[System Warning] ${message}`, context);
        return !!condition;
    }

    let isMarkedInitialized = false;

    /**
     * 순수 하위 서브 함수: HTML 렌더링 시 특수문자 이스케이프 처리를 수행합니다.
     */
    function escape_html(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 순수 하위 서브 함수: 코드 블록 내의 Hex 컬러 코드 옆에 작은 네모 스와치를 주입합니다.
     * @param {Document} doc - 전역 document 객체
     * @param {HTMLElement} previewContainer - 스와치를 주입할 대상 컨테이너 엘리먼트
     */
    function inject_color_swatches(doc, previewContainer) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewContainer, 'inject_color_swatches: previewContainer is required!', { previewContainer });
        }
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
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewContainer, 'remove_color_swatches: previewContainer is required!', { previewContainer });
        }
        if (!previewContainer) return;
        const swatches = previewContainer.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.remove();
        });
    }

    /**
     * 순수 하위 서브 함수: 마크다운 렌더링에 필요한 파서 및 플러그인을 초기화합니다.
     */
    function init_marked_parser() {
        if (typeof marked === 'undefined') return;
        if (isMarkedInitialized) return;
        isMarkedInitialized = true;
        
        const isKatexAvailable = typeof katex !== 'undefined';
        const isMermaidAvailable = typeof mermaid !== 'undefined';
        
        if (typeof window._enableMathSupport === 'undefined') {
            window._enableMathSupport = isKatexAvailable;
        }
        if (typeof window._enableDiagramSupport === 'undefined') {
            window._enableDiagramSupport = isMermaidAvailable;
        }

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

        const renderer = new marked.Renderer();
        
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
            
            if ((lang === 'math' || lang === 'latex') && window._enableMathSupport && typeof katex !== 'undefined') {
                try {
                    return `<div class="katex-block">${katex.renderToString(text, { displayMode: true, throwOnError: false })}</div>`;
                } catch (e) {
                    console.error("KaTeX code block error:", e);
                    return `<div class="katex-error">${escape_html(text)}</div>`;
                }
            }

            if (lang === 'mermaid' && window._enableDiagramSupport && typeof mermaid !== 'undefined') {
                return `<div class="mermaid">${escape_html(text)}</div>`;
            }
            
            const validLang = !!(lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang));
            let highlighted = '';
            try {
                if (validLang) {
                    highlighted = hljs.highlight(text, { language: lang }).value;
                } else {
                    highlighted = escape_html(text);
                }
            } catch (e) {
                console.error("Syntax highlighting error:", e);
                highlighted = escape_html(text);
            }
            return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
        };

        const markedOptions = {
            renderer: renderer,
            gfm: true,
            breaks: true,
            pedantic: false
        };

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
                if (window._enableMathSupport && typeof katex !== 'undefined') {
                    try {
                        return katex.renderToString(token.formula, { displayMode: false, throwOnError: false });
                    } catch (err) {
                        return `<span class="katex-error">${escape_html(token.raw)}</span>`;
                    }
                }
                return escape_html(token.raw);
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
                if (window._enableMathSupport && typeof katex !== 'undefined') {
                    try {
                        return `<div class="katex-block">${katex.renderToString(token.formula, { displayMode: true, throwOnError: false })}</div>`;
                    } catch (err) {
                        return `<div class="katex-error">${escape_html(token.raw)}</div>`;
                    }
                }
                return `<div class="katex-fallback">${escape_html(token.raw)}</div>`;
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

    /**
     * 순수 하위 서브 함수: KaTeX 수식 렌더링 지원을 초기화합니다.
     * @param {Object} [options] - 초기화 옵션 (mathRenderWrapper, mathRenderCheckbox 등)
     */
    function init_math_support(options = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(options && typeof options === 'object', 'init_math_support: options must be an object!', { options });
        }
        const opts = options || {};
        const { mathRenderWrapper, mathRenderCheckbox } = opts;

        const isKatexAvailable = typeof katex !== 'undefined';
        const enableMathSupport = isKatexAvailable;

        if (mathRenderWrapper) {
            if (!isKatexAvailable) {
                mathRenderWrapper.style.display = 'none';
            } else if (mathRenderCheckbox) {
                mathRenderCheckbox.checked = enableMathSupport;
            }
        }

        set_math_support(enableMathSupport);
        init_marked_parser();

        return enableMathSupport;
    }

    /**
     * 순수 하위 서브 함수: Mermaid 다이어그램 렌더링 지원을 초기화합니다.
     * @param {Object} [options] - 초기화 옵션 (diagramRenderWrapper, diagramRenderCheckbox 등)
     */
    function init_diagram_support(options = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(options && typeof options === 'object', 'init_diagram_support: options must be an object!', { options });
        }
        const opts = options || {};
        const { diagramRenderWrapper, diagramRenderCheckbox } = opts;

        const isMermaidAvailable = typeof mermaid !== 'undefined';
        const enableDiagramSupport = isMermaidAvailable;

        if (diagramRenderWrapper) {
            if (!isMermaidAvailable) {
                diagramRenderWrapper.style.display = 'none';
            } else if (diagramRenderCheckbox) {
                diagramRenderCheckbox.checked = enableDiagramSupport;
            }
        }

        set_diagram_support(enableDiagramSupport);

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

        init_marked_parser();

        return enableDiagramSupport;
    }

    /**
     * 순수 하위 서브 함수: 컨테이너 내부의 Mermaid 다이어그램을 비동기 렌더링합니다.
     * @param {HTMLElement} containerEl - 다이어그램이 포함된 프리뷰 컨테이너
     */
    function render_diagrams(containerEl) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(containerEl, 'render_diagrams: containerEl is required!', { containerEl });
        }
        if (!containerEl) return;

        if (window._enableDiagramSupport && typeof mermaid !== 'undefined') {
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
    }

    /**
     * 순수 하위 서브 함수: 마크다운 렌더링을 수행합니다.
     */
    function render_markdown(cm, previewEl, colorSwatchCheckbox, scrollSync, buildTOC) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewEl, 'render_markdown: previewEl DOM element is required!', { previewEl });
            window.assert_arg(cm && typeof cm.getValue === 'function', 'render_markdown: CodeMirror instance is required!', { cm });
        }
        if (!cm || !previewEl) return;
        const markdownText = cm.getValue().replace(/\r\n/g, '\n');
        
        if (typeof marked === 'undefined') {
            previewEl.innerHTML = `<div style="color: red; padding: 20px;">marked.js 라이브러리가 로드되지 않았습니다.</div>`;
            return;
        }

        init_marked_parser();

        try {
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
                return low;
            }

            const tokens = marked.lexer(markdownText);
            let lastSearchIndex = 0;

            function injectDataLine(html, line) {
                const trimmed = html.trim();
                if (trimmed.startsWith('<')) {
                    return trimmed.replace(/^<([a-zA-Z0-9\-]+)/, `<$1 data-line="${line}"`);
                }
                return html;
            }

            const htmlSegments = tokens.map(token => {
                const index = markdownText.indexOf(token.raw, lastSearchIndex);
                let lineNum = 1;
                if (index !== -1) {
                    lineNum = getLineNumber(index);
                    lastSearchIndex = index + token.raw.length;
                }
                
                let rawHtml = '';
                try {
                    rawHtml = marked.parser([token]);
                } catch (err) {
                    console.error("Token parsing error:", err);
                    rawHtml = token.raw;
                }
                
                return injectDataLine(rawHtml, lineNum);
            });

            previewEl.innerHTML = htmlSegments.join('\n');
            
            if (!colorSwatchCheckbox || colorSwatchCheckbox.checked) {
                inject_color_swatches(document, previewEl);
            }
            
            render_diagrams(previewEl);
            
            const activeScrollSync = scrollSync || (typeof window !== 'undefined' && typeof window.ScrollSyncManager !== 'undefined' ? window.ScrollSyncManager.getInstance() : null) || (typeof window !== 'undefined' ? window.scrollSync : null);
            if (activeScrollSync && typeof activeScrollSync.rebuildKeyframes === 'function') {
                activeScrollSync.rebuildKeyframes('Stage 1: renderMarkdown');
            }

            if (typeof buildTOC === 'function') {
                buildTOC();
            }
            
        } catch (e) {
            console.error("Rendering error:", e);
            previewEl.innerHTML = `<div style="color: red; padding: 20px;">마크다운 렌더링 에러: ${e.message}</div>`;
        }
    }

    /**
     * 순수 하위 서브 함수: 프리뷰의 글꼴을 설정합니다.
     */
    function apply_preview_font_family(previewEl, font) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewEl, 'apply_preview_font_family: previewEl is required!', { previewEl, font });
        }
        if (!previewEl || !font) return;
        previewEl.style.setProperty('--preview-font-family', font);
    }

    /**
     * 순수 하위 서브 함수: 프리뷰의 글꼴 크기를 설정합니다.
     */
    function apply_preview_font_size(previewEl, ptSize) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewEl, 'apply_preview_font_size: previewEl is required!', { previewEl, ptSize });
        }
        if (!previewEl || !ptSize) return;
        previewEl.style.setProperty('--preview-font-size', ptSize);
    }

    /**
     * 순수 하위 서브 함수: 프리뷰 영역의 최대폭 제한(800px)을 토글합니다.
     */
    function apply_preview_max_width_limit(previewViewportEl, isLimited) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(previewViewportEl, 'apply_preview_max_width_limit: previewViewportEl is required!', { previewViewportEl });
        }
        if (!previewViewportEl) return;
        if (isLimited) {
            previewViewportEl.style.maxWidth = '800px';
            previewViewportEl.style.margin = '0 auto';
            previewViewportEl.classList.remove('full-width');
        } else {
            previewViewportEl.style.maxWidth = '100%';
            previewViewportEl.style.margin = '0';
            previewViewportEl.classList.add('full-width');
        }
    }

    /**
     * 순수 하위 서브 함수: 다이어그램(Mermaid) 렌더링 지원 여부를 설정합니다.
     */
    function set_diagram_support(enabled) {
        window._enableDiagramSupport = !!enabled;
    }

    function get_diagram_support() {
        return !!window._enableDiagramSupport;
    }

    /**
     * 순수 하위 서브 함수: 수식(KaTeX) 렌더링 지원 여부를 설정합니다.
     */
    function set_math_support(enabled) {
        window._enableMathSupport = !!enabled;
    }

    function get_math_support() {
        return !!window._enableMathSupport;
    }

    /**
     * 순수 하위 서브 함수: 폰트 비율(% 문자열)을 basePt 기준 pt 단위 변환 문자열로 환산합니다.
     * @param {string} percentStr - 예: "120%"
     * @param {number} [basePt=10] - 디폴트 10pt (100% == 10pt 기준)
     * @returns {string} 예: "12pt"
     */
    function calc_scaled_font_size(percentStr, basePt = 10) {
        if (!percentStr || typeof percentStr !== 'string') return `${basePt}pt`;
        const val = parseFloat(percentStr);
        if (isNaN(val)) return `${basePt}pt`;
        const pt = Math.round((val / 100) * basePt);
        return `${pt}pt`;
    }

    /**
     * 순수 하위 서브 함수: 프리뷰 내 코드블록 스크롤(pre vs pre-wrap) 스타일을 적용합니다.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 요소
     * @param {boolean|string} useScroll - 스크롤 사용 여부
     */
    function update_codeblock_scroll(previewEl, useScroll) {
        const isScrollOn = (useScroll !== false && useScroll !== 'false');
        const wsVal = isScrollOn ? 'pre' : 'pre-wrap';
        const wbVal = isScrollOn ? 'break-word' : 'normal';

        if (previewEl) {
            previewEl.style.setProperty('--preview-code-whitespace', wsVal);
            previewEl.style.setProperty('--preview-code-word-break', wbVal);
        }
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty('--preview-code-whitespace', wsVal);
            document.documentElement.style.setProperty('--preview-code-word-break', wbVal);
        }
    }

    /**
     * 순수 하위 서브 함수: Preview UI 컨트롤 엘리먼트 묶음(uiElements)에 이벤트 리스너를 일괄 바인딩합니다.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 요소
     * @param {Object} uiElements - Preview UI 엘리먼트 통 구조체 ({ fontSelect, fontSizeSelect, btnFontSizeUp, btnFontSizeDown, codeblockScrollCheckbox, togglePreviewMaxWidthCheckbox })
     * @param {Object} [callbacks={}] - 설정 변경 통지 콜백 ({ onSettingChange, onRefreshEditor })
     */
    function bind_preview_ui_listeners(previewEl, uiElements = {}, callbacks = {}) {
        if (!uiElements || typeof uiElements !== 'object') return false;

        const { fontSelect, fontSizeSelect, btnFontSizeUp, btnFontSizeDown, codeblockScrollCheckbox, codeblockScrollWrapper, togglePreviewMaxWidthCheckbox, previewMaxWidthWrapper } = uiElements;

        const notifyChange = () => {
            if (typeof callbacks.onSettingChange === 'function') callbacks.onSettingChange();
        };

        // 1. 폰트 선택 리스너
        if (fontSelect && typeof fontSelect.addEventListener === 'function') {
            fontSelect.addEventListener('change', () => {
                apply_preview_font_family(previewEl, fontSelect.value);
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.style.setProperty('--preview-font-family', fontSelect.value);
                }
                notifyChange();
            });
        }

        // 2. 폰트 크기 선택 리스너
        if (fontSizeSelect && typeof fontSizeSelect.addEventListener === 'function') {
            fontSizeSelect.addEventListener('change', () => {
                const computedPt = calc_scaled_font_size(fontSizeSelect.value, 10);
                apply_preview_font_size(previewEl, computedPt);
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.style.setProperty('--preview-font-size', computedPt);
                    document.documentElement.style.setProperty('--editor-font-size', computedPt);
                }
                if (typeof callbacks.onRefreshEditor === 'function') callbacks.onRefreshEditor();
                notifyChange();
            });
        }

        // 3. 폰트 크기 Up/Down 스핀 버튼
        if (btnFontSizeUp && btnFontSizeDown && fontSizeSelect && typeof btnFontSizeUp.addEventListener === 'function' && typeof btnFontSizeDown.addEventListener === 'function') {
            btnFontSizeUp.addEventListener('click', () => {
                const currentVal = fontSizeSelect.value;
                let currentPercent = parseFloat(currentVal);
                if (isNaN(currentPercent)) currentPercent = 120;

                const newPercent = Math.min(300, Math.round(currentPercent + 10));
                const newPercentStr = `${newPercent}%`;

                let matchedOption = Array.from(fontSizeSelect.options || []).find(opt => opt.value === newPercentStr);
                if (!matchedOption) {
                    const ptVal = calc_scaled_font_size(newPercentStr, 10);
                    matchedOption = new Option(`${newPercentStr} (${ptVal})`, newPercentStr);
                    if (typeof fontSizeSelect.add === 'function') fontSizeSelect.add(matchedOption);
                }
                fontSizeSelect.value = newPercentStr;
                if (typeof fontSizeSelect.dispatchEvent === 'function') {
                    fontSizeSelect.dispatchEvent(new Event('change'));
                }
            });

            btnFontSizeDown.addEventListener('click', () => {
                const currentVal = fontSizeSelect.value;
                let currentPercent = parseFloat(currentVal);
                if (isNaN(currentPercent)) currentPercent = 120;

                const newPercent = Math.max(30, Math.round(currentPercent - 10));
                const newPercentStr = `${newPercent}%`;

                let matchedOption = Array.from(fontSizeSelect.options || []).find(opt => opt.value === newPercentStr);
                if (!matchedOption) {
                    const ptVal = calc_scaled_font_size(newPercentStr, 10);
                    matchedOption = new Option(`${newPercentStr} (${ptVal})`, newPercentStr);
                    if (typeof fontSizeSelect.add === 'function') fontSizeSelect.add(matchedOption);
                }
                fontSizeSelect.value = newPercentStr;
                if (typeof fontSizeSelect.dispatchEvent === 'function') {
                    fontSizeSelect.dispatchEvent(new Event('change'));
                }
            });
        }

        // 4. 코드블록 스크롤 토글
        if (codeblockScrollCheckbox && typeof codeblockScrollCheckbox.addEventListener === 'function') {
            const savedScroll = (typeof localStorage !== 'undefined') ? localStorage.getItem('markvi_codeblock_scroll') : null;
            const isScrollOn = (savedScroll !== 'false');
            codeblockScrollCheckbox.checked = isScrollOn;
            update_codeblock_scroll(previewEl, isScrollOn);

            codeblockScrollCheckbox.addEventListener('change', () => {
                const isChecked = codeblockScrollCheckbox.checked;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('markvi_codeblock_scroll', isChecked ? 'true' : 'false');
                }
                update_codeblock_scroll(previewEl, isChecked);
                notifyChange();
            });

            if (codeblockScrollWrapper && typeof codeblockScrollWrapper.addEventListener === 'function') {
                codeblockScrollWrapper.addEventListener('click', (e) => {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                });
            }
        }

        // 5. 프리뷰 최대 폭 제한 토글
        if (togglePreviewMaxWidthCheckbox && typeof togglePreviewMaxWidthCheckbox.addEventListener === 'function') {
            togglePreviewMaxWidthCheckbox.addEventListener('change', () => {
                apply_preview_max_width_limit(previewEl, togglePreviewMaxWidthCheckbox.checked);
                notifyChange();
            });

            if (previewMaxWidthWrapper && typeof previewMaxWidthWrapper.addEventListener === 'function') {
                previewMaxWidthWrapper.addEventListener('click', (e) => {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                });
            }
        }

        return true;
    }

    /**
     * Preview 전용 UI 컨트롤을 단일 uiElements 통 구조체로 받아 초기화 및 리스너를 일괄 바인딩합니다.
     * @param {Object} uiElements - Preview UI 엘리먼트 단일 구조체
     * @param {Object} [callbacks={}] - 설정 변경 시 호출할 콜백 객체
     * @returns {boolean} 성공 여부
     */
    function init_ui_controls(uiElements = {}, callbacks = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function') {
            window.assert_arg(uiElements && typeof uiElements === 'object', 'init_ui_controls: uiElements must be an object', { uiElements });
        }

        const previewEl = (uiElements && uiElements.preview) || (typeof document !== 'undefined' ? document.getElementById('markdown-body') : null);
        return bind_preview_ui_listeners(previewEl, uiElements, callbacks);
    }

    return {
        injectColorSwatches: inject_color_swatches,
        removeColorSwatches: remove_color_swatches,
        initMarkedParser: init_marked_parser,
        initMath: init_math_support,
        initDiagrams: init_diagram_support,
        renderMarkdown: render_markdown,
        applyPreviewFontFamily: apply_preview_font_family,
        applyPreviewFontSize: apply_preview_font_size,
        applyPreviewMaxWidthLimit: apply_preview_max_width_limit,
        calcScaledFontSize: calc_scaled_font_size,
        updateCodeblockScroll: update_codeblock_scroll,
        initUIControls: init_ui_controls,
        setDiagramSupport: set_diagram_support,
        getDiagramSupport: get_diagram_support,
        setMathSupport: set_math_support,
        getMathSupport: get_math_support,
        renderDiagrams: render_diagrams
    };
})();
