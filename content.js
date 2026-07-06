(async function() {
    // 1. 브라우저가 출력한 pre 태그의 텍스트 소스 추출
    const pre = document.querySelector('pre');
    if (!pre) return;
    const rawMarkdown = pre.textContent;

    // 2. 기존 브라우저 텍스트 화면 삭제
    document.documentElement.innerHTML = '';

    // 3. 확장 프로그램에 내장된 뷰어 HTML 레이아웃을 로드하여 대입
    const viewerHtmlUrl = chrome.runtime.getURL('markdown_viewer.html');
    const response = await fetch(viewerHtmlUrl);
    let htmlText = await response.text();

    // 4. HTML 파일 내의 상대 경로(CSS, JS)들을 크롬 확장 리소스 주소로 치환
    const extensionBaseUrl = chrome.runtime.getURL('');
    
    // CSS 링크 치환 (싱글/더블 쿼테이션 및 쿼리 스트링 대응)
    htmlText = htmlText.replace(/href=(["'])libs\//g, `href=$1${extensionBaseUrl}libs/`);
    htmlText = htmlText.replace(/href=(["'])style\.css(\?[^"'>]*)?\1/g, `href=$1${extensionBaseUrl}style.css$2$1`);
    
    // JS 스크립트 치환 (싱글/더블 쿼테이션 및 쿼리 스트링 대응)
    htmlText = htmlText.replace(/src=(["'])libs\//g, `src=$1${extensionBaseUrl}libs/`);
    htmlText = htmlText.replace(/src=(["'])app\.js(\?[^"'>]*)?\1/g, `src=$1${extensionBaseUrl}app.js$2$1`);

    // 5. 뷰어 로딩 전 데이터 주입용 인라인 스크립트 작성
    // </head> 태그 직전에 스크립트를 삽입하여 app.js 구동 전에 전역 변수 선언을 확실히 보장합니다.
    const dataScript = `<script>
        window.loadedFileContent = {
            name: "${decodeURIComponent(window.location.pathname.split('/').pop()).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",
            path: "${decodeURIComponent(window.location.pathname).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",
            content: \`${rawMarkdown.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${').replace(/<\/script>/g, '<\\/script>')}\`
        };
    </script>`;
    
    htmlText = htmlText.replace('</head>', dataScript + '</head>');

    // 6. DOM에 수정된 HTML 적용 (스크립트들이 순차적/동기적으로 즉시 파싱 및 실행됨)
    document.open();
    document.write(htmlText);
    document.close();
})();
