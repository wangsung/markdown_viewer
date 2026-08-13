# 프로젝트 규칙 (Project Rules)

## 리포트 및 명세서 저장 위치 규칙
- 분석 결과 보고서, 구현 명세서, 연구 노트 등 향후 작성되는 모든 개발 리포트 마크다운(.md) 파일은 항상 다음 경로에 생성하거나 저장해야 합니다:
  `C:\_My2026\_md_antigravity`

## 깃 원격 제어, 커밋 및 읽기 전용 작업 규칙 (Git Operation Policy)
- **명시적 지시 없는 git commit 금지 (Explicit Command Only for Git Commit Policy)**: `git commit` 작업은 사용자의 명시적인 지시나 승인이 있는 경우에만 실행해야 합니다. 버그 수정이나 기능 수정 작업 완료 후 임의로 자동 `git commit`을 수행하지 않으며, 커밋할 변경 내역을 먼저 보고하고 사용자의 명시적인 명령이 입력된 후에만 커밋을 수행합니다.
- **원격 전송 승인 필수**: `git push` 및 모든 GitHub 원격 전송 명령은 절대로 자동 실행하지 않으며, 반드시 실행 전 사용자에게 명령 줄을 노출하고 명시적인 동의/승인을 득한 뒤에만 수행해야 합니다.
- **읽기 전용 조회 무승인 자동 실행 (Read-Only Git Commands)**: `git log`, `git worktree list`, `git status`, `git diff`, `git branch` 등 저장소의 상태나 이력을 단순히 조회(Read Only)하는 작업은 언제나 사용자 사전 승인 없이 즉시 자동으로 실행합니다.

## 깃 브랜치 및 워크트리 병합 및 삭제 지침 (Git Branch & Worktree Merge & Removal Rules)
- **신규 워크트리 생성 사전 승인 지침 (Worktree Creation Confirmation Policy)**:
  - 새로운 워크트리(Worktree) 생성이 필요한 경우, 임의로 생성하지 않고 반드시 생성 목적 및 브랜치명과 함께 사용자에게 사전 확인(Confirm) 및 승인을 받은 후에만 생성을 진행해야 합니다.
- **신규 워크트리 작업 지침 (Worktree Working Target Policy)**:
  - 새로운 워크트리(Worktree)를 생성한 경우, 이후의 코드 수정 및 기능 구현 작업은 반드시 **새로 생성된 워크트리 디렉토리 내의 소스코드**를 대상으로 진행해야 합니다.
  - 작업 진행 상황이나 결과를 사용자에게 안내할 때는 해당 작업이 **특정 워크트리(Worktree 경로 및 브랜치명)**에서 진행되었음을 명확히 표시(응답에 명시)해야 합니다.
- **워크트리 전환 시 최신화 및 미커밋 상태 점검 지침 (Worktree Switch & Sync Policy)**:
  - 작업 영역(Worktree)을 전환하거나 새로 진입할 때는 대상 워크트리의 최신 이력 및 작업 상태(`git status`, `git log`)를 먼저 점검합니다.
  - **미커밋 작업물이 없는 경우**: `main` 브랜치 등 상위 브랜치의 최신 변경 내역과의 동기화(`git merge main` 등)를 진행합니다.
  - **미커밋 작업물이 존재하는 경우**:
    1. 미커밋 변경사항이 손실되지 않도록 `commit` 또는 `merge` 작업을 사용자에게 권장합니다.
    2. 최신 변경 내역 반영을 위한 추가 동기화 작업이 필요함을 사용자에게 명확히 안내합니다.
- **메인 워크트리 전환 시 서브 워크트리 미병합 항목 점검 및 병합 제안 지침 (Main Switch & Sub-Worktree Unmerged Check Policy)**:
  - `main` 브랜치/메인 워크트리로 전환하거나 진입할 때는 모든 서브 워크트리(기능 브랜치 `feature/*`)에 `main`으로 병합(merge)해야 할 대상 커밋이 존재하는지 자동 점검(`git log main..<feature_branch>`)을 필수 수행해야 합니다.
  - 병합 대상 커밋이 남아있는 경우, 해당 서브 워크트리명/브랜치명, 미병합 커밋 목록, 원격 저장소(`origin`) `push` 여부를 정리하여 사용자에게 명확하게 보고하고 `main` 병합(merge)을 우선 제안해야 합니다.
- 워크트리 또는 기능 브랜치(feature/*)의 작업물을 메인 브랜치(main)에 병합(merge)할 때는, 반드시 테스트 검증을 완료하고 사용자의 명시적인 승인/동의를 득한 뒤에만 병합을 수행해야 합니다.
- **메인 브랜치 병합 시 원격 푸시 상태 우선 지침 (Main Merge Push-First Policy)**:
  - `main` 브랜치로 병합(merge)을 진행할 때는 **원격 저장소(`origin`)에 `push` 완료된 커밋을 주요 대상으로 관리하는 것을 권장**합니다.
  - 기능 브랜치/워크트리에 로컬 커밋만 존재하고 아직 `push`되지 않은 커밋이 있는 경우, 먼저 사용자 승인 하에 해당 커밋을 원격 저장소(`origin/feature/*`)에 `push`를 진행한 후 `main` 브랜치로 병합(`merge`)하는 절차를 권장합니다.
- **워크트리 삭제 절차 지침 (Worktree Removal & Unpushed Check Policy)**:
  1. 워크트리를 닫거나 삭제 요청을 받으면, 닫기 전 해당 워크트리의 작업물을 **`main` 브랜치에 병합(merge)할 것인지 사용자의 명시적인 의사를 반드시 사전 확인**해야 합니다.
  2. 원격 저장소(`origin`)에 `push`되지 않은 작업 내역(미푸시 커밋 및 uncommitted 변경사항)이 있는지 사전 확인해야 합니다.
  3. 아직 `push`되지 않은 작업 내역이 있는 경우, 닫기 전 해당 미푸시 내역을 사용자에게 명확하게 안내합니다.
  4. 사용자의 병합(merge) 여부 결정 및 원격 저장소 100% `push` 상태 확인 후에만 워크트리를 닫습니다.
- **병합 후 후속 절차 지침 (Post-Merge Procedure Policy)**:
  1. 기능 브랜치/워크트리를 `main`에 병합(merge)을 완료한 직후, 프로젝트 내 **자동 테스트 루틴(예: 테스트 스크립트 실행)을 즉시 수행**해야 합니다.
  2. **기본 테스트 결과를 사용자에게 명확하게 요약 보고**해야 합니다.
  3. 기본 테스트 완료 후, 실사용 환경에서의 **자세한 동작 테스트는 추가로 검증이 필요함**을 사용자에게 안내해야 합니다.
  4. 원격 저장소 동기화를 위해 **`git push` 작업이 필요함**을 사용자에게 명시적으로 안내해야 합니다.

## 프로젝트 다이얼로그 인터페이스 지침 (Project Dialog Interface Guidelines)
- **관심사 분리 및 캡슐화**: 다이얼로그 모달 제어 로직을 리팩토링할 때는 다이얼로그 렌더링, 수치 수집, 컬러피커 등 로컬 UI 동작은 서브 모듈(예: `style-editor.js`)에 완전히 캡슐화하고, `app.js`는 데이터 상태 동기화 및 전역 뷰 렌더링만 전담하도록 분리합니다.
- **의존성 주입 (Dependency Injection)**: 서브 모듈은 스스로 특정 DOM 엘리먼트를 수동 검색하지 않고, 초기화(`init(options)`) 시 컨테이너 및 선택기 엘리먼트를 주입받아 제어해야 합니다.
- **양방향 상태 동기화 (Data Callbacks)**: 프리셋 등의 로컬 데이터 읽기/쓰기는 전적 상태 소유자인 `app.js`가 주입하는 콜백(`getPresetsData`, `savePresetsData`)을 경유해서만 처리합니다.
- **이벤트 리액티브 훅 (Reactive Hooks)**: 사용자 행동의 최종 CRUD 반영(저장, 적용, 추가, 삭제, 초기화) 완료 시에는 전용 콜백 훅(`onSave`, `onSaveAndClose`, `onAddPreset`, `onDeletePreset`, `onResetPreset`)을 쏘아 `app.js` 측 뷰어를 렌더링하고 사용자 알림을 띄우는 이벤트 통지식 구조로 설계합니다.
- **이벤트 버블링 차단 (Event Isolation)**: 오버레이 컬러피커 등 외부 간섭 위험이 있는 컴포넌트는 `stopPropagation()` 및 `preventDefault()`를 적용해 이벤트를 격리 고립시킵니다.

## 테스트 스크립트 작성 및 실행 지침 (Test Script File-based Policy)
- 모든 단위 테스트 및 검수용 테스트 스크립트는 `node -e "..."` 와 같은 긴 인라인 코맨드 방식 대신 **독립된 테스트 파일(`.js` 또는 `.html`)로 항상 작성하여 보관 및 저장**해야 합니다.
- 테스트 스크립트를 파일로 관리하여 반복적이고 지속 가능한 자동화 테스트 및 재검증에 활용합니다.

## 순수 서브 함수 네이밍 규칙 (Pure Sub-function Naming Convention)
- **상위 비즈니스/상태 관리 함수**: camelCase (예: `applyHeadingPreset`, `handleSaveCurrentDocument`)
- **순수 하위 서브 함수 (Pure Sub-function)**: 착오 방지를 위해 **모두 소문자 snake_case (예: `apply_heading_preset`, `join_paragraphs`, `insert_formatting`)**로 정의 및 표기해야 합니다.

## 메타성 버그 해결 깃 커밋 기록 지침 (Meta-Bug Fix Commit Logging Policy)
- 비즈니스 로직 버그가 아닌 **Git 충돌 마커 미제거, 오타/문법 오류(SyntaxError), 파일 구조 깨짐, 빌드/스크립트 환경 장애 등 메타(Meta)성 이슈 해결 시**에는 깃 커밋 메시지 본문(Body)에 관련 트러블슈팅 이력을 구체적으로 포함하여 기록해야 합니다.
- **커밋 본문 포함 구조**:
  ```text
  [Issue Description] 발생했던 메타성 장애 내용
  [Root Cause] 원인이 되었던 구문/Git/환경 요소
  [Resolution] 적용된 해결 조치 및 교정 방법
  ```
## 프로젝트 기능 관계 작업 룰 (Project Feature Dependency & Workflow Policy)
- **1차 작업 (1st Phase: UI Change & Live Preview Application)**:
  - UI 모달/다이얼로그 컨트롤 추가 및 프리뷰 뷰어 화면(`markdown-body`)에 실시간 리액티브 렌더링(Live Preview)을 보장하는 작업.
  - 대상 모듈: `style-editor.js`, `editor-man.js`, `style.css`, `markdown_viewer.html`.
- **2차 작업 (2nd Phase: Related Feature Integration & Export Preservations)**:
  - 1차 작업에서 신규 추가/변경된 UI 스타일 커스텀 프로퍼티 및 레이아웃 상태를 **파생 연관 기능(HTML 파일 내보내기 다운로드, HTML 새창 띄우기, 클립보드 복사 등)에 100% 누락 없이 이식 및 보존**하는 2단계 연동 작업을 필수 완료해야 합니다.
  - **2차 연관 기능 필수 점검 체크리스트**:
    1. **`app.js` (`collectExportOptions`)**: 신규 생성된 모든 CSS 커스텀 변수 수집 목록(`cssVarList`) 100% 동기화
    2. **`export-man.js` (`coreMarkdownCss`)**: 독립 HTML 템플릿 내 CSS 바인딩 클래스 및 셀렉터 룰 100% 이식
    3. **Export 연동 검수**: "Preview HTML 저장", "HTML 새창 띄우기 (스타일)", "HTML 새창 띄우기 (기본)" 실행 시 1차 작업 결과물(스타일 및 레이아웃) 100% 보존 검증

## 시스템 설계 원칙 및 오류 처리 지침 (System Design & Error Handling Policy)
- **Fallback 자동 보정 대상 vs 구조적 오류의 엄격한 구분**:
  - 사용자 입력의 소소한 가변성이나 단순 데이터 누락 등은 사용자 경험을 해치지 않도록 Fallback으로 보정할 수 있습니다.
  - 그러나 **테마(`data-editor-theme`), 레이아웃 구조, 필수 DOM 상태와 같이 에디터/프리뷰/프레임 렌더링 전 반드시 확정(Deterministic Decision)되어야 하는 프레임 필수 매개변수 및 상태값의 결함**은 조용히 Fallback으로 은폐(swallow)해서는 안 되며, 반드시 구조적 결함(Structural Bug)으로 명확히 표출 및 교정해야 합니다.
- **`assert_arg()` 매개변수 단증 및 System Warning 연동 지침**:
  - 모든 서브 모듈 및 주요 API 진입 시 필수 매개변수(Argument) 및 DOM 상태 유효성을 `assert_arg(condition, message, context)` 단증문으로 검증합니다.
  - 단증 실패 시:
    1. 최상단 붉은색 **System Warning 디버깅 배너**를 시각적으로 즉시 노출합니다.
    2. 에러 트러블슈팅을 위한 상세 스택 및 컨텍스트 정보를 **`localStorage` (`markvi_error_logs`) 및 에러 로그 기록 체계에 누적 저장**합니다.
    3. 디버그 환경 시 **Fail-Fast** 원칙에 따라 Error를 throw하여 오염된 상태가 시스템 하부로 전파되는 것을 즉시 차단합니다.
