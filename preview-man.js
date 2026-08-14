window.PreviewManager = (function() {
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
        
        const isKatexAvailable = typeof katex !== 'undefined';
        const isMermaidAvailable = typeof mermaid !== 'undefined';
        
        // window 영역에 플래그 노출하여 렌더링 시 접근 가능토록 함 (선택적)
        window._enableMathSupport = isKatexAvailable;
        window._enableDiagramSupport = isMermaidAvailable;

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
                    return `<div class="katex-error">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
                }
            }

            if (lang === 'mermaid' && window._enableDiagramSupport && typeof mermaid !== 'undefined') {
                return `<div class="mermaid">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            }
            
            const validLang = !!(lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang));
            let highlighted = '';
            try {
                if (validLang) {
                    highlighted = hljs.highlight(text, { language: lang }).value;
                } else {
                    highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
            } catch (e) {
                console.error("Syntax highlighting error:", e);
                highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
                        return `<span class="katex-error">${token.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
                    }
                }
                return token.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
                        return `<div class="katex-error">${token.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
                    }
                }
                return `<div class="katex-fallback">${token.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
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
            
            if (scrollSync && typeof scrollSync.rebuildKeyframes === 'function') {
                scrollSync.rebuildKeyframes('Stage 1: renderMarkdown');
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

    return {
        injectColorSwatches: inject_color_swatches,
        removeColorSwatches: remove_color_swatches,
        initMarkedParser: init_marked_parser,
        renderMarkdown: render_markdown,
        applyPreviewFontFamily: apply_preview_font_family,
        applyPreviewFontSize: apply_preview_font_size,
        applyPreviewMaxWidthLimit: apply_preview_max_width_limit,
        setDiagramSupport: set_diagram_support,
        getDiagramSupport: get_diagram_support,
        setMathSupport: set_math_support,
        getMathSupport: get_math_support
    };
})();
