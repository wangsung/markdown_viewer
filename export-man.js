/**
 * ==========================================================================
 * export-man.js - 복사, 저장 및 내보내기 관리 전용 독립 서브 모듈
 * ==========================================================================
 * [모듈 목적]: app.js에서 전역 변수에 의존하던 복사(Copy), 파일 저장(Save), 
 * HTML 내보내기(Export) 기능을 순수 서브 함수(Pure Sub-functions)로 캡슐화하여 제공함.
 */

/**
 * 내보내기 및 스타일 커스텀 프로퍼티 수집 전용 StyleSet 상수 객체 (ExportStyleSet)
 */
const ExportStyleSet = {
    PRESET_VARS: [
        '--h1-color', '--h1-size', '--h1-border',
        '--h2-color', '--h2-size', '--h2-border',
        '--h3-color', '--h3-size', '--h3-border',
        '--h4-color', '--h4-size', '--h4-border',
        '--h5-color', '--h5-size', '--h5-border',
        '--h6-color', '--h6-size', '--h6-border',
        '--link-color', '--link-decoration',
        '--bold-color', '--italic-color',
        '--inline-code-fg', '--custom-inline-code-bg',
        '--custom-code-block-bg', '--custom-code-block-fg',
        '--blockquote-text-color', '--blockquote-border-color',
        '--list-marker-color', '--list-item-gap',
        '--line-color', '--line-border',
        '--table-header-color', '--table-header-bg', '--table-header-border-bottom',
        '--table-row-bg', '--table-stripe-bg', '--table-hover-bg',
        '--table-border-color', '--table-border-style', '--table-cell-padding',
        '--table-vertical-align', '--table-row-border-bottom'
    ],
    CONTAINER_VARS: [
        '--preview-bg', '--preview-text', '--preview-heading', '--preview-border',
        '--preview-code-bg', '--preview-code-text', '--preview-blockquote-bg', '--preview-blockquote-text'
    ],
    LAYOUT_VARS: [
        '--preview-font-family', '--preview-font-size',
        '--preview-code-whitespace', '--preview-code-word-break'
    ],
    getAll: function() {
        return [...this.PRESET_VARS, ...this.CONTAINER_VARS, ...this.LAYOUT_VARS];
    }
};

const ExportManager = (function() {
    function assert_arg(condition, message, context = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function' && window.assert_arg !== assert_arg) {
            return window.assert_arg(condition, message, context);
        }
        if (!condition) console.error(`[System Warning] ${message}`, context);
        return !!condition;
    }

    /**
     * Blob/URL 기반 파일 다운로드를 브라우저 및 앵커 태그 fallback 환경에 맞춰 처리하는 공통 저장 유틸리티 서브 함수.
     * @param {Blob|string} blobOrUrl - 다운로드할 데이터 Blob 또는 객체 URL
     * @param {string} filename - 저장할 대상 파일명
     * @param {Function} [onSuccess] - 저장 성공 시 실행할 콜백 함수
     */
    function triggerFileDownload(blobOrUrl, filename, onSuccess) {
        const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);

        function fallbackTrigger() {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (typeof blobOrUrl !== 'string') {
                URL.revokeObjectURL(url);
            }
            if (typeof onSuccess === 'function') {
                onSuccess(filename);
            }
        }

        if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.warn('chrome.downloads 실패, fallback 다운로드 시도:', chrome.runtime.lastError.message);
                    fallbackTrigger();
                } else if (typeof onSuccess === 'function') {
                    onSuccess(filename);
                }
            });
        } else {
            fallbackTrigger();
        }
    }

    /**
     * 매개변수(Argument) 및 상태 검증 전용 단증 서브 함수 (assert_arg)
     */
    function assert_arg(condition, message, context = {}) {
        if (typeof window !== 'undefined' && typeof window.assert_arg === 'function' && window.assert_arg !== assert_arg) {
            return window.assert_arg(condition, message, context);
        }
        if (typeof global !== 'undefined' && typeof global.window !== 'undefined' && typeof global.window.assert_arg === 'function' && global.window.assert_arg !== assert_arg) {
            return global.window.assert_arg(condition, message, context);
        }
        if (!condition) {
            const fullMessage = `[System Assertion Failed] ${message}`;
            console.error(fullMessage, context);
            if (typeof window !== 'undefined' && typeof window.report_system_theme_error === 'function') {
                window.report_system_theme_error(fullMessage);
            }
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
            if (typeof window !== 'undefined' && window.ENABLE_DEBUG_HANDLER !== false) {
                throw new Error(fullMessage);
            }
            return false;
        }
        return true;
    }

    /**
     * 글로벌 변수 의존성을 제거하고, 프리뷰 DOM 선택/복사 및 성공 피드백 UI 처리를 수행하는 순수 서브 함수.
     * @param {HTMLElement} previewEl - 복사 대상 프리뷰 엘리먼트
     * @param {HTMLElement|null} exportMenuEl - 닫을 내보내기 메뉴 엘리먼트
     * @param {HTMLElement|null} feedbackBtnEl - 복사 완료 성공 표시를 해줄 버튼 엘리먼트
     * @returns {boolean} 복사 성공 여부
     */
    function copy_preview_to_clipboard_ui(previewEl, exportMenuEl, feedbackBtnEl) {
        if (!assert_arg(previewEl, 'copy_preview_to_clipboard_ui: previewEl is required!', { previewEl })) {
            return false;
        }

        if (!assert_arg(previewEl && previewEl.children, 'copy_preview_to_clipboard_ui: previewEl.children is required!', { previewEl })) {
            return false;
        }

        if (previewEl.children.length === 0) {
            if (typeof alert === 'function') alert('복사할 프리뷰 내용이 없습니다.');
            return false;
        }

        if (exportMenuEl) {
            if (exportMenuEl.classList && typeof exportMenuEl.classList.remove === 'function') {
                exportMenuEl.classList.remove('show');
            }
        }

        let selection = null;
        if (typeof window !== 'undefined' && typeof window.getSelection === 'function' && typeof document !== 'undefined' && typeof document.createRange === 'function') {
            const range = document.createRange();
            range.selectNodeContents(previewEl);

            selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } else if (typeof document !== 'undefined' && typeof document.createRange === 'function') {
            const range = document.createRange();
            range.selectNodeContents(previewEl);
            if (typeof global !== 'undefined' && global.getSelection) {
                selection = global.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }

        try {
            let successful = false;
            if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
                successful = document.execCommand('copy');
            } else {
                successful = true;
            }

            if (successful) {
                // 1. "내보내기" 버튼 딤(Dimming) 및 재클릭 차단 (텍스트/innerHTML 변경 없이 Dimming만 적용 후 원복)
                if (feedbackBtnEl && feedbackBtnEl.style) {
                    feedbackBtnEl.style.opacity = '0.5';
                    feedbackBtnEl.style.pointerEvents = 'none';
                    if ('disabled' in feedbackBtnEl) feedbackBtnEl.disabled = true;

                    if (feedbackBtnEl._dimTimer) clearTimeout(feedbackBtnEl._dimTimer);
                    feedbackBtnEl._dimTimer = setTimeout(() => {
                        feedbackBtnEl.style.opacity = '';
                        feedbackBtnEl.style.pointerEvents = '';
                        if ('disabled' in feedbackBtnEl) feedbackBtnEl.disabled = false;
                        delete feedbackBtnEl._dimTimer;
                    }, 1500);
                }

                // 2. 하단 토스트(Toast) 메시지로 복사 완료 안내 노출 (1.5초)
                if (typeof FrameManager !== 'undefined' && typeof FrameManager.showToast === 'function') {
                    FrameManager.showToast('📋 프리뷰 내용이 클립보드에 복사되었습니다.', 1500);
                } else if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
                    window.showToast('📋 프리뷰 내용이 클립보드에 복사되었습니다.', 1500);
                }
            } else {
                if (typeof alert === 'function') alert('클립보드 복사 명령을 실행할 수 없습니다.');
            }
            return successful;
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            if (typeof alert === 'function') alert('클립보드 복사에 실패했습니다.');
            return false;
        } finally {
            if (selection && typeof selection.removeAllRanges === 'function') {
                selection.removeAllRanges();
            }
        }
    }

    /**
     * ClipboardManager - 클립보드 복사 전용 서브 객체
     */
    const ClipboardManager = {
        copyPreview: function(previewEl, exportMenuEl, feedbackBtnEl) {
            return copy_preview_to_clipboard_ui(previewEl, exportMenuEl, feedbackBtnEl);
        }
    };

    /**
     * 순수 서브 함수: 글로벌 Scope/DOM 변수 접근 없이 매개변수로 필요한 프리뷰 DOM, 파일명 및 config options 객체를 주입받아 독립 HTML 문자열을 생성하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 파일명
     * @param {Object} [options={}] - 내보내기 설정 객체 ({ theme, lineColor, styleVars })
     * @returns {Promise<string|null>} 생성된 HTML 문자열 또는 null
     */
    async function generatePreviewHtmlContent(previewEl, filename, options = {}) {
        if (!previewEl || previewEl.children.length === 0) {
            return null;
        }

        // 1. 프리뷰 DOM을 복제하여 인라인 스타일 변환 작업 진행
        const clonedPreview = previewEl.cloneNode(true);
        const sourceSpans = previewEl.querySelectorAll('code.hljs span');
        const targetSpans = clonedPreview.querySelectorAll('code.hljs span');

        const {
            theme = 'dark',
            lineColor = '#3b82f6',
            styleVars = {}
        } = options;

        const currentTheme = theme || 'dark';

        // 프리뷰 화면에서 실제 렌더링된 구문 강조 span의 computed color를 inline style로 영구 고착화
        // 단, options.theme === 'light'인 경우 흰색/밝은 텍스트가 흰 배경에 가려지지 않도록 보정
        if (sourceSpans.length === targetSpans.length && sourceSpans.length > 0) {
            for (let i = 0; i < sourceSpans.length; i++) {
                const computedColor = window.getComputedStyle(sourceSpans[i]).color;
                if (computedColor) {
                    if (currentTheme === 'light') {
                        const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                        if (rgbMatch) {
                            const r = parseInt(rgbMatch[1], 10);
                            const g = parseInt(rgbMatch[2], 10);
                            const b = parseInt(rgbMatch[3], 10);
                            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                            if (brightness > 200) {
                                targetSpans[i].style.color = '#1e293b';
                            } else {
                                targetSpans[i].style.color = computedColor;
                            }
                        } else {
                            targetSpans[i].style.color = computedColor;
                        }
                    } else {
                        targetSpans[i].style.color = computedColor;
                    }
                }
            }
        }

        let githubCss = '';
        let katexCss = '';

        // DOM 수집 또는 로컬 Chrome extension fetch
        if (typeof document !== 'undefined' && document.styleSheets) {
            try {
                const sheets = Array.from(document.styleSheets);
                sheets.forEach(sheet => {
                    try {
                        const rules = Array.from(sheet.cssRules || sheet.rules || []);
                        const cssText = rules.map(r => r.cssText).join('\n');
                        if (sheet.href && (sheet.href.includes('github.min.css') || sheet.href.includes('github-dark.min.css'))) {
                            githubCss += cssText + '\n';
                        } else if (sheet.href && sheet.href.includes('katex.min.css')) {
                            katexCss += cssText + '\n';
                        }
                    } catch (e) {}
                });
            } catch (err) {}
        }

        if (!githubCss) {
            try {
                const targetGithubCssFile = currentTheme === 'dark' ? 'libs/github-dark.min.css' : 'libs/github.min.css';
                const res = await fetch(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(targetGithubCssFile) : targetGithubCssFile);
                githubCss = await res.text();
            } catch (e) {}
        }

        if (!katexCss) {
            try {
                const res = await fetch(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('libs/katex/katex.min.css') : 'libs/katex/katex.min.css');
                let rawKatex = await res.text();
                katexCss = rawKatex.replace(/url\(fonts\//g, 'url(https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/');
            } catch (e) {}
        }

        githubCss = githubCss.replace(/@import\s+url\([^)]+\);?/g, '');
        katexCss = katexCss.replace(/@import\s+url\([^)]+\);?/g, '');

        // 경량화된 마크다운 본문 및 H1~H6 타이포그래피 핵심 전용 CSS 템플릿
        const coreMarkdownCss = `
        .markdown-body *, .markdown-body *::before, .markdown-body *::after {
            box-sizing: border-box;
        }

        .markdown-body {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 48px;
            box-sizing: border-box;
            color: var(--preview-text, #1f2937);
            font-family: var(--preview-font-family, system-ui, sans-serif);
            font-size: var(--preview-font-size, 16px);
            line-height: 1.7;
            word-wrap: break-word;
        }

        /* 최대폭 제한 해제 시 (Window 크기에 맞춰 내보내기/새창 가로폭 확장, 최소 여백 보존) */
        .markdown-body.full-width,
        body.full-width .markdown-body,
        .export-container.full-width,
        .preview-viewport.full-width .export-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 40px 48px !important;
        }

        .markdown-body img, .markdown-body svg, .markdown-body canvas {
            max-width: 100%;
            height: auto;
        }

        .markdown-body ul, .markdown-body ol {
            padding-left: 1.8em;
        }

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 700;
            line-height: 1.25;
            color: var(--preview-heading, inherit);
        }

        .markdown-body h1 {
            font-size: var(--h1-size, 2em);
            color: var(--h1-color, var(--preview-heading, inherit)) !important;
            padding-bottom: 0.3em;
            border-bottom: var(--h1-border, 1px solid var(--preview-border, #e5e7eb)) !important;
        }

        .markdown-body h2 {
            font-size: var(--h2-size, 1.5em);
            color: var(--h2-color, var(--preview-heading, inherit)) !important;
            padding-bottom: 0.3em;
            border-bottom: var(--h2-border, 1px solid var(--preview-border, #e5e7eb)) !important;
        }

        .markdown-body h3 { font-size: var(--h3-size, 1.25em); color: var(--h3-color, var(--preview-heading, inherit)) !important; border-bottom: var(--h3-border, none) !important; }
        .markdown-body h4 { font-size: var(--h4-size, 1em); color: var(--h4-color, var(--preview-heading, inherit)) !important; border-bottom: var(--h4-border, none) !important; }
        .markdown-body h5 { font-size: var(--h5-size, 0.875em); color: var(--h5-color, var(--preview-heading, inherit)) !important; border-bottom: var(--h5-border, none) !important; }
        .markdown-body h6 { font-size: var(--h6-size, 0.85em); color: var(--h6-color, var(--preview-heading, inherit)) !important; border-bottom: var(--h6-border, none) !important; }

        .markdown-body strong { font-weight: 600; color: var(--bold-color, inherit) !important; }
        .markdown-body em { font-style: italic; color: var(--italic-color, inherit) !important; }
        .markdown-body code:not(pre code) {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: inherit;
            color: var(--inline-code-fg, var(--custom-code-block-fg, inherit)) !important;
            background-color: var(--custom-inline-code-bg, var(--custom-code-block-bg, var(--preview-code-bg, rgba(0, 0, 0, 0.06)))) !important;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
        }

        .markdown-body a,
        .markdown-body .md-bracket-link {
            color: var(--link-color, var(--theme-color, #3b82f6)) !important;
            text-decoration: var(--link-decoration, underline) !important;
        }

        .markdown-body blockquote {
            padding: 10px 20px;
            margin: 0 0 16px 0;
            color: var(--blockquote-text-color, var(--preview-text, inherit)) !important;
            border-left: 4px solid var(--blockquote-border-color, var(--theme-color, #3b82f6)) !important;
            background-color: var(--preview-blockquote-bg, rgba(0,0,0,0.03)) !important;
            border-radius: 0 6px 6px 0;
        }

        .markdown-body blockquote p:first-child {
            margin-top: 0 !important;
        }

        .markdown-body blockquote p:last-child {
            margin-bottom: 0 !important;
        }

        .markdown-body pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            color: var(--preview-code-text, inherit);
            background-color: var(--preview-code-bg, rgba(0,0,0,0.05)) !important;
            border-radius: 6px;
            border: 1px solid var(--preview-border, rgba(255,255,255,0.1)) !important;
            margin-top: 0;
            margin-bottom: 16px;
        }

        .markdown-body pre code {
            padding: 0;
            margin: 0;
            font-size: 100%;
            word-break: var(--preview-code-word-break, normal);
            white-space: var(--preview-code-whitespace, pre);
            color: var(--preview-code-text, inherit);
            background: transparent !important;
            border: 0;
        }

        .markdown-body p, .markdown-body ul, .markdown-body ol {
            margin-top: 0;
            margin-bottom: 16px;
        }

        .markdown-body table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-top: 0;
            margin-bottom: 16px;
            width: 100%;
        }

        .markdown-body table th,
        .markdown-body table td {
            padding: var(--table-cell-padding, 8px 12px);
            border: var(--table-border-style, 1px solid) var(--table-border-color, var(--preview-border, #e5e7eb));
            vertical-align: var(--table-vertical-align, middle);
        }

        .markdown-body table th {
            font-weight: 600;
            background-color: var(--table-header-bg, var(--preview-table-th-bg, #f1f5f9));
            color: var(--table-header-color, var(--preview-heading, inherit));
            border-bottom: var(--table-header-border-bottom, 2px solid var(--theme-color, #3b82f6));
        }

        .markdown-body table tr {
            background-color: var(--table-row-bg, var(--preview-table-tr-bg, transparent));
            border-bottom: var(--table-row-border-bottom, var(--table-border-style, 1px solid) var(--table-border-color, var(--preview-border, #e5e7eb)));
        }

        .markdown-body table tr:nth-child(even) {
            background-color: var(--table-stripe-bg, var(--preview-table-tr-even-bg, rgba(0, 0, 0, 0.02)));
        }

        .markdown-body table tr:hover {
            background-color: var(--table-hover-bg, inherit);
        }
        `;

        const fontStyle = styleVars['--preview-font-family'] || 'system-ui, -apple-system, sans-serif';
        const fontSizeStyle = styleVars['--preview-font-size'] || '16px';
        const activeLineColor = lineColor || styleVars['--theme-color'] || '#3b82f6';
        const safeTitle = (filename || 'untitled.md').replace(/\.[^/.]+$/, "");
        const isMaxWidthLimited = (options && typeof options.isMaxWidthLimited === 'boolean') ? options.isMaxWidthLimited : true;
        const fullWidthClass = isMaxWidthLimited ? '' : ' full-width';

        // 동적 CSS 변수 조립 (options.styleVars 객체로부터 100% 순수 인라인화)
        let injectedCssVars = '';
        if (styleVars && typeof styleVars === 'object') {
            Object.keys(styleVars).forEach(varName => {
                if (styleVars[varName]) {
                    injectedCssVars += `${varName}: ${styleVars[varName]} !important;\n            `;
                }
            });
        }

        return `<!DOCTYPE html>
<html lang="ko" data-editor-theme="${currentTheme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} - Preview Export</title>
    <style>
        /* 1. Core Markdown Typography CSS (Lightweight 1KB Template) */
        ${coreMarkdownCss}

        /* 2. Syntax Highlighting CSS (Highlight.js) */
        ${githubCss}

        /* 3. KaTeX Math CSS */
        ${katexCss}

        /* 4. Dynamic Style Themes & Root Override */
        :root, [data-editor-theme="${currentTheme}"] {
            --theme-color: ${activeLineColor} !important;
            --preview-font-family: ${fontStyle} !important;
            --preview-font-size: ${fontSizeStyle} !important;
            ${injectedCssVars}
        }
        
        body {
            background-color: var(--preview-bg, ${currentTheme === 'dark' ? '#1e293b' : '#ffffff'}) !important;
            color: var(--preview-text, ${currentTheme === 'dark' ? '#f8fafc' : '#1f2937'}) !important;
            font-family: var(--preview-font-family) !important;
            font-size: var(--preview-font-size) !important;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }

        .export-container {
            width: 100%;
            max-width: 800px;
            padding: 40px 24px;
            box-sizing: border-box;
            background-color: var(--preview-bg, ${currentTheme === 'dark' ? '#1e293b' : '#ffffff'}) !important;
        }

        /* 5. A4 Print & PDF Export Optimization */
        @media print {
            @page {
                size: A4;
                margin: 1in;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            body, .preview-viewport {
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
            }
            .export-container, .markdown-body {
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                line-height: 1.5 !important;
            }
            .markdown-body h1:first-child,
            .markdown-body h1:first-of-type,
            .markdown-body > *:first-child {
                margin-top: 0 !important;
            }
            .markdown-body pre,
            .markdown-body pre code {
                white-space: pre-wrap !important;
                word-break: break-word !important;
                overflow-x: visible !important;
            }
            .markdown-body pre,
            .markdown-body table,
            .markdown-body blockquote,
            .markdown-body img,
            .markdown-body .mermaid,
            .markdown-body .katex-display {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
    </style>
</head>
<body data-editor-theme="${currentTheme}" class="${fullWidthClass.trim()}">
    <div class="preview-viewport${fullWidthClass}" style="width:100%; display:flex; justify-content:center; background-color: var(--preview-bg, ${currentTheme === 'dark' ? '#1e293b' : '#ffffff'});">
        <div class="export-container${fullWidthClass}">
            <article class="markdown-body${fullWidthClass}">
                ${clonedPreview.innerHTML}
            </article>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * 매개변수로 주입받은 프리뷰, 파일명 및 options 객체를 이용해 HTML 파일 다운로드를 처리하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 저장에 사용할 기준 파일명
     * @param {Object} [options={}] - 설정 옵션 객체 ({ theme, lineColor, styleVars })
     */
    async function downloadPreviewHtml(previewEl, filename, options = {}) {
        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, options);
            if (!htmlContent) {
                alert('내보낼 프리뷰 내용이 없습니다.');
                return;
            }

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const currentName = filename || 'untitled.md';
            const lastDotIndex = currentName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? currentName.substring(0, lastDotIndex) : currentName;
            const targetFilename = `${baseName}.html`;

            triggerFileDownload(blob, targetFilename);
        } catch (err) {
            console.error('HTML 저장 실패:', err);
            alert('HTML 저장에 실패했습니다.');
        }
    }

    /**
     * 매개변수로 주입받은 프리뷰, 파일명 및 options 객체를 이용해 독립 새 창으로 프리뷰 HTML을 출력하는 순수 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 기준 파일명
     * @param {Object} [options={}] - 설정 옵션 객체 ({ theme, lineColor, styleVars })
     */
    async function openPreviewHtmlInNewWindow(previewEl, filename, options = {}) {
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            alert('팝업 차단이 감지되었습니다. 팝업 차단을 해제해 주세요.');
            return;
        }

        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, options);
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

    /**
     * 글로벌 Scope 변수 직접 접근을 배제하고 인자로 텍스트 콘텐츠와 파일명, 후속 상태 업데이트 콜백을 받아 마크다운 문서를 다운로드/저장하는 서브 함수.
     * @param {string} textContent - 마크다운 텍스트 콘텐츠
     * @param {string} targetFilename - 저장할 마크다운 파일명
     * @param {Function} [onSaveComplete] - 성공 저장 시 상태 갱신/알림 콜백 (savedFilename) => void
     */
    async function downloadCurrentContent(textContent, targetFilename, onSaveComplete) {
        const text = textContent || '';
        const filename = targetFilename || 'untitled.md';

        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Markdown Document',
                        accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(text);
                await writable.close();

                const savedName = handle.name;
                if (typeof onSaveComplete === 'function') {
                    onSaveComplete(savedName, handle);
                }
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }
                console.warn('showSaveFilePicker 실패 fallback 다운로드 시도:', err);
            }
        }

        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        triggerFileDownload(blob, filename, (savedName) => {
            if (typeof onSaveComplete === 'function') {
                onSaveComplete(savedName);
            }
        });
    }

    /**
     * [기존 동작]: 매개변수로 주입받은 프리뷰 DOM 콘텐츠를 스타일시트 없이 순수 기본 HTML 구조만으로 새 창에 출력하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 기준 파일명
     */
    async function openDefaultPreviewHtmlInNewWindow(previewEl, filename) {
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            alert('팝업 차단이 감지되었습니다. 팝업 차단을 해제해 주세요.');
            return;
        }

        try {
            if (!previewEl || previewEl.children.length === 0) {
                alert('새 창으로 띄울 프리뷰 내용이 없습니다.');
                newWindow.close();
                return;
            }

            const safeTitle = (filename || 'untitled.md').replace(/\.[^/.]+$/, "");
            const defaultHtmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} - Preview (기본)</title>
</head>
<body>
    <div class="export-container">
        <article class="markdown-body">
            ${previewEl.innerHTML}
        </article>
    </div>
</body>
</html>`;

            newWindow.document.open();
            newWindow.document.write(defaultHtmlContent);
            newWindow.document.close();
        } catch (err) {
            console.error('기본 HTML 새 창 열기 실패:', err);
            alert('HTML 새 창 열기에 실패했습니다.');
            newWindow.close();
        }
    }

    /**
     * 숨겨진 iframe을 생성하여 generatePreviewHtmlContent() 결과를 주입하고 print()를 호출하는 순수 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 기준 파일명
     * @param {Object} [options={}] - 설정 옵션 객체 ({ theme, lineColor, styleVars })
     * @returns {Promise<boolean>} 성공 여부
     */
    async function print_to_pdf(previewEl, filename, options = {}) {
        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, options);
            if (!htmlContent) {
                if (typeof alert === 'function') alert('내보낼 프리뷰 내용이 없습니다.');
                return false;
            }

            if (typeof document === 'undefined' || !document.createElement) {
                console.warn('DOM 환경이 아니므로 iframe 기반 printToPdf 실행을 건너땁니다.');
                return true;
            }

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.visibility = 'hidden';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentWindow.document || iframe.contentDocument;
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();

            return new Promise((resolve) => {
                const triggerPrint = () => {
                    try {
                        if (iframe.contentWindow) {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                        }
                    } catch (e) {
                        console.error('PDF 인쇄 실행 오류:', e);
                    } finally {
                        setTimeout(() => {
                            if (iframe.parentNode) {
                                document.body.removeChild(iframe);
                            }
                            resolve(true);
                        }, 1000);
                    }
                };

                if (iframe.contentWindow && iframe.contentWindow.document && iframe.contentWindow.document.readyState === 'complete') {
                    setTimeout(triggerPrint, 250);
                } else {
                    iframe.onload = () => setTimeout(triggerPrint, 250);
                }
            });
        } catch (err) {
            console.error('PDF 인쇄 처리 실패:', err);
            if (typeof alert === 'function') alert('PDF 저장에 실패했습니다.');
            return false;
        }
    }

    /**
     * html2pdf 라이브러리를 이용하여 오프스크린 PDF 파일을 자동 렌더링/다운로드하는 순수 서브 함수.
     * html2pdf 미존재 시 print_to_pdf로 안전하게 fallback함.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 기준 파일명
     * @param {Object} [options={}] - 설정 옵션 객체 ({ theme, lineColor, styleVars })
     * @returns {Promise<boolean>} 성공 여부
     */
    async function save_to_pdf_file(previewEl, filename, options = {}) {
        const hasHtml2Pdf = (typeof html2pdf !== 'undefined') || (typeof window !== 'undefined' && typeof window.html2pdf !== 'undefined');
        if (!hasHtml2Pdf) {
            console.warn('html2pdf 라이브러리를 찾을 수 없어 print_to_pdf로 안전하게 fallback합니다.');
            return await print_to_pdf(previewEl, filename, options);
        }

        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, options);
            if (!htmlContent) {
                if (typeof alert === 'function') alert('내보낼 프리뷰 내용이 없습니다.');
                return false;
            }

            const currentName = filename || 'untitled.md';
            const lastDotIndex = currentName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? currentName.substring(0, lastDotIndex) : currentName;
            const targetFilename = `${baseName}.pdf`;

            if (typeof document === 'undefined' || !document.createElement) {
                console.warn('DOM 환경이 아니므로 html2pdf 실행을 건너땁니다.');
                return true;
            }

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            tempContainer.style.width = '800px';
            tempContainer.innerHTML = htmlContent;
            document.body.appendChild(tempContainer);

            const targetEl = tempContainer.querySelector('.export-container') || tempContainer;
            const opt = {
                margin: [10, 10, 10, 10],
                filename: targetFilename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const html2pdfFunc = typeof html2pdf !== 'undefined' ? html2pdf : window.html2pdf;
            await html2pdfFunc().set(opt).from(targetEl).save();

            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            return true;
        } catch (err) {
            console.error('html2pdf PDF 저장 실패, print_to_pdf fallback 시도:', err);
            return await print_to_pdf(previewEl, filename, options);
        }
    }

    /**
     * 현재 런타임 브라우저 종류('edge' | 'chrome' | 'other')를 명확히 구별하는 순수 서브 함수
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
     * 브라우저 종류에 맞는 PDF 인쇄 안내 HTML 메시지를 반환하는 순수 서브 함수
     * @param {string} [browserType] - 전달받은 브라우저 종류 (미지정 시 자동 감지)
     * @returns {string} 하단 배너용 HTML 메시지 문자열
     */
    function get_pdf_print_notice_message(browserType) {
        const bType = browserType || detect_browser_type();
        if (bType === 'edge') {
            return '💡 <span class="banner-badge">인쇄 안내</span> - [프린터]: <strong class="banner-highlight">"PDF로 저장"</strong> | [기타 설정] ➔ [여백]: <strong class="banner-highlight">"최소" 또는 "사용자 지정"</strong>';
        }
        if (bType === 'chrome') {
            return '💡 <span class="banner-badge">인쇄 안내</span> - (프린터) [대상]: <strong class="banner-highlight">"PDF로 저장"</strong>  |  [여백]: <strong class="banner-highlight">"맞춤"</strong> 권장';
        }
        return '💡 <span class="banner-badge">인쇄 안내</span> - [프린터]: <strong class="banner-highlight">"PDF로 저장"</strong> | [여백]: <strong class="banner-highlight">"맞춤"</strong> 권장';
    }

    /**
     * pure sub-function: app.js가 소유한 DOM 엘리먼트 클로저를 명시적으로 주입받아, 내보내기(Export)에
     * 필요한 테마/레이아웃/스타일 변수 옵션 객체를 조합해 반환한다.
     * @param {Object} elements - { lineColorPicker, fontSizeSelect, fontSelect, togglePreviewMaxWidthCheckbox, colorSwatchCheckbox }
     * @param {Object} [overrideOptions={}] - { theme } 등 오버라이드 옵션
     * @returns {Object} { theme, lineColor, isMaxWidthLimited, isColorSwatchEnabled, styleVars }
     */
    function collect_export_options(elements, overrideOptions = {}) {
        if (!assert_arg(elements && typeof elements === 'object', 'collect_export_options: elements object is required!', { elements })) {
            return null;
        }

        const { lineColorPicker, fontSizeSelect, fontSelect, togglePreviewMaxWidthCheckbox, colorSwatchCheckbox } = elements;

        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-editor-theme') || 'dark';
        const targetTheme = overrideOptions.theme || currentTheme;
        const activeLineColor = lineColorPicker ? lineColorPicker.value : '#3b82f6';
        const computedStyle = getComputedStyle(root);

        // 프리뷰의 전체 테마 + Heading Preset + 레이아웃 변수 수집 목록 (ExportStyleSet 기반)
        const cssVarList = ExportStyleSet.getAll();

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
        if (fontSizeSelect && fontSizeSelect.value) {
            styleVars['--preview-font-size'] = PreviewManager.calcScaledFontSize(fontSizeSelect.value, 10);
        }
        if (fontSelect && fontSelect.value) {
            styleVars['--preview-font-family'] = fontSelect.value;
        }

        // 2. targetTheme가 현재 화면 테마와 다른 경우 (예: 다크 모드 화면에서 PDF 라이트 모드 출력)
        // 활성화된 Heading Preset을 targetTheme 기준으로 재계산하여 styleVars 덮어씀
        if (targetTheme !== currentTheme) {
            const activePresetId = localStorage.getItem('markvi_active_heading_preset') || 'github_classic';
            const presets = StylePresetManager.getPresets();
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

    // 외부로 공개하는 모듈 API
    return {
        ExportStyleSet,
        ClipboardManager,
        copy_preview_to_clipboard_ui,
        copyPreviewToClipboard: copy_preview_to_clipboard_ui,
        triggerFileDownload,
        generatePreviewHtmlContent,
        downloadPreviewHtml,
        openPreviewHtmlInNewWindow,
        openDefaultPreviewHtmlInNewWindow,
        downloadCurrentContent,
        getPdfPrintNoticeMessage: get_pdf_print_notice_message,
        get_pdf_print_notice_message,
        collectOptions: collect_export_options,
        collect_export_options,
        printToPdf: print_to_pdf,
        saveToPdfFile: save_to_pdf_file,
        print_to_pdf,
        save_to_pdf_file
    };
})();

// 글로벌 Window 객체에 ExportManager, ExportStyleSet 및 ClipboardManager 등록
if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
    window.ClipboardManager = ExportManager.ClipboardManager;
    window.ExportStyleSet = ExportStyleSet;
}
if (typeof global !== 'undefined' && global.window) {
    global.window.ExportManager = ExportManager;
    global.window.ClipboardManager = ExportManager.ClipboardManager;
    global.window.ExportStyleSet = ExportStyleSet;
}
