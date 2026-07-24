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
     * 글로벌 DOM/변수 직접 의존성을 없애고, 전달받은 프리뷰 엘리먼트와 테마/파일명 설정을 바탕으로 단독 실행 가능한 HTML 문자열을 동적 생성하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 현재 문서 파일명
     * @param {string} lineColor - 선택된 테마 라인 색상
     * @returns {Promise<string|null>} 생성된 HTML 문자열 또는 null
     */
    async function generatePreviewHtmlContent(previewEl, filename, lineColor) {
        if (!previewEl || previewEl.children.length === 0) {
            return null;
        }

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

        const fontStyle = getComputedStyle(previewEl).getPropertyValue('font-family').trim() || 'system-ui, -apple-system, sans-serif';
        const fontSizeStyle = getComputedStyle(previewEl).getPropertyValue('font-size').trim() || '16px';
        const activeLineColor = lineColor || '#3b82f6';
        const safeTitle = (filename || 'untitled.md').replace(/\.[^/.]+$/, "");

        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} - Preview Export</title>
    <style>
        :root {
            --theme-color: ${activeLineColor};
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

        ${githubCss}
        ${katexCss}
        ${styleCss}
    </style>
</head>
<body>
    <div class="export-container">
        <article class="markdown-body">
            ${previewEl.innerHTML}
        </article>
    </div>
</body>
</html>`;
    }

    /**
     * 매개변수로 주입받은 프리뷰 및 파일 정보를 이용해 HTML 파일 다운로드를 처리하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 저장에 사용할 기준 파일명
     * @param {string} lineColor - 테마 라인 색상
     */
    async function downloadPreviewHtml(previewEl, filename, lineColor) {
        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, lineColor);
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
     * 매개변수로 필요한 뷰와 파일 설정을 수집받아 독립 새 창으로 프리뷰 HTML을 출력하는 서브 함수.
     * @param {HTMLElement} previewEl - 프리뷰 DOM 엘리먼트
     * @param {string} filename - 기준 파일명
     * @param {string} lineColor - 테마 라인 색상
     */
    async function openPreviewHtmlInNewWindow(previewEl, filename, lineColor) {
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            alert('팝업 차단이 감지되었습니다. 팝업 차단을 해제해 주세요.');
            return;
        }

        try {
            const htmlContent = await generatePreviewHtmlContent(previewEl, filename, lineColor);
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

    // 외부로 공개하는 모듈 API
    return {
        copyPreviewToClipboard,
        triggerFileDownload,
        generatePreviewHtmlContent,
        downloadPreviewHtml,
        openPreviewHtmlInNewWindow,
        downloadCurrentContent
    };
})();

// 글로벌 Window 객체에 ExportManager 등록
if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}
