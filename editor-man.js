/**
 * editor-man.js
 * CodeMirror 에디터 제어 및 마크다운 텍스트 처리 전용 독립 서브 모듈 (Pure Sub-function Module)
 */
window.EditorManager = (function() {

    /**
     * [Refactoring] Pure Sub-function: 연속해서 들어간 강제 줄바꿈(엔터)들을 분석하여 의미상 한 문단인 경우 결합해 주는 순수 함수.
     * 리팩토링 목적: 외부 전역 변수나 DOM을 전혀 참조하지 않는 100% 인자 기반 순수 텍스트 연산 함수.
     * @param {string} text - 변환 대상 텍스트
     * @returns {string} 결합 완료된 텍스트
     */
    function join_paragraphs(text) {
        if (!text || typeof text !== 'string') return '';

        const lines = text.split(/\r?\n/);
        const result = [];
        let currentParagraph = [];

        // 마크다운 문법 요소(제목, 리스트, 인용, 표 등)로 시작하는지 판단
        const isMarkdownElement = (line) => {
            const trimmed = line.trim();
            return /^([#>\-*+\d\.]|\||`{3,})/.test(trimmed);
        };

        // 영단어가 행 끝에서 하이픈(-)으로 잘렸는지 판단
        const isEnglishHyphenated = (line) => {
            return /[a-zA-Z]-$/.test(line.trim());
        };

        // 앞쪽 라인이 독립된 제목/캡션인지 판단
        const isLineATooShort = (lineA) => {
            const trimmed = lineA.trim();
            const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
            return wordCount <= 3 || trimmed.length < 15;
        };

        const shouldJoinEng = (trimmedA, trimmedB) => {
            const firstCharB = trimmedB.charAt(0);
            const isEnglishB = /[a-zA-Z]/.test(firstCharB);
            if (isEnglishB) {
                const isLowerB = firstCharB === firstCharB.toLowerCase() && firstCharB !== firstCharB.toUpperCase();
                if (isLowerB) return true;
                const endsWithSentenceEnd = /[\.\?\!]["']?$/.test(trimmedA);
                if (!endsWithSentenceEnd) return true;
            }
            return null;
        };

        const shouldJoinKor = (trimmedA, trimmedB) => {
            const lastCharA = trimmedA.slice(-1);
            const isKoreanA = /[가-힣]/.test(lastCharA);
            if (isKoreanA) {
                const endsWithSentenceEnd = /[\.\?\!]["']?$/.test(trimmedA);
                if (!endsWithSentenceEnd) return true;
                const endsWithParticles = /[은는이가을를고며와과의에로]$/.test(trimmedA);
                if (endsWithParticles) return true;
            }
            return null;
        };

        const shouldJoin = (lineA, lineB) => {
            const trimmedA = lineA.trim();
            const trimmedB = lineB.trim();

            if (!trimmedA || !trimmedB) return false;
            if (isMarkdownElement(trimmedB)) return false;
            if (/^\s{2,}/.test(lineB) || /^\t/.test(lineB)) return false;
            if (isMarkdownElement(trimmedA)) return false;
            if (/<br\s*\/?>$/i.test(trimmedA)) return false;
            if (isLineATooShort(lineA)) return false;

            const engResult = shouldJoinEng(trimmedA, trimmedB);
            if (engResult !== null) return engResult;

            const korResult = shouldJoinKor(trimmedA, trimmedB);
            if (korResult !== null) return korResult;

            return true;
        };

        function flushParagraph(paraLines) {
            if (paraLines.length === 0) return '';
            let merged = paraLines[0];
            for (let i = 1; i < paraLines.length; i++) {
                const current = paraLines[i];
                const prev = paraLines[i - 1];
                if (isEnglishHyphenated(prev)) {
                    merged = merged.slice(0, -1) + current.trim();
                } else {
                    merged += ' ' + current.trim();
                }
            }
            return merged;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
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
                    result.push(flushParagraph(currentParagraph));
                    currentParagraph = [line];
                }
            }
        }

        if (currentParagraph.length > 0) {
            result.push(flushParagraph(currentParagraph));
        }

        return result.join('\n');
    }

    /**
     * [Refactoring] Pure Sub-function: 에디터의 상황(선택 영역 유무)에 따라 문단 모으기를 수행하는 서브 함수.
     * 리팩토링 목적: 전역 변수(cm) 의존성을 배제하고 매개변수로 cmInstance 및 완료 콜백(onComplete)을 수신함.
     * @param {Object} cmInstance - CodeMirror 에디터 인스턴스
     * @param {Function} [onComplete] - 완료 후 렌더링 및 UI 상태 갱신을 위한 콜백 함수
     */
    function apply_paragraph_join(cmInstance, onComplete) {
        if (!cmInstance) return;
        const selection = cmInstance.getSelection();
        if (selection) {
            const joinedText = join_paragraphs(selection);
            cmInstance.replaceSelection(joinedText);
        } else {
            const fullText = cmInstance.getValue();
            const joinedText = join_paragraphs(fullText);
            cmInstance.setValue(joinedText);
        }
        
        cmInstance.focus();

        if (typeof onComplete === 'function') {
            onComplete();
        }
    }

    /**
     * [Refactoring] Pure Sub-function: 마크다운 서식 기호를 에디터의 선택 영역에 주입하는 서브 함수.
     * 리팩토링 목적: 전역 변수(cm) 의존성을 배제하고 매개변수로 cmInstance, 서식타입(type) 및 완료 콜백(onComplete)을 수신함.
     * @param {Object} cmInstance - CodeMirror 에디터 인스턴스
     * @param {string} type - 마크다운 서식 종류 ('bold', 'italic', 'h1'~'h3', 'link', 'image', 'code', 'codeblock', 'quote', 'ul', 'ol', 'hr', 'table')
     * @param {Function} [onComplete] - 완료 후 파일명 뱃지 갱신 및 렌더링을 위한 콜백 함수
     */
    function insert_formatting(cmInstance, type, onComplete) {
        if (!cmInstance) return;
        const selectedText = cmInstance.getSelection();
        
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
        
        cmInstance.replaceSelection(replacement, 'around');
        cmInstance.focus();

        if (typeof onComplete === 'function') {
            onComplete();
        }
    }

    /**
     * [Refactoring] Pure Sub-function: 확정된 Heading styles 객체를 전달받아 대상 DOM 요소의 CSS 커스텀 변수를 순수 바인딩하는 서브 함수.
     * 리팩토링 목적: 프리셋 조회의 비즈니스 로직과 스타일 렌더링을 격리하고, 매개변수로 targetEl, styles, currentTheme만을 수신함.
     * @param {HTMLElement} targetEl - CSS 변수를 적용할 대상 엘리먼트 (예: document.documentElement)
     * @param {Object} styles - 프리셋에 정의된 스타일 데이터 객체
     * @param {string} [currentTheme='dark'] - 현재 테마 ('dark' | 'light')
     */
    function apply_heading_preset(targetEl, styles, currentTheme = 'dark') {
        if (!targetEl || !styles || typeof styles !== 'object') return;

        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
            if (styles[tag]) {
                const styleObj = styles[tag];
                const targetColor = currentTheme === 'light'
                    ? (styleObj.colorLight || styleObj.color || '#1d4ed8')
                    : (styleObj.colorDark || styleObj.color || '#3b82f6');

                targetEl.style.setProperty(`--${tag}-color`, targetColor);
                if (styleObj.size) targetEl.style.setProperty(`--${tag}-size`, styleObj.size);
                if (styleObj.border) targetEl.style.setProperty(`--${tag}-border`, styleObj.border);
            }
        });

        // 🔗 HyperLink / 대괄호 적용
        if (styles.link) {
            const linkObj = styles.link;
            const targetLinkColor = currentTheme === 'light'
                ? (linkObj.colorLight || linkObj.color || '#0969da')
                : (linkObj.colorDark || linkObj.color || '#38bdf8');
            targetEl.style.setProperty('--link-color', targetLinkColor);
            targetEl.style.setProperty('--link-decoration', linkObj.decoration || 'underline');
        }

        // 💪 굵게 (Strong / Bold)
        if (styles.strong) {
            const boldObj = styles.strong;
            const targetBoldColor = currentTheme === 'light'
                ? (boldObj.colorLight || boldObj.color || '#0f172a')
                : (boldObj.colorDark || boldObj.color || '#f8fafc');
            targetEl.style.setProperty('--bold-color', targetBoldColor);
        }

        // ✨ 기울임 (Em / Italic)
        if (styles.em) {
            const emObj = styles.em;
            const targetItalicColor = currentTheme === 'light'
                ? (emObj.colorLight || emObj.color || '#0f172a')
                : (emObj.colorDark || emObj.color || '#f8fafc');
            targetEl.style.setProperty('--italic-color', targetItalicColor);
        }

        // 💻 ` ` Inline code
        // 📦 ``` Code block & 💻 ` ` Inline code 스타일 통합 바인딩
        if (styles.codeblock) {
            const cbObj = styles.codeblock;
            const targetCbText = currentTheme === 'light'
                ? (cbObj.colorLight || '#24292e')
                : (cbObj.colorDark || '#f8fafc');
            const targetCbBg = currentTheme === 'light'
                ? (cbObj.bgLight || '#f6f8fa')
                : (cbObj.bgDark || '#0f172a');
            targetEl.style.setProperty('--preview-code-text', targetCbText);
            targetEl.style.setProperty('--custom-code-block-fg', targetCbText);
            targetEl.style.setProperty('--preview-code-bg', targetCbBg);
            targetEl.style.setProperty('--custom-code-block-bg', targetCbBg);

            // Inline Code의 글자색과 배경색을 Code block 스타일과 100% 동일하게 자동 동기화 바인딩
            targetEl.style.setProperty('--inline-code-fg', targetCbText);
            targetEl.style.setProperty('--custom-inline-code-bg', targetCbBg);
        }

        // 📦 ``` ``` Codeblock
        if (styles.codeblock) {
            const cbObj = styles.codeblock;
            const targetCbColor = currentTheme === 'light'
                ? (cbObj.colorLight || cbObj.color || '#24292e')
                : (cbObj.colorDark || cbObj.color || '#f8fafc');
            const targetCbBg = currentTheme === 'light'
                ? (cbObj.bgLight || '#f6f8fa')
                : (cbObj.bgDark || '#0f172a');
            targetEl.style.setProperty('--preview-code-text', targetCbColor);
            targetEl.style.setProperty('--preview-code-bg', targetCbBg);
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
            const targetBqBg = currentTheme === 'light'
                ? (bqObj.bgLight || '#f9fafb')
                : (bqObj.bgDark || '#0f172a');
            targetEl.style.setProperty('--blockquote-text-color', targetBqColor);
            targetEl.style.setProperty('--blockquote-border-color', targetBqBorder);
            targetEl.style.setProperty('--preview-blockquote-bg', targetBqBg);
            targetEl.style.setProperty('--preview-blockquote-text', targetBqColor);
        }

        // 📋 리스트 (List / Bullet & Numbering)
        if (styles.list) {
            const listObj = styles.list;
            const targetListColor = currentTheme === 'light'
                ? (listObj.colorLight || listObj.color || '#0284c7')
                : (listObj.colorDark || listObj.color || '#38bdf8');
            targetEl.style.setProperty('--list-marker-color', targetListColor);
            if (listObj.gap) targetEl.style.setProperty('--list-item-gap', listObj.gap);
        } else {
            // 기본 리스트 기호 색상은 theme-color 또는 link-color 활용
            const defaultListColor = currentTheme === 'light'
                ? (styles.link?.colorLight || '#0969da')
                : (styles.link?.colorDark || '#38bdf8');
            targetEl.style.setProperty('--list-marker-color', defaultListColor);
        }

        // ➖ Line (선 색상/구분선) 적용
        if (styles.line) {
            const lineObj = styles.line;
            const targetLineColor = currentTheme === 'light'
                ? (lineObj.colorLight || lineObj.color || '#cbd5e1')
                : (lineObj.colorDark || lineObj.color || '#334155');
            targetEl.style.setProperty('--line-color', targetLineColor);
            targetEl.style.setProperty('--line-border', lineObj.border || '1px solid #334155');
            targetEl.style.setProperty('--theme-color', targetLineColor);
        }

        // 📊 Table (표) 스타일 적용
        const tableObj = styles.table || {
            headerColorLight: '#0f172a',
            headerColorDark: '#f8fafc',
            headerBgLight: '#f1f5f9',
            headerBgDark: '#1e293b',
            rowBgTransparent: true,
            rowBgLight: '#ffffff',
            rowBgDark: '#0f172a',
            stripeEnabled: true,
            stripeBgLight: '#f8fafc',
            stripeBgDark: '#1e293b',
            hoverEnabled: true,
            hoverBgLight: '#e2e8f0',
            hoverBgDark: '#334155',
            borderColorLight: '#cbd5e1',
            borderColorDark: '#334155',
            borderStyle: '1px solid',
            padding: 'normal',
            verticalAlign: 'middle'
        };

        const targetThColor = currentTheme === 'light'
            ? (tableObj.headerColorLight || '#0f172a')
            : (tableObj.headerColorDark || '#f8fafc');
        const targetThBg = currentTheme === 'light'
            ? (tableObj.headerBgLight || '#f1f5f9')
            : (tableObj.headerBgDark || '#1e293b');

        targetEl.style.setProperty('--table-header-color', targetThColor);
        targetEl.style.setProperty('--table-header-bg', targetThBg);

        // 표 머리 구분선 (TH border-bottom)
        if (tableObj.headerBorderEnabled !== false) {
            const targetHeaderBorderColor = currentTheme === 'light'
                ? (tableObj.headerBorderColorLight || 'var(--theme-color)')
                : (tableObj.headerBorderColorDark || 'var(--theme-color)');
            const headerBorderStyle = tableObj.headerBorderStyle || '2px solid';
            targetEl.style.setProperty('--table-header-border-bottom', `${headerBorderStyle} ${targetHeaderBorderColor}`);
        } else {
            targetEl.style.setProperty('--table-header-border-bottom', 'none');
        }

        // 행 배경
        if (tableObj.rowBgTransparent) {
            targetEl.style.setProperty('--table-row-bg', 'transparent');
        } else {
            const targetRowBg = currentTheme === 'light'
                ? (tableObj.rowBgLight || '#ffffff')
                : (tableObj.rowBgDark || '#0f172a');
            targetEl.style.setProperty('--table-row-bg', targetRowBg);
        }

        // 짝수 행 설정
        if (tableObj.stripeEnabled) {
            const targetStripeBg = currentTheme === 'light'
                ? (tableObj.stripeBgLight || '#f8fafc')
                : (tableObj.stripeBgDark || '#1e293b');
            targetEl.style.setProperty('--table-stripe-bg', targetStripeBg);
        } else {
            targetEl.style.setProperty('--table-stripe-bg', 'var(--preview-table-tr-even-bg)');
        }

        // 행 구분선 (TR border-bottom)
        if (tableObj.rowBorderEnabled !== false) {
            const targetRowBorderColor = currentTheme === 'light'
                ? (tableObj.rowBorderColorLight || tableObj.borderColorLight || '#cbd5e1')
                : (tableObj.rowBorderColorDark || tableObj.borderColorDark || '#334155');
            const rowStyle = tableObj.rowBorderStyle || tableObj.borderStyle || '1px solid';
            if (rowStyle === 'none') {
                targetEl.style.setProperty('--table-row-border-bottom', 'none');
            } else {
                targetEl.style.setProperty('--table-row-border-bottom', `${rowStyle} ${targetRowBorderColor}`);
            }
        } else {
            targetEl.style.setProperty('--table-row-border-bottom', 'none');
        }

        // 마우스 호버 강조
        if (tableObj.hoverEnabled) {
            const targetHoverBg = currentTheme === 'light'
                ? (tableObj.hoverBgLight || '#e2e8f0')
                : (tableObj.hoverBgDark || '#334155');
            targetEl.style.setProperty('--table-hover-bg', targetHoverBg);
        } else {
            targetEl.style.setProperty('--table-hover-bg', 'inherit');
        }

        // 테두리
        if (tableObj.borderEnabled !== false) {
            const targetBorderColor = currentTheme === 'light'
                ? (tableObj.borderColorLight || '#cbd5e1')
                : (tableObj.borderColorDark || '#334155');
            targetEl.style.setProperty('--table-border-color', targetBorderColor);
            targetEl.style.setProperty('--table-border-style', tableObj.borderStyle || '1px solid');
        } else {
            targetEl.style.setProperty('--table-border-color', 'transparent');
            targetEl.style.setProperty('--table-border-style', 'none');
        }

        // 셀 여백 (패딩)
        let padVal = '8px 12px';
        if (tableObj.padding === 'none') padVal = '0px';
        else if (tableObj.padding === 'micro') padVal = '2px 4px';
        else if (tableObj.padding === 'compact') padVal = '4px 8px';
        else if (tableObj.padding === 'spacious') padVal = '12px 16px';
        targetEl.style.setProperty('--table-cell-padding', padVal);

        // 세로 정렬
        targetEl.style.setProperty('--table-vertical-align', tableObj.verticalAlign || 'middle');
    }

    /**
     * [Refactoring] Pure Sub-function: 마크다운 원문 텍스트에서 헤더(#) 항목들을 파싱하여 목차(TOC) 객체 배열을 생성하는 순수 서브 함수.
     * 리팩토링 목적: DOM 조작 및 에디터 인스턴스 의존성을 배제하고, 마크다운 원문 텍스트만 수신하여 TOC 구조 데이터만 생성함.
     * @param {string} text - 마크다운 원문 텍스트
     * @returns {Array<{line: number, level: number, text: string}>} 헤더 정보 객체 배열
     */
    function build_toc(text) {
        if (!text || typeof text !== 'string') return [];

        const normalized = text.replace(/\r\n/g, '\n');
        const lines = normalized.split('\n');
        const headings = [];
        let inCodeBlock = false;

        lines.forEach((lineText, idx) => {
            const trimmed = lineText.trim();
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                inCodeBlock = !inCodeBlock;
                return;
            }
            if (inCodeBlock) return;

            const match = trimmed.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
            if (match) {
                const level = match[1].length;
                const textVal = match[2].trim();
                headings.push({
                    line: idx,
                    level: level,
                    text: textVal
                });
            }
        });

        return headings;
    }

    /**
     * 매개변수(Argument) 및 상태 검증 전용 단증 서브 함수 (assert_arg)
     */
    function assert_arg(condition, message, context = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function' && window.assert_arg !== assert_arg) {
            return window.assert_arg(condition, message, context);
        }
        if (!condition) {
            console.error(`[System Warning] ${message}`, context);
        }
        return condition;
    }

    /**
     * [Refactoring] Pure Sub-function: CodeMirror extraKeys 단축키 바인딩 매핑 객체를 생성하는 순수 서브 함수.
     * @param {Object} [callbacks={}] - 단축키 동작 완료 후 호출될 이벤트 콜백 객체 ({ onFormatChange, onParagraphJoin })
     * @returns {Object} CodeMirror extraKeys 단축키 매핑 객체
     */
    function build_extra_keys_map(callbacks = {}) {
        const isValidCallbacks = assert_arg(
            callbacks !== null && typeof callbacks === 'object' && !Array.isArray(callbacks),
            'build_extra_keys_map: callbacks parameter must be a valid object',
            { callbacks }
        );
        const cb = isValidCallbacks ? callbacks : {};

        return {
            "Tab": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance.replaceSelection === 'function', 'extraKeys Tab: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                cmInstance.replaceSelection("    ");
            },
            "Cmd-B": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance === 'object', 'extraKeys Cmd-B: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                insert_formatting(cmInstance, 'bold', () => {
                    if (typeof cb.onFormatChange === 'function') {
                        cb.onFormatChange('bold', cmInstance);
                    }
                });
            },
            "Ctrl-B": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance === 'object', 'extraKeys Ctrl-B: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                insert_formatting(cmInstance, 'bold', () => {
                    if (typeof cb.onFormatChange === 'function') {
                        cb.onFormatChange('bold', cmInstance);
                    }
                });
            },
            "Cmd-I": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance === 'object', 'extraKeys Cmd-I: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                insert_formatting(cmInstance, 'italic', () => {
                    if (typeof cb.onFormatChange === 'function') {
                        cb.onFormatChange('italic', cmInstance);
                    }
                });
            },
            "Ctrl-I": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance === 'object', 'extraKeys Ctrl-I: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                insert_formatting(cmInstance, 'italic', () => {
                    if (typeof cb.onFormatChange === 'function') {
                        cb.onFormatChange('italic', cmInstance);
                    }
                });
            },
            "Alt-Q": function(cmInstance) {
                if (!assert_arg(cmInstance && typeof cmInstance === 'object', 'extraKeys Alt-Q: cmInstance must be a valid CodeMirror instance', { cmInstance })) return;
                apply_paragraph_join(cmInstance, () => {
                    if (typeof cb.onParagraphJoin === 'function') {
                        cb.onParagraphJoin(cmInstance);
                    }
                });
            }
        };
    }

    /**
     * pure sub-function: CodeMirror 인스턴스에 extraKeys 단축키 맵을 바인딩하여 적용합니다.
     */
    function attach_extra_keys(cmInstance, callbacks = {}) {
        if (!assert_arg(cmInstance && typeof cmInstance.setOption === 'function', 'attach_extra_keys: cmInstance must be a valid CodeMirror instance', { cmInstance })) {
            return false;
        }
        const extraKeysMap = build_extra_keys_map(callbacks);
        cmInstance.setOption('extraKeys', extraKeysMap);
        return true;
    }

    return {
        join_paragraphs,
        apply_paragraph_join,
        insert_formatting,
        apply_heading_preset,
        build_toc,
        build_extra_keys_map,
        attach_extra_keys,
        getExtraKeys: build_extra_keys_map,
        buildExtraKeysMap: build_extra_keys_map,
        initShortcuts: attach_extra_keys,
        attachShortcuts: attach_extra_keys
    };
})();
