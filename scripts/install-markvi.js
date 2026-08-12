/**
 * MarkVi 오프라인 라이브러리 자동 설치 및 CDN 다운로드 스크립트
 * (install-markvi.js)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 카텍스(KaTeX) 폰트 파일 목록 생성
const katexFonts = [
    'KaTeX_AMS-Regular', 'KaTeX_Caligraphic-Bold', 'KaTeX_Caligraphic-Regular',
    'KaTeX_Fraktur-Bold', 'KaTeX_Fraktur-Regular', 'KaTeX_Main-Bold',
    'KaTeX_Main-BoldItalic', 'KaTeX_Main-Italic', 'KaTeX_Main-Regular',
    'KaTeX_Math-BoldItalic', 'KaTeX_Math-Italic', 'KaTeX_SansSerif-Bold',
    'KaTeX_SansSerif-Italic', 'KaTeX_SansSerif-Regular', 'KaTeX_Script-Regular',
    'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular',
    'KaTeX_Size4-Regular', 'KaTeX_Typewriter-Regular'
];

const fontExtensions = ['ttf', 'woff', 'woff2'];
const fontAssets = [];

for (const font of katexFonts) {
    for (const ext of fontExtensions) {
        fontAssets.push({
            url: `https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/fonts/${font}.${ext}`,
            path: `katex/fonts/${font}.${ext}`
        });
    }
}

// CDN 에셋 매핑 리스트
const ASSET_MANIFEST = [
    // Marked & Highlight.js
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js', path: 'marked.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', path: 'highlight.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css', path: 'github.min.css' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css', path: 'github-dark.min.css' },

    // Mermaid
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js', path: 'mermaid.min.js' },

    // CodeMirror 5
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js', path: 'codemirror/codemirror.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css', path: 'codemirror/codemirror.min.css' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js', path: 'codemirror/mode/markdown/markdown.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js', path: 'codemirror/mode/xml/xml.min.js' },

    // KaTeX 코어 및 스타일
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js', path: 'katex/katex.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css', path: 'katex/katex.min.css' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.js', path: 'katex/katex.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.css', path: 'katex/katex.css' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.mjs', path: 'katex/katex.mjs' },

    // KaTeX contrib 플러그인
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js', path: 'katex/contrib/auto-render.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.js', path: 'katex/contrib/auto-render.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.mjs', path: 'katex/contrib/auto-render.mjs' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/copy-tex.min.js', path: 'katex/contrib/copy-tex.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/copy-tex.js', path: 'katex/contrib/copy-tex.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/copy-tex.mjs', path: 'katex/contrib/copy-tex.mjs' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mathtex-script-type.min.js', path: 'katex/contrib/mathtex-script-type.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mathtex-script-type.js', path: 'katex/contrib/mathtex-script-type.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mathtex-script-type.mjs', path: 'katex/contrib/mathtex-script-type.mjs' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mhchem.min.js', path: 'katex/contrib/mhchem.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mhchem.js', path: 'katex/contrib/mhchem.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/mhchem.mjs', path: 'katex/contrib/mhchem.mjs' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/render-a11y-string.min.js', path: 'katex/contrib/render-a11y-string.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/render-a11y-string.js', path: 'katex/contrib/render-a11y-string.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/render-a11y-string.mjs', path: 'katex/contrib/render-a11y-string.mjs' },

    // KaTeX 폰트 전체
    ...fontAssets
];

/**
 * 순수 하위 서브 함수: 디렉토리 존재 여부 확인 및 생성
 */
function ensure_directory(dir_path) {
    if (!fs.existsSync(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
    }
}

/**
 * 순수 하위 서브 함수: 단일 파일 비동기 다운로드 (리다이렉션 처리 포함)
 */
function download_single_file(url, dest_path) {
    return new Promise((resolve, reject) => {
        ensure_directory(path.dirname(dest_path));

        const request = https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // HTTP 리다이렉션 추적
                download_single_file(res.headers.location, dest_path)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP 상태 오류 ${res.statusCode}: ${url}`));
                return;
            }

            const file_stream = fs.createWriteStream(dest_path);
            res.pipe(file_stream);

            file_stream.on('finish', () => {
                file_stream.close();
                resolve();
            });

            file_stream.on('error', (err) => {
                fs.unlink(dest_path, () => {});
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 상위 설치/다운로드 제어 메인 함수
 */
async function run_markvi_installation() {
    const base_dir = path.join(__dirname, '../libs');
    ensure_directory(base_dir);

    console.log(`📦 [MarkVi Libs Installer] 총 ${ASSET_MANIFEST.length}개 에셋 설치/다운로드를 시작합니다...\n`);

    let success_count = 0;
    let fail_count = 0;

    for (let i = 0; i < ASSET_MANIFEST.length; i++) {
        const item = ASSET_MANIFEST[i];
        const dest_full_path = path.join(base_dir, item.path);
        const progress = `[${i + 1}/${ASSET_MANIFEST.length}]`;

        try {
            await download_single_file(item.url, dest_full_path);
            console.log(`✔ ${progress} 다운로드 성공: ${item.path}`);
            success_count++;
        } catch (err) {
            console.error(`❌ ${progress} 다운로드 실패: ${item.path} (${err.message})`);
            fail_count++;
        }
    }

    console.log(`\n==================================================`);
    console.log(`✨ [설치 완료 요약] 성공: ${success_count}개 / 실패: ${fail_count}개`);
    console.log(`==================================================\n`);
}

run_markvi_installation();
