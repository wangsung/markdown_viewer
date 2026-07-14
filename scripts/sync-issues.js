const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function cloneIssuesToLocal() {
    try {
        console.log('GitHub 원격 이슈 데이터 수집 중...');
        // GitHub CLI(gh)를 활용해 JSON 포맷으로 이슈 목록을 가져옴
        const rawJson = execSync('gh issue list --state all --json number,title,state,url --limit 100').toString();
        const issues = JSON.parse(rawJson);

        let markdownContent = `# 📋 프로젝트 백로그 (GitHub Sync)\n\n`;
        markdownContent += `*마지막 동기화 시각: ${new Date().toLocaleString('ko-KR')}*\n\n`;
        
        markdownContent += `## 🐛 미해결 과제 (Open)\n`;
        const openIssues = issues.filter(i => i.state === 'OPEN');
        if (openIssues.length === 0) {
            markdownContent += `- (미해결 과제가 없습니다.)\n`;
        } else {
            openIssues.forEach(i => {
                markdownContent += `- [ ] **#${i.number}**: ${i.title} ➔ [GitHub 연결](${i.url})\n`;
            });
        }

        markdownContent += `\n## ✅ 완료된 과제 (Closed)\n`;
        const closedIssues = issues.filter(i => i.state === 'CLOSED');
        if (closedIssues.length === 0) {
            markdownContent += `- (완료된 과제가 없습니다.)\n`;
        } else {
            closedIssues.forEach(i => {
                markdownContent += `- [x] **#${i.number}**: ${i.title} ➔ [GitHub 연결](${i.url})\n`;
            });
        }

        const targetPath = path.join(__dirname, '../backlog.md');
        fs.writeFileSync(targetPath, markdownContent, 'utf8');
        console.log('✔ backlog.md 파일로 GitHub Issues 복제(Clone) 완료!');
    } catch (error) {
        console.error('동기화 실패:', error.message);
        console.log('※ GitHub CLI(gh) 설치 및 gh auth login 상태를 점검하세요.');
    }
}

cloneIssuesToLocal();
