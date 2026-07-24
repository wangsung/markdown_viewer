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
    function apply_heading_styles(targetEl, styles, currentTheme = 'dark') {
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
        if (styles.code) {
            const codeObj = styles.code;
            const targetCodeColor = currentTheme === 'light'
                ? (codeObj.colorLight || codeObj.color || '#0969da')
                : (codeObj.colorDark || codeObj.color || '#38bdf8');
            targetEl.style.setProperty('--code-color', targetCodeColor);
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
            targetEl.style.setProperty('--blockquote-text-color', targetBqColor);
            targetEl.style.setProperty('--blockquote-border-color', targetBqBorder);
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
    }

    return {
        join_paragraphs,
        apply_paragraph_join,
        insert_formatting,
        apply_heading_styles
    };
})();
