# 프로젝트 규칙 (Project Rules)

## 리포트 및 명세서 저장 위치 규칙
- 분석 결과 보고서, 구현 명세서, 연구 노트 등 향후 작성되는 모든 개발 리포트 마크다운(.md) 파일은 항상 다음 경로에 생성하거나 저장해야 합니다:
  `C:\_My2026\_md_antigravity`

## 깃 원격 제어 규칙 (Git Remote Operation Rules)
- `git push` 및 모든 GitHub 원격 전송 명령은 절대로 자동 실행하지 않으며, 반드시 실행 전 사용자에게 명령 줄을 노출하고 명시적인 동의/승인을 득한 뒤에만 수동으로 수행해야 합니다.

## 깃 브랜치 및 워크트리 병합 규칙 (Git Branch & Worktree Merge Rules)
- 워크트리 또는 기능 브랜치(feature/*)의 작업물을 메인 브랜치(main)에 병합(merge)할 때는, 반드시 테스트 검증을 완료하고 사용자의 명시적인 승인/동의를 득한 뒤에만 병합을 수행해야 합니다.
- **워크트리 삭제 제한 규칙**: 병합 및 푸시 완료 여부와 무관하게, 생성된 Git Worktree를 삭제(예: `git worktree remove`)할 때는 반드시 사전에 사용자의 명시적인 승인/동의를 득해야 합니다. (명시적인 확인 없이는 어떠한 워크트리도 임의로 삭제하지 마십시오.)

## 프로젝트 다이얼로그 인터페이스 지침 (Project Dialog Interface Guidelines)
- **관심사 분리 및 캡슐화**: 다이얼로그 모달 제어 로직을 리팩토링할 때는 다이얼로그 렌더링, 수치 수집, 컬러피커 등 로컬 UI 동작은 서브 모듈(예: `style-editor.js`)에 완전히 캡슐화하고, `app.js`는 데이터 상태 동기화 및 전역 뷰 렌더링만 전담하도록 분리합니다.
- **의존성 주입 (Dependency Injection)**: 서브 모듈은 스스로 특정 DOM 엘리먼트를 수동 검색하지 않고, 초기화(`init(options)`) 시 컨테이너 및 선택기 엘리먼트를 주입받아 제어해야 합니다.
- **양방향 상태 동기화 (Data Callbacks)**: 프리셋 등의 로컬 데이터 읽기/쓰기는 전적 상태 소유자인 `app.js`가 주입하는 콜백(`getPresetsData`, `savePresetsData`)을 경유해서만 처리합니다.
- **이벤트 리액티브 훅 (Reactive Hooks)**: 사용자 행동의 최종 CRUD 반영(저장, 적용, 추가, 삭제, 초기화) 완료 시에는 전용 콜백 훅(`onSave`, `onSaveAndClose`, `onAddPreset`, `onDeletePreset`, `onResetPreset`)을 쏘아 `app.js` 측 뷰어를 렌더링하고 사용자 알림을 띄우는 이벤트 통지식 구조로 설계합니다.
- **이벤트 버블링 차단 (Event Isolation)**: 오버레이 컬러피커 등 외부 간섭 위험이 있는 컴포넌트는 `stopPropagation()` 및 `preventDefault()`를 적용해 이벤트를 격리 고립시킵니다.

