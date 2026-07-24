# 프로젝트 규칙 (Project Rules)

## 리포트 및 명세서 저장 위치 규칙
- 분석 결과 보고서, 구현 명세서, 연구 노트 등 향후 작성되는 모든 개발 리포트 마크다운(.md) 파일은 항상 다음 경로에 생성하거나 저장해야 합니다:
  `C:\_My2026\_md_antigravity`

## 깃 원격 제어 규칙 (Git Remote Operation Rules)
- `git push` 및 모든 GitHub 원격 전송 명령은 절대로 자동 실행하지 않으며, 반드시 실행 전 사용자에게 명령 줄을 노출하고 명시적인 동의/승인을 득한 뒤에만 수동으로 수행해야 합니다.

## 깃 브랜치 및 워크트리 병합 및 삭제 지침 (Git Branch & Worktree Merge & Removal Rules)
- **신규 워크트리 작업 지침 (Worktree Working Target Policy)**:
  - 새로운 워크트리(Worktree)를 생성한 경우, 이후의 코드 수정 및 기능 구현 작업은 반드시 **새로 생성된 워크트리 디렉토리 내의 소스코드**를 대상으로 진행해야 합니다.
  - 작업 진행 상황이나 결과를 사용자에게 안내할 때는 해당 작업이 **특정 워크트리(Worktree 경로 및 브랜치명)**에서 진행되었음을 명확히 표시(응답에 명시)해야 합니다.
- 워크트리 또는 기능 브랜치(feature/*)의 작업물을 메인 브랜치(main)에 병합(merge)할 때는, 반드시 테스트 검증을 완료하고 사용자의 명시적인 승인/동의를 득한 뒤에만 병합을 수행해야 합니다.
- **워크트리 삭제 절차 지침 (Worktree Removal & Unpushed Check Policy)**:
  1. 워크트리를 닫거나 삭제할 때는 먼저 아직 원격 저장소(`origin`)에 `push`되지 않은 작업 내역(미푸시 커밋 및 uncommitted 변경사항)이 있는지 반드시 사전 확인해야 합니다.
  2. 아직 `push`되지 않은 작업 내역이 있는 경우, 닫기 전 해당 미푸시 내역을 사용자에게 먼저 명확하게 보여주고, 남아있는 작업 내역을 버리는 명령어(예: `git worktree remove --force` 또는 `git reset --hard`)를 먼저 안내해야 합니다.
  3. 해당 워크트리의 모든 내역이 원격 저장소에 100% `push`되어 있음이 확인된 경우에만 워크트리를 닫습니다.

## 프로젝트 다이얼로그 인터페이스 지침 (Project Dialog Interface Guidelines)
- **관심사 분리 및 캡슐화**: 다이얼로그 모달 제어 로직을 리팩토링할 때는 다이얼로그 렌더링, 수치 수집, 컬러피커 등 로컬 UI 동작은 서브 모듈(예: `style-editor.js`)에 완전히 캡슐화하고, `app.js`는 데이터 상태 동기화 및 전역 뷰 렌더링만 전담하도록 분리합니다.
- **의존성 주입 (Dependency Injection)**: 서브 모듈은 스스로 특정 DOM 엘리먼트를 수동 검색하지 않고, 초기화(`init(options)`) 시 컨테이너 및 선택기 엘리먼트를 주입받아 제어해야 합니다.
- **양방향 상태 동기화 (Data Callbacks)**: 프리셋 등의 로컬 데이터 읽기/쓰기는 전적 상태 소유자인 `app.js`가 주입하는 콜백(`getPresetsData`, `savePresetsData`)을 경유해서만 처리합니다.
- **이벤트 리액티브 훅 (Reactive Hooks)**: 사용자 행동의 최종 CRUD 반영(저장, 적용, 추가, 삭제, 초기화) 완료 시에는 전용 콜백 훅(`onSave`, `onSaveAndClose`, `onAddPreset`, `onDeletePreset`, `onResetPreset`)을 쏘아 `app.js` 측 뷰어를 렌더링하고 사용자 알림을 띄우는 이벤트 통지식 구조로 설계합니다.
- **이벤트 버블링 차단 (Event Isolation)**: 오버레이 컬러피커 등 외부 간섭 위험이 있는 컴포넌트는 `stopPropagation()` 및 `preventDefault()`를 적용해 이벤트를 격리 고립시킵니다.

## 테스트 스크립트 작성 및 실행 지침 (Test Script File-based Policy)
- 모든 단위 테스트 및 검수용 테스트 스크립트는 `node -e "..."` 와 같은 긴 인라인 코맨드 방식 대신 **독립된 테스트 파일(`.js` 또는 `.html`)로 항상 작성하여 보관 및 저장**해야 합니다.
- 테스트 스크립트를 파일로 관리하여 반복적이고 지속 가능한 자동화 테스트 및 재검증에 활용합니다.


