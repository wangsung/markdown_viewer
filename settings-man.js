/**
 * settings-man.js
 * 설정 다이얼로그 모달 제어 및 브라우저 확장자 연결 레지스트리(.reg) 다운로드 전용 서브 모듈
 */
window.SettingsManager = (function() {

    /**
     * [Refactoring] Pure Sub-function: 지정된 브라우저 타입에 따른 .reg 파일 텍스트 내용을 반환하는 순수 서브 함수.
     * 리팩토링 목적: 전역 DOM 및 외부 상태 참조를 전혀 갖지 않고, 인자로 브라우저 종류만 수신하여 레지스트리 내용을 생성함.
     * @param {string} browserType - 'chrome' | 'edge'
     * @returns {string} 레지스트리 파일 본문 텍스트
     */
    function generate_reg_content(browserType) {
        if (browserType === 'chrome') {
            return `Windows Registry Editor Version 5.00\r\n\r\n[HKEY_CURRENT_USER\\Software\\Classes\\.md]\r\n@="ChromeHTML"\r\n`;
        } else if (browserType === 'edge') {
            return `Windows Registry Editor Version 5.00\r\n\r\n[HKEY_CURRENT_USER\\Software\\Classes\\.md]\r\n@="MSEdgeHTM"\r\n`;
        }
        return '';
    }

    /**
     * [Refactoring] Pure Sub-function: 텍스트 데이터를 받아 브라우저 레지스트리(.reg) 다운로드를 트리거하는 유틸리티 함수.
     * @param {string} filename - 저장할 파일명 (예: associate_chrome.reg)
     * @param {string} regContent - 레지스트리 본문
     */
    function download_reg_file(filename, regContent) {
        if (!regContent) return;
        const blob = new Blob([regContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * [Refactoring] Pure Sub-function: Settings 다이얼로그 모달 본문 HTML 컨텍스트 템플릿을 반환하는 순수 함수.
     * 리팩토링 목적: HTML 문서에 하드코딩되어 있던 설정 관련 안내 텍스트 및 레이아웃 컨텍스트를 서브 모듈 내 순수 템플릿으로 완전 캡슐화함.
     * @returns {string} Settings 모달 내부 HTML 템플릿 스트링
     */
    function get_settings_template() {
        return `
        <div class="modal-content">
            <div class="modal-header">
                <h2>⚙️ 설정</h2>
                <span class="close-btn" id="close-settings">&times;</span>
            </div>
            <div class="modal-body">
                <!-- Windows 탐색기 연결 설정 -->
                <div class="settings-section">
                    <h3>📂 Windows 탐색기 연결 설정</h3>
                    <p class="settings-description">탐색기에서 마크다운 파일(.md)을 더블 클릭했을 때, 웹 브라우저로 바로 실행되도록 연결을 설정합니다. (크롬/엣지 확장 프로그램이 감지하여 자동으로 프리뷰를 실행합니다.)</p>
                    
                    <div class="assoc-methods" style="margin-bottom: 12px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 0.875rem; color: #f1f5f9; font-weight: 600;">방법 1. 윈도우 우클릭으로 연결하기</h4>
                        <ol class="guide-steps" style="margin-bottom: 12px;">
                            <li>마크다운 파일(.md)을 <strong>마우스 우클릭</strong>합니다.</li>
                            <li><strong>[연결 프로그램]</strong> → <strong>[다른 앱 선택]</strong>을 클릭합니다.</li>
                            <li>사용할 웹 브라우저(예: <strong>Google Chrome</strong> 또는 <strong>Microsoft Edge</strong>)를 선택합니다.</li>
                            <li>하단의 <strong>'항상 .md 파일을 열 때 이 앱 사용'</strong> 체크박스를 활성화하고 확인을 누릅니다.</li>
                        </ol>
                    </div>

                    <div class="assoc-methods" style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 0.875rem; color: #f1f5f9; font-weight: 600;">방법 2. 레지스트리(.reg) 등록 파일 다운로드</h4>
                        <p class="settings-description" style="margin-bottom: 10px; font-size: 0.775rem;">원클릭으로 연결 확장자를 레지스트리에 자동 등록하는 설정 파일을 다운로드합니다.</p>
                        <div class="settings-action" style="flex-direction: row; gap: 8px;">
                            <button id="btn-reg-chrome" class="btn btn-primary" style="flex: 1; padding: 8px 12px; font-size: 0.8rem; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);">
                                Chrome(크롬) 연결 등록
                            </button>
                            <button id="btn-reg-edge" class="btn btn-primary" style="flex: 1; padding: 8px 12px; font-size: 0.8rem; background-color: #10b981; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);">
                                Edge(엣지) 연결 등록
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Chrome Extension 설치 안내 -->
                <div class="settings-section" style="margin-top: 16px;">
                    <h3>🔌 Chrome 확장 프로그램 설치 안내</h3>
                    <p class="settings-description">브라우저 빈 화면에 마크다운 파일(.md)을 드래그 앤 드롭했을 때 자동으로 본 뷰어가 구동되도록 연동합니다.</p>
                    
                    <div class="extension-guide-tabs">
                        <div class="guide-sub-section">
                            <h4>방법 1. 크롬 웹 스토어 공식 설치 (권장)</h4>
                            <ol class="guide-steps">
                                <li>크롬 웹 스토어에서 뷰어를 검색하여 <strong>[Chrome에 추가]</strong>를 누릅니다.</li>
                                <li>주소창에 <code class="code-badge">chrome://extensions</code> 입력 후 이동합니다.</li>
                                <li>뷰어 세부정보에서 <strong>[로컬 파일 URL에 대한 액세스 허용]</strong>을 켭니다.</li>
                            </ol>
                        </div>
                        
                        <div class="guide-sub-section" style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                            <h4>방법 2. 수동 설치 (개발자 모드 배포)</h4>
                            <ol class="guide-steps">
                                <li>배포된 뷰어 소스 패키지(ZIP)의 압축을 풉니다.</li>
                                <li>주소창에 <code class="code-badge">chrome://extensions</code> 입력 후 이동합니다.</li>
                                <li>우측 상단 <strong>[개발자 모드]</strong> 스위치를 켭니다.</li>
                                <li>왼쪽 상단 <strong>[압축해제된 확장 프로그램 로드]</strong>를 눌러 뷰어 폴더를 선택합니다.</li>
                                <li>뷰어 세부정보에서 <strong>[로컬 파일 URL에 대한 액세스 허용]</strong>을 켭니다.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Settings 모달 및 레지스트리 다운로드 버튼 이벤트 핸들러 초기화 (의존성 주입 지원)
     * @param {Object} [options] - 커스텀 DOM 요소 옵션
     */
    function init(options = {}) {
        const btnSettings = options.btnSettings || document.getElementById('btn-settings');
        const settingsModal = options.settingsModal || document.getElementById('settings-modal');
        
        if (!settingsModal) return;

        // 템플릿을 컨테이너에 동적 주입
        settingsModal.innerHTML = get_settings_template();

        const closeSettings = options.closeSettings || document.getElementById('close-settings');
        const btnRegChrome = options.btnRegChrome || document.getElementById('btn-reg-chrome');
        const btnRegEdge = options.btnRegEdge || document.getElementById('btn-reg-edge');

        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                settingsModal.style.display = 'block';
            });
        }

        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });

        if (btnRegChrome) {
            btnRegChrome.addEventListener('click', () => {
                const chromeReg = generate_reg_content('chrome');
                download_reg_file('associate_chrome.reg', chromeReg);
                alert('Chrome 연결등록 레지스트리 파일(associate_chrome.reg)이 다운로드되었습니다.\n\n다운로드된 파일을 더블 클릭하여 실행(병합)해 주세요!');
                settingsModal.style.display = 'none';
            });
        }

        if (btnRegEdge) {
            btnRegEdge.addEventListener('click', () => {
                const edgeReg = generate_reg_content('edge');
                download_reg_file('associate_edge.reg', edgeReg);
                alert('Edge 연결등록 레지스트리 파일(associate_edge.reg)이 다운로드되었습니다.\n\n다운로드된 파일을 더블 클릭하여 실행(병합)해 주세요!');
                settingsModal.style.display = 'none';
            });
        }
    }

    return {
        get_settings_template,
        generate_reg_content,
        download_reg_file,
        init
    };
})();
