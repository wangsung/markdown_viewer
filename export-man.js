/**
 * ==========================================================================
 * export-man.js - 복사, 저장 및 내보내기 관리 전용 독립 서브 모듈
 * ==========================================================================
 * [모듈 목적]: app.js에서 전역 변수에 의존하던 복사(Copy), 파일 저장(Save), 
 * HTML 내보내기(Export) 기능을 순수 서브 함수(Pure Sub-functions)로 캡슐화하여 제공함.
 */

const ExportManager = (function() {
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
     * 글로벌 변수 의존성을 제거하고, 프리뷰 DOM 선택/복사 및 성공 피드백 UI 처리를 순수 서브 함수로 모듈화함.
     * @param {HTMLElement} previewEl - 복사 대상 프리뷰 엘리먼트
     * @param {HTMLElement|null} exportMenuEl - 닫을 내보내기 메뉴 엘리먼트
     * @param {HTMLElement|null} feedbackBtnEl - 복사 완료 성공 표시를 해줄 버튼 엘리먼트
     */
    function copyPreviewToClipboard(previewEl, exportMenuEl, feedbackBtnEl) {
        if (!previewEl || previewEl.children.length === 0) {
            alert('복사할 프리뷰 내용이 없습니다.');
            return false;
        }

        if (exportMenuEl) {
            exportMenuEl.classList.remove('show');
        }

        const range = document.createRange();
        range.selectNodeContents(previewEl);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            const successful = document.execCommand('copy');
            if (successful) {
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
            return successful;
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert('클립보드 복사에 실패했습니다.');
            return false;
        } finally {
            selection.removeAllRanges();
        }
    }

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

        const {
            theme = 'dark',
            lineColor = '#3b82f6',
            styleVars = {}
        } = options;

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
                        if (sheet.href && sheet.href.includes('github.min.css')) {
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
                const res = await fetch(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('libs/github.min.css') : 'libs/github.min.css');
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
        .markdown-body {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 48px;
            color: var(--preview-text, #1f2937);
            font-family: var(--preview-font-family, system-ui, sans-serif);
            font-size: var(--preview-font-size, 16px);
            line-height: 1.7;
            word-wrap: break-word;
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

        .markdown-body pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
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
            word-break: normal;
            white-space: pre;
            background: transparent !important;
            border: 0;
        }

        .markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body table {
            margin-top: 0;
            margin-bottom: 16px;
        }
        `;

        const fontStyle = styleVars['--preview-font-family'] || 'system-ui, -apple-system, sans-serif';
        const fontSizeStyle = styleVars['--preview-font-size'] || '16px';
        const activeLineColor = lineColor || styleVars['--theme-color'] || '#3b82f6';
        const currentTheme = theme || 'dark';
        const safeTitle = (filename || 'untitled.md').replace(/\.[^/.]+$/, "");

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
        /* 1. Syntax Highlighting CSS */
        ${githubCss}

        /* 2. KaTeX Math CSS */
        ${katexCss}

        /* 3. Core Markdown Typography CSS (Lightweight 1KB Template) */
        ${coreMarkdownCss}

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
    </style>
</head>
<body data-editor-theme="${currentTheme}">
    <div class="preview-viewport" style="width:100%; display:flex; justify-content:center; background-color: var(--preview-bg, ${currentTheme === 'dark' ? '#1e293b' : '#ffffff'});">
        <div class="export-container">
            <article class="markdown-body">
                ${previewEl.innerHTML}
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
                    onSaveComplete(savedName);
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

    // 외부로 공개하는 모듈 API
    return {
        copyPreviewToClipboard,
        triggerFileDownload,
        generatePreviewHtmlContent,
        downloadPreviewHtml,
        openPreviewHtmlInNewWindow,
        openDefaultPreviewHtmlInNewWindow,
        downloadCurrentContent
    };
})();

// 글로벌 Window 객체에 ExportManager 등록
if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}
