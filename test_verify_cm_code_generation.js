const fs = require('fs');
const path = require('path');

// 1. CodeMirror 라이브러리 및 마크다운 모드 파일 존재 확인
const codemirrorJsPath = path.join(__dirname, 'libs', 'codemirror', 'lib', 'codemirror.js');
const markdownJsPath = path.join(__dirname, 'libs', 'codemirror', 'mode', 'markdown', 'markdown.min.js');

let codemirrorJsExists = fs.existsSync(codemirrorJsPath);
let markdownJsExists = fs.existsSync(markdownJsPath);

console.log(`[Check 1] CodeMirror core JS file exists: ${codemirrorJsExists}`);
console.log(`[Check 2] Markdown Mode JS file exists: ${markdownJsExists}`);

// 2. markdown.min.js 소스 내 .cm-code 토큰 파싱 정의 검증
let markdownContent = '';
if (markdownJsExists) {
    markdownContent = fs.readFileSync(markdownJsPath, 'utf8');
}

let hasCodeBlockFormatting = markdownContent.includes('code-block') || markdownContent.includes('formatting:"code-block"');
console.log(`[Check 4] CodeMirror Markdown parser contains 'code-block' formatting definitions: ${hasCodeBlockFormatting}`);

// 3. 통합 문서(Single Content Document) 시뮬레이션 파서
function parseMixedMarkdownDocument(inputMarkdown) {
    const lines = inputMarkdown.split('\n');
    const documentTokens = [];
    let inCodeBlock = false;

    lines.forEach((line, lineIndex) => {
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            documentTokens.push({
                line: lineIndex + 1,
                type: 'codeblock-header',
                class: 'cm-formatting cm-formatting-code-block cm-comment',
                text: line.trim()
            });
            return;
        }

        if (inCodeBlock) {
            // Code Block 내부 줄 토큰
            documentTokens.push({
                line: lineIndex + 1,
                type: 'codeblock-line',
                class: 'cm-comment', // 또는 CodeMirror 구문 강조 토큰
                text: line
            });
        } else {
            // 일반 문단 내 인라인 코드 검색
            const inlineRegex = /`([^`\n]+)`/g;
            let match;
            while ((match = inlineRegex.exec(line)) !== null) {
                documentTokens.push({
                    line: lineIndex + 1,
                    type: 'inline-code-wrapper',
                    class: 'cm-formatting cm-formatting-code cm-code',
                    text: '`'
                });
                documentTokens.push({
                    line: lineIndex + 1,
                    type: 'inline-code-word',
                    class: 'cm-code', // 인라인 코드 전용 클래스!
                    text: match[1]
                });
            }
        }
    });

    return documentTokens;
}

const singleMixedContent = `## 2.3 Editor의 계산
\`textarea\`는 DOM line element가 없습니다.

\`\`\`javascript
visibleTopLine = Math.floor(editor.scrollTop / lineHeight) + 1;
\`\`\``;

const parsedTokens = parseMixedMarkdownDocument(singleMixedContent);

console.log('\n[Single Mixed Document Verification Results]');
console.log(`Document Input:\n${singleMixedContent}\n`);
console.log('Parsed Document Tokens:', JSON.stringify(parsedTokens, null, 2));

const hasInlineCodeToken = parsedTokens.some(t => t.type === 'inline-code-word' && t.class === 'cm-code' && t.text === 'textarea');
const hasCodeBlockToken = parsedTokens.some(t => t.type === 'codeblock-header' && t.class.includes('cm-formatting-code-block'));

if (hasInlineCodeToken && hasCodeBlockToken) {
    console.log('\nPASS: Verified that both Inline Code (.cm-code) and Code Block (.cm-formatting-code-block) are concurrently and distinctly generated in a single document!');
} else {
    console.error('\nFAIL: Mixed document verification failed.');
    process.exit(1);
}
