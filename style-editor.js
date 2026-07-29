// ==========================================================================
// 🎨 MarkVi 스타일 세트 편집 다이얼로그 & 커스텀 컬러피커 모듈 (style-editor.js)
// ==========================================================================

(function() {
    // 1. 내부 기본 프리셋 5종 + CodeMirror Classic 프리셋 상수
    const DEFAULT_HEADING_PRESETS = [
        {
            id: 'github_classic',
            name: '1. GitHub Classic',
            styles: {
                h1: { colorLight: '#1d4ed8', colorDark: '#3b82f6', size: '2em', border: '1px solid #334155' },
                h2: { colorLight: '#0369a1', colorDark: '#0284c7', size: '1.5em', border: '1px solid #334155' },
                h3: { colorLight: '#0f172a', colorDark: '#f1f5f9', size: '1.25em', border: 'none' },
                h4: { colorLight: '#334155', colorDark: '#cbd5e1', size: '1em', border: 'none' },
                h5: { colorLight: '#475569', colorDark: '#94a3b8', size: '0.875em', border: 'none' },
                h6: { colorLight: '#64748b', colorDark: '#64748b', size: '0.85em', border: 'none' },
                link: { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' },
                strong: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                em: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                code: { colorLight: '#0969da', colorDark: '#38bdf8' },
                blockquote: { colorLight: '#475569', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
            }
        },
        {
            id: 'ocean_breeze',
            name: '2. Ocean Breeze (오션)',
            styles: {
                h1: { colorLight: '#0369a1', colorDark: '#38bdf8', size: '2.2em', border: '2px solid #38bdf8' },
                h2: { colorLight: '#0284c7', colorDark: '#7dd3fc', size: '1.6em', border: '1px dashed #7dd3fc' },
                h3: { colorLight: '#0ea5e9', colorDark: '#bae6fd', size: '1.3em', border: 'none' },
                h4: { colorLight: '#0369a1', colorDark: '#e0f2fe', size: '1.1em', border: 'none' },
                h5: { colorLight: '#1e3a8a', colorDark: '#f0f9ff', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#0284c7', colorDark: '#38bdf8', decoration: 'none' },
                strong: { colorLight: '#0369a1', colorDark: '#38bdf8' },
                em: { colorLight: '#0284c7', colorDark: '#7dd3fc' },
                code: { colorLight: '#0284c7', colorDark: '#38bdf8' },
                blockquote: { colorLight: '#0369a1', colorDark: '#bae6fd', borderLight: '#0284c7', borderDark: '#38bdf8' },
                line: { colorLight: '#38bdf8', colorDark: '#0ea5e9', border: '2px solid #38bdf8' }
            }
        },
        {
            id: 'emerald_forest',
            name: '3. Emerald Forest (에메랄드)',
            styles: {
                h1: { colorLight: '#047857', colorDark: '#34d399', size: '2.2em', border: '2px solid #059669' },
                h2: { colorLight: '#059669', colorDark: '#6ee7b7', size: '1.6em', border: '1px solid #10b981' },
                h3: { colorLight: '#10b981', colorDark: '#a7f3d0', size: '1.3em', border: 'none' },
                h4: { colorLight: '#047857', colorDark: '#d1fae5', size: '1.1em', border: 'none' },
                h5: { colorLight: '#064e3b', dataColorDark: '#ecfdf5', size: '0.9em', border: 'none' }, // fix potential typomap colorDark
                h5_fixed: { colorLight: '#064e3b', colorDark: '#ecfdf5', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#059669', colorDark: '#34d399', decoration: 'none' },
                strong: { colorLight: '#047857', colorDark: '#34d399' },
                em: { colorLight: '#059669', colorDark: '#6ee7b7' },
                code: { colorLight: '#059669', colorDark: '#34d399' },
                blockquote: { colorLight: '#047857', colorDark: '#a7f3d0', borderLight: '#059669', borderDark: '#34d399' },
                line: { colorLight: '#059669', colorDark: '#10b981', border: '2px solid #059669' }
            }
        },
        {
            id: 'crimson_elegant',
            name: '4. Crimson Elegant (크림슨)',
            styles: {
                h1: { colorLight: '#be123c', colorDark: '#fb7185', size: '2.2em', border: '2px solid #e11d48' },
                h2: { colorLight: '#e11d48', colorDark: '#fda4af', size: '1.6em', border: '1px solid #f43f5e' },
                h3: { colorLight: '#f43f5e', colorDark: '#fecdd3', size: '1.3em', border: 'none' },
                h4: { colorLight: '#be123c', colorDark: '#ffe4e6', size: '1.1em', border: 'none' },
                h5: { colorLight: '#881337', colorDark: '#fff1f2', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#e11d48', colorDark: '#fb7185', decoration: 'underline' },
                strong: { colorLight: '#be123c', colorDark: '#fb7185' },
                em: { colorLight: '#e11d48', colorDark: '#fda4af' },
                code: { colorLight: '#e11d48', colorDark: '#fb7185' },
                blockquote: { colorLight: '#881337', colorDark: '#fecdd3', borderLight: '#e11d48', borderDark: '#fb7185' },
                line: { colorLight: '#e11d48', colorDark: '#f43f5e', border: '2px solid #e11d48' }
            }
        },
        {
            id: 'violet_modern',
            name: '5. Violet Modern (바이올렛)',
            styles: {
                h1: { colorLight: '#6d28d9', colorDark: '#a78bfa', size: '2.2em', border: '2px solid #7c3aed' },
                h2: { colorLight: '#7c3aed', colorDark: '#c4b5fd', size: '1.6em', border: '1px dashed #7c3aed' },
                h3: { colorLight: '#8b5cf6', colorDark: '#ddd6fe', size: '1.3em', border: 'none' },
                h4: { colorLight: '#6d28d9', colorDark: '#ede9fe', size: '1.1em', border: 'none' },
                h5: { colorLight: '#4c1d95', colorDark: '#f5f3ff', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#7c3aed', colorDark: '#a78bfa', decoration: 'none' },
                strong: { colorLight: '#6d28d9', colorDark: '#a78bfa' },
                em: { colorLight: '#7c3aed', colorDark: '#c4b5fd' },
                code: { colorLight: '#7c3aed', colorDark: '#a78bfa' },
                blockquote: { colorLight: '#4c1d95', colorDark: '#ddd6fe', borderLight: '#7c3aed', borderDark: '#a78bfa' },
                line: { colorLight: '#7c3aed', colorDark: '#8b5cf6', border: '2px dashed #8b5cf6' }
            }
        },
        {
            id: 'codemirror_classic',
            name: '6. CodeMirror Classic',
            styles: {
                h1: { colorLight: '#1d4ed8', colorDark: '#3b82f6', size: '2em', border: '1px solid #334155' },
                h2: { colorLight: '#0369a1', colorDark: '#0284c7', size: '1.5em', border: '1px solid #334155' },
                h3: { colorLight: '#0f172a', colorDark: '#f1f5f9', size: '1.25em', border: 'none' },
                h4: { colorLight: '#334155', colorDark: '#cbd5e1', size: '1em', border: 'none' },
                h5: { colorLight: '#475569', colorDark: '#94a3b8', size: '0.875em', border: 'none' },
                h6: { colorLight: '#64748b', colorDark: '#64748b', size: '0.85em', border: 'none' },
                link: { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' },
                strong: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                em: { colorLight: '#0f172a', colorDark: '#f8fafc' },
                code: { colorLight: '#e11d48', colorDark: '#fb7185' },
                blockquote: { colorLight: '#4b5563', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
            }
        }
    ];

    // 호환성을 위해 에메랄드 h5 정상화 보정
    DEFAULT_HEADING_PRESETS[2].styles.h5 = { colorLight: '#064e3b', colorDark: '#ecfdf5', size: '0.9em', border: 'none' };

    let options = {};
    let activeColorInput = null;
    let originalColorValue = null;
    let currentH = 0, currentS = 100, currentV = 100;

    // 모달 드래그 상태 변수
    let dragX = 0;
    let dragY = 0;

    // HSV ↔ RGB ↔ HEX 변환 헬퍼 함수
    function hexToHsv(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        
        let d = max - min;
        s = max === 0 ? 0 : d / max;
        
        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    function hsvToHex(h, s, v) {
        h = ((h % 360) + 360) % 360;
        h /= 360;
        s /= 100;
        v /= 100;
        
        let r = 0, g = 0, b = 0;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        const toHex = x => {
            const val = Math.max(0, Math.min(255, Math.round(x * 255)));
            const hex = val.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // 커스텀 컬러피커 팝오버 초기화 및 마크업 주입
    function initCustomColorPicker() {
        if (document.getElementById('custom-picker-popover')) return;

        const popover = document.createElement('div');
        popover.id = 'custom-picker-popover';
        popover.className = 'custom-picker-popover';
        popover.innerHTML = `
            <div class="custom-picker-header">
                <span class="custom-picker-title">색상 튜닝</span>
                <span class="custom-picker-close-btn" title="변경 취소 및 닫기 [x]">✕</span>
            </div>
            <div class="custom-picker-body">
                <!-- 1. 채도-명도 선택 판 (SV Canvas) -->
                <canvas class="custom-picker-sv-canvas" width="190" height="80"></canvas>
                <!-- 2. 색상 슬라이더 (Hue Slider) -->
                <canvas class="custom-picker-hue-slider" width="190" height="12"></canvas>
                <!-- 3. 프리셋 칩 -->
                <div class="custom-picker-presets">
                    <div class="custom-picker-preset-cell" style="background-color: #1d4ed8;" data-color="#1d4ed8" title="Royal Blue"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #3b82f6;" data-color="#3b82f6" title="Blue"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #0969da;" data-color="#0969da" title="GitHub Blue"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #38bdf8;" data-color="#38bdf8" title="Sky Blue"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #10b981;" data-color="#10b981" title="Emerald"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #059669;" data-color="#059669" title="Green"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #e11d48;" data-color="#e11d48" title="Rose Red"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #fb7185;" data-color="#fb7185" title="Rose Pink"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #0f172a;" data-color="#0f172a" title="Slate 900"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #f8fafc;" data-color="#f8fafc" title="Slate 50"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #4b5563;" data-color="#4b5563" title="Gray 600"></div>
                    <div class="custom-picker-preset-cell" style="background-color: #cbd5e1;" data-color="#cbd5e1" title="Gray 300"></div>
                </div>
                <!-- 구분선 -->
                <div class="custom-picker-divider"></div>
                <!-- 4. 색상 수치 및 반영 & 미니 프리뷰 & 스포이드 -->
                <div class="custom-picker-controls">
                    <button class="custom-picker-dropper-btn" title="화면 색상 추출 (스포이드)">🧪</button>
                    <div class="custom-picker-color-preview" title="현재 선택된 색상 미리보기"></div>
                    <input type="text" class="custom-picker-hex-input" placeholder="#FFFFFF" maxlength="7">
                    <button class="custom-picker-apply-btn" title="색상 반영 및 닫기 [v]">✓ 반영</button>
                </div>
            </div>
        `;
        document.body.appendChild(popover);

        const canvasSV = popover.querySelector('.custom-picker-sv-canvas');
        const ctxSV = canvasSV.getContext('2d');
        const canvasHue = popover.querySelector('.custom-picker-hue-slider');
        const ctxHue = canvasHue.getContext('2d');

        function drawSVCanvas() {
            ctxSV.globalCompositeOperation = 'source-over';
            ctxSV.clearRect(0, 0, canvasSV.width, canvasSV.height);

            ctxSV.fillStyle = hsvToHex(currentH, 100, 100);
            ctxSV.fillRect(0, 0, canvasSV.width, canvasSV.height);

            const gradW = ctxSV.createLinearGradient(0, 0, canvasSV.width, 0);
            gradW.addColorStop(0, '#ffffff');
            gradW.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctxSV.fillStyle = gradW;
            ctxSV.fillRect(0, 0, canvasSV.width, canvasSV.height);

            const gradB = ctxSV.createLinearGradient(0, 0, 0, canvasSV.height);
            gradB.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradB.addColorStop(1, '#000000');
            ctxSV.fillStyle = gradB;
            ctxSV.fillRect(0, 0, canvasSV.width, canvasSV.height);

            const markerX = (currentS / 100) * canvasSV.width;
            const markerY = (1 - (currentV / 100)) * canvasSV.height;
            
            ctxSV.strokeStyle = currentV > 50 && currentS < 50 ? '#000000' : '#ffffff';
            ctxSV.lineWidth = 1.5;
            ctxSV.beginPath();
            ctxSV.arc(markerX, markerY, 4, 0, Math.PI * 2);
            ctxSV.stroke();
        }

        function drawHueSlider() {
            ctxHue.globalCompositeOperation = 'source-over';
            ctxHue.clearRect(0, 0, canvasHue.width, canvasHue.height);

            const gradH = ctxHue.createLinearGradient(0, 0, canvasHue.width, 0);
            gradH.addColorStop(0, '#ff0000');
            gradH.addColorStop(0.17, '#ffff00');
            gradH.addColorStop(0.33, '#00ff00');
            gradH.addColorStop(0.5, '#00ffff');
            gradH.addColorStop(0.67, '#0000ff');
            gradH.addColorStop(0.83, '#ff00ff');
            gradH.addColorStop(1, '#ff0000');

            ctxHue.fillStyle = gradH;
            ctxHue.fillRect(0, 0, canvasHue.width, canvasHue.height);

            const targetX = (currentH / 360) * canvasHue.width;
            ctxHue.strokeStyle = '#ffffff';
            ctxHue.lineWidth = 2;
            ctxHue.beginPath();
            ctxHue.moveTo(targetX, 0);
            ctxHue.lineTo(targetX, canvasHue.height);
            ctxHue.stroke();
        }

        let drawingRequested = false;
        window.refreshCustomPickerDrawings = function() {
            if (drawingRequested) return;
            drawingRequested = true;
            requestAnimationFrame(() => {
                drawSVCanvas();
                drawHueSlider();
                drawingRequested = false;
            });
        };

        function pickSV(e) {
            const rect = canvasSV.getBoundingClientRect();
            const x = Math.max(0, Math.min(canvasSV.width - 1, e.clientX - rect.left));
            const y = Math.max(0, Math.min(canvasSV.height - 1, e.clientY - rect.top));

            currentS = Math.max(0, Math.min(100, Math.round((x / canvasSV.width) * 100)));
            currentV = Math.max(0, Math.min(100, Math.round((1 - (y / canvasSV.height)) * 100)));

            updateColorProgress(hsvToHex(currentH, currentS, currentV));
        }

        function pickHue(e) {
            const rect = canvasHue.getBoundingClientRect();
            const x = Math.max(0, Math.min(canvasHue.width - 1, e.clientX - rect.left));

            currentH = Math.max(0, Math.min(360, Math.round((x / canvasHue.width) * 360)));

            updateColorProgress(hsvToHex(currentH, currentS, currentV));
        }

        let isDraggingSV = false;
        let isDraggingHue = false;

        canvasSV.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDraggingSV = true;
            pickSV(e);
        });

        canvasHue.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDraggingHue = true;
            pickHue(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingSV) pickSV(e);
            if (isDraggingHue) pickHue(e);
        });

        document.addEventListener('mouseup', () => {
            isDraggingSV = false;
            isDraggingHue = false;
        });

        popover.querySelectorAll('.custom-picker-preset-cell').forEach(cell => {
            cell.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const color = e.currentTarget.getAttribute('data-color');
                const hsv = hexToHsv(color);
                currentH = hsv.h;
                currentS = hsv.s;
                currentV = hsv.v;
                updateColorProgress(color);
            });
        });

        const hexInput = popover.querySelector('.custom-picker-hex-input');
        hexInput.addEventListener('input', (e) => {
            let val = e.target.value.trim();
            if (val.length === 7 && /^#[0-9A-Fa-f]{6}$/.test(val)) {
                const hsv = hexToHsv(val);
                currentH = hsv.h;
                currentS = hsv.s;
                currentV = hsv.v;
                updateColorProgress(val);
            }
        });

        const dropperBtn = popover.querySelector('.custom-picker-dropper-btn');
        if (dropperBtn) {
            if (!('EyeDropper' in window)) {
                dropperBtn.style.display = 'none';
            } else {
                dropperBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const eyeDropper = new EyeDropper();
                    eyeDropper.open()
                        .then(result => {
                            const pickedHex = result.sRGBHex.toUpperCase();
                            const hsv = hexToHsv(pickedHex);
                            currentH = hsv.h;
                            currentS = hsv.s;
                            currentV = hsv.v;
                            updateColorProgress(pickedHex);
                        })
                        .catch(err => {
                            console.log('스포이드 컬러 추출 실패/취소:', err);
                        });
                });
            }
        }

        popover.querySelector('.custom-picker-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            cancelColorPicker();
        });

        popover.querySelector('.custom-picker-apply-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            applyColorPicker();
        });

        document.addEventListener('mousedown', (e) => {
            if (popover.style.display === 'block') {
                if (!popover.contains(e.target) && !e.target.closest('label')) {
                    applyColorPicker();
                }
            }
        });
    }

    function showCustomColorPicker(inputElement, labelElement) {
        initCustomColorPicker();
        activeColorInput = inputElement;
        originalColorValue = inputElement.value;

        const hsv = hexToHsv(originalColorValue);
        currentH = hsv.h;
        currentS = hsv.s;
        currentV = hsv.v;

        const popover = document.getElementById('custom-picker-popover');
        popover.querySelector('.custom-picker-hex-input').value = originalColorValue;
        popover.querySelector('.custom-picker-color-preview').style.backgroundColor = originalColorValue;
        popover.style.display = 'block';

        if (window.refreshCustomPickerDrawings) {
            window.refreshCustomPickerDrawings();
        }

        const rect = labelElement.getBoundingClientRect();
        let top = rect.bottom + window.scrollY + 6;
        let left = rect.left + window.scrollX;

        const popoverWidth = 210;
        if (left + popoverWidth > window.innerWidth) {
            left = window.innerWidth - popoverWidth - 10;
        }

        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
    }

    function updateColorProgress(colorHex) {
        if (!activeColorInput) return;
        activeColorInput.value = colorHex;
        activeColorInput.dispatchEvent(new Event('input', { bubbles: true }));

        const popover = document.getElementById('custom-picker-popover');
        if (popover) {
            const hexInput = popover.querySelector('.custom-picker-hex-input');
            if (document.activeElement !== hexInput) {
                hexInput.value = colorHex;
            }
            popover.querySelector('.custom-picker-color-preview').style.backgroundColor = colorHex;
            
            if (window.refreshCustomPickerDrawings) {
                window.refreshCustomPickerDrawings();
            }
        }
        // app.js 측 라이브 프리뷰 업데이트 신호 통지
        if (typeof options.onLivePreview === 'function') {
            options.onLivePreview();
        }
    }

    function applyColorPicker() {
        const popover = document.getElementById('custom-picker-popover');
        if (popover) popover.style.display = 'none';

        if (activeColorInput) {
            activeColorInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        activeColorInput = null;
        originalColorValue = null;

        // 최종 반영된 색상 본문 Live Preview 갱신 동기화
        if (typeof options.onLivePreview === 'function') {
            options.onLivePreview();
        }
    }

    function cancelColorPicker() {
        const popover = document.getElementById('custom-picker-popover');
        if (popover) popover.style.display = 'none';

        if (activeColorInput && originalColorValue) {
            activeColorInput.value = originalColorValue;
            activeColorInput.dispatchEvent(new Event('input', { bubbles: true }));
            activeColorInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        activeColorInput = null;
        originalColorValue = null;

        // 취소 복원된 원래 색상 본문 Live Preview 갱신 동기화 (롤백 실행)
        if (typeof options.onLivePreview === 'function') {
            options.onLivePreview();
        }
    }

    // =========================================================================
    // ⚙️ 공개 인터페이스 노출 객체
    // =========================================================================
    window.StyleEditor = {
        /**
         * 프리셋 초기화 상수 리턴
         */
        getDefaultPresets: function() {
            return JSON.parse(JSON.stringify(DEFAULT_HEADING_PRESETS));
        },

        /**
         * 모달 드래그 오프셋 누적값 및 인라인 스타일 원상 리셋
         */
        resetModalPosition: function() {
            dragX = 0;
            dragY = 0;
            const modalContent = document.querySelector('#heading-modal .modal-content');
            if (modalContent) {
                modalContent.style.transform = '';
            }
        },

        /**
         * 모듈 초기 시동 바인딩
         */
        init: function(opt) {
            options = opt;
            const self = this;

            // 🎨 모달 다이얼로그 마우스 드래그 이동(Draggable) 연동 구현 (CSS transform 기반 무중력 드래그)
            const modalContent = document.querySelector('#heading-modal .modal-content');
            if (modalContent) {
                const header = modalContent.querySelector('.modal-header');
                if (header) {
                    header.style.cursor = 'move';
                    header.addEventListener('mousedown', (e) => {
                        // 닫기 단추(X) 클릭 시에는 드래그 무시
                        if (e.target.closest('.close-modal')) return;
                        
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        
                        const initialX = dragX;
                        const initialY = dragY;
                        
                        function onMouseMove(moveEvent) {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaY = moveEvent.clientY - startY;
                            
                            dragX = initialX + deltaX;
                            dragY = initialY + deltaY;
                            
                            // 기존 layout margin/position 건드리지 않고 transform을 통하여 부드럽고 튐 없는 드래그 연출
                            modalContent.style.transform = `translate(${dragX}px, ${dragY}px)`;
                        }
                        
                        function onMouseUp() {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        }
                        
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    });
                }
            }
 
            // 🎨 모달 다이얼로그 바깥 백드롭 영역 마우스 휠 이벤트 가로채기 & 리디렉션
            const headingModal = document.getElementById('heading-modal');
            if (headingModal) {
                headingModal.addEventListener('wheel', (e) => {
                    const modalContent = headingModal.querySelector('.modal-content');
                    
                    // [1] 다이얼로그 본체 내부에서의 휠 스크롤 -> 완벽히 무시 (scroll block)
                    if (modalContent && modalContent.contains(e.target)) {
                        e.preventDefault();
                        return;
                    }
                    
                    // [2] 다이얼로그 바깥 백드롭 영역 휠 스크롤 -> 전역 프레임 매니저(app.js)에 콜백 방출
                    e.preventDefault();
                    if (options && typeof options.onScroll === 'function') {
                        options.onScroll(e.clientX, e.deltaY);
                    }
                }, { passive: false });
            }

            // 컬러피커 가로채기 마운트
            if (options.controlsContainer) {
                options.controlsContainer.addEventListener('click', (e) => {
                    const targetInput = e.target.closest('input[type="color"]');
                    if (targetInput) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const label = targetInput.closest('label');
                        if (label) {
                            showCustomColorPicker(targetInput, label);
                        }
                    }
                });
            }

            // [1] 세트 저장 버튼 리스너
            const btnSaveOnly = document.getElementById('btn-save-only-heading-preset');
            if (btnSaveOnly) {
                btnSaveOnly.addEventListener('click', () => {
                    const currentId = options.presetSelect ? options.presetSelect.value : 'github_classic';
                    const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
                    const foundIdx = presets.findIndex(p => p.id === currentId);
                    if (foundIdx !== -1) {
                        presets[foundIdx].styles = self.collectCurrentInputs();
                        if (typeof options.savePresetsData === 'function') {
                            options.savePresetsData(presets);
                        }
                        if (typeof options.onSave === 'function') {
                            options.onSave(presets[foundIdx].name);
                        }
                    }
                });
            }

            // [2] 저장 및 적용 (적용 후 닫기) 버튼 리스너
            const btnSaveAndApply = document.getElementById('btn-save-heading-preset');
            if (btnSaveAndApply) {
                btnSaveAndApply.addEventListener('click', () => {
                    const currentId = options.presetSelect ? options.presetSelect.value : 'github_classic';
                    const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
                    const foundIdx = presets.findIndex(p => p.id === currentId);
                    if (foundIdx !== -1) {
                        presets[foundIdx].styles = self.collectCurrentInputs();
                        if (typeof options.savePresetsData === 'function') {
                            options.savePresetsData(presets);
                        }
                        if (typeof options.onSaveAndClose === 'function') {
                            options.onSaveAndClose(presets[foundIdx].name);
                        }
                    }
                });
            }

            // [3] 새 스타일 추가 버튼 리스너
            const btnAdd = document.getElementById('btn-add-heading-preset');
            if (btnAdd) {
                btnAdd.addEventListener('click', () => {
                    const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
                    const currentId = options.presetSelect ? options.presetSelect.value : '';
                    const currentPreset = presets.find(p => p.id === currentId);
                    
                    // 현재 편집 중인 세트 이름에서 숫자 접두사(예: '1. ')를 걷어낸 본문 이름 획득
                    const rawName = currentPreset 
                        ? currentPreset.name.replace(/^\d+\.\s*/, '') 
                        : '새 스타일';
                    const suggestedName = `${rawName} 복사본`;

                    const name = prompt('새로운 Heading Style의 이름을 입력하세요:', suggestedName);
                    if (name && name.trim()) {
                        const newId = 'custom_' + Date.now();
                        
                        // 현재 다이얼로그 입력창들의 실시간 색상/크기 값을 그대로 복제 수집
                        const copiedStyles = self.collectCurrentInputs 
                            ? self.collectCurrentInputs() 
                            : (currentPreset ? JSON.parse(JSON.stringify(currentPreset.styles)) : {});

                        const newPreset = {
                            id: newId,
                            name: `${presets.length + 1}. ${name.trim()}`,
                            styles: copiedStyles
                        };
                        presets.push(newPreset);
                        if (typeof options.savePresetsData === 'function') {
                            options.savePresetsData(presets);
                        }
                        if (typeof options.onAddPreset === 'function') {
                            options.onAddPreset(newId, newPreset.name);
                        }
                    }
                });
            }

            // [4] 세트 삭제 버튼 리스너
            const btnDelete = document.getElementById('btn-delete-heading-preset');
            if (btnDelete) {
                btnDelete.addEventListener('click', () => {
                    const currentId = options.presetSelect ? options.presetSelect.value : '';
                    const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
                    if (presets.length <= 1) {
                        alert('최소 1개의 Heading Style Set은 유지되어야 합니다.');
                        return;
                    }
                    const foundIdx = presets.findIndex(p => p.id === currentId);
                    if (foundIdx !== -1) {
                        if (confirm(`'${presets[foundIdx].name}' 스타일을 삭제하시겠습니까?`)) {
                            const deletedName = presets[foundIdx].name;
                            presets.splice(foundIdx, 1);
                            if (typeof options.savePresetsData === 'function') {
                                options.savePresetsData(presets);
                            }
                            const nextId = presets[0].id;
                            if (typeof options.onDeletePreset === 'function') {
                                options.onDeletePreset(nextId, deletedName);
                            }
                        }
                    }
                });
            }

            // [5] 초기값 복원 버튼 리스너
            const btnReset = document.getElementById('btn-reset-heading-presets');
            if (btnReset) {
                btnReset.addEventListener('click', () => {
                    const currentId = options.presetSelect ? options.presetSelect.value : 'github_classic';
                    const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
                    const defaultPreset = DEFAULT_HEADING_PRESETS.find(p => p.id === currentId);

                    if (defaultPreset) {
                        if (confirm(`'${defaultPreset.name}' 스타일을 초기 기본값으로 복원하시겠습니까?`)) {
                            const foundIdx = presets.findIndex(p => p.id === currentId);
                            if (foundIdx !== -1) {
                                presets[foundIdx] = JSON.parse(JSON.stringify(defaultPreset));
                                if (typeof options.savePresetsData === 'function') {
                                    options.savePresetsData(presets);
                                }
                                if (typeof options.onResetPreset === 'function') {
                                    options.onResetPreset(currentId, defaultPreset.name);
                                }
                            }
                        }
                    } else {
                        alert('기본 제공 5종 프리셋만 초기값 복원이 가능합니다.');
                    }
                });
            }
        },

        /**
         * 특정 프리셋 ID를 기반으로 모달 내부에 입력 컨트롤 폼 렌더링
         */
        renderControls: function(presetId) {
            const container = options.controlsContainer;
            if (!container) return;

            container.innerHTML = '';

            const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
            const found = presets.find(p => p.id === presetId) || presets[0];
            if (!found || !found.styles) return;

            // H1 ~ H6 폼 빌드
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const styleObj = found.styles[tag] || {};
                const colorLight = styleObj.colorLight || styleObj.color || '#1d4ed8';
                const colorDark = styleObj.colorDark || styleObj.color || '#3b82f6';
                const size = styleObj.size || '1em';
                const border = styleObj.border || 'none';

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '6px';
                row.style.padding = '1px 6px'; /* 패딩 수직 압축 */
                row.style.background = 'var(--input-frame-bg)';
                row.style.border = '1px solid var(--border-frame)';
                row.style.borderRadius = '4px';

                row.innerHTML = `
                    <span style="font-weight: 700; width: 42px; font-size: 0.8rem; color: var(--frame-accent-color);"># ${tag.toUpperCase()}</span>
                    <label style="font-size: 0.75rem; color: var(--text-frame-muted);">크기:</label>
                    <input type="text" id="modal-${tag}-size" value="${size}" style="width: 45px; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                    <span style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">색:</span>
                    <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) Heading 색상">
                        ☀️<input type="color" id="modal-${tag}-color-light" value="${colorLight}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                    </label>
                    <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) Heading 색상">
                        🌙<input type="color" id="modal-${tag}-color-dark" value="${colorDark}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                    </label>
                    <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">하단선:</label>
                    <input type="text" id="modal-${tag}-border" value="${border}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                `;
                container.appendChild(row);
            });

            // 🔗 Link 행
            const linkObj = found.styles.link || { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' };
            const linkRow = document.createElement('div');
            linkRow.style.display = 'flex';
            linkRow.style.alignItems = 'center';
            linkRow.style.gap = '6px';
            linkRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            linkRow.style.background = 'var(--input-frame-bg)';
            linkRow.style.border = '1px solid var(--border-frame)';
            linkRow.style.borderRadius = '4px';

            linkRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #38bdf8; display:flex; align-items:center; gap:2px;">🔗 [ 대괄호 링크 ]</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) 대괄호 링크 색상">
                    ☀️<input type="color" id="modal-link-color-light" value="${linkObj.colorLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) 대괄호 링크 색상">
                    🌙<input type="color" id="modal-link-color-dark" value="${linkObj.colorDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">밑줄:</label>
                <select id="modal-link-decoration" style="padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem; flex:1;">
                    <option value="underline" ${linkObj.decoration === 'underline' ? 'selected' : ''}>underline (밑줄 있음)</option>
                    <option value="none" ${linkObj.decoration === 'none' ? 'selected' : ''}>none (밑줄 없음)</option>
                </select>
            `;
            container.appendChild(linkRow);

            // 💪 Strong 행
            const strongObj = found.styles.strong || { colorLight: '#0f172a', colorDark: '#f8fafc' };
            const strongRow = document.createElement('div');
            strongRow.style.display = 'flex';
            strongRow.style.alignItems = 'center';
            strongRow.style.gap = '6px';
            strongRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            strongRow.style.background = 'var(--input-frame-bg)';
            strongRow.style.border = '1px solid var(--border-frame)';
            strongRow.style.borderRadius = '4px';

            strongRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #f59e0b; display:flex; align-items:center; gap:2px;"><strong style="font-size:0.85rem; font-weight:800; font-family:serif; margin-right:6px;">B</strong> ** 굵게 **</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 굵게 글자 색상">
                    ☀️<input type="color" id="modal-strong-color-light" value="${strongObj.colorLight || '#0f172a'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 굵게 글자 색상">
                    🌙<input type="color" id="modal-strong-color-dark" value="${strongObj.colorDark || '#f8fafc'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
            `;
            container.appendChild(strongRow);

            // ✍️ Em (이탤릭) 행
            const emObj = found.styles.em || { colorLight: '#0f172a', colorDark: '#f8fafc' };
            const emRow = document.createElement('div');
            emRow.style.display = 'flex';
            emRow.style.alignItems = 'center';
            emRow.style.gap = '6px';
            emRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            emRow.style.background = 'var(--input-frame-bg)';
            emRow.style.border = '1px solid var(--border-frame)';
            emRow.style.borderRadius = '4px';

            emRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #eab308; display:flex; align-items:center; gap:2px;"><em style="font-size:0.85rem; font-style:italic; font-family:serif; margin-right:6px;">I</em> * 기울임 *</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 기울임 글자 색상">
                    ☀️<input type="color" id="modal-em-color-light" value="${emObj.colorLight || '#0f172a'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 기울임 글자 색상">
                    🌙<input type="color" id="modal-em-color-dark" value="${emObj.colorDark || '#f8fafc'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
            `;
            container.appendChild(emRow);

            // 💻 Code (인라인 코드) 행
            const codeObj = found.styles.code || { colorLight: '#0969da', colorDark: '#38bdf8' };
            const codeRow = document.createElement('div');
            codeRow.style.display = 'flex';
            codeRow.style.alignItems = 'center';
            codeRow.style.gap = '6px';
            codeRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            codeRow.style.background = 'var(--input-frame-bg)';
            codeRow.style.border = '1px solid var(--border-frame)';
            codeRow.style.borderRadius = '4px';

            codeRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #ec4899; display:flex; align-items:center; gap:2px;">💻 \` Inline code \`</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 Inline Code 색상">
                    ☀️<input type="color" id="modal-code-color-light" value="${codeObj.colorLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 Inline Code 색상">
                    🌙<input type="color" id="modal-code-color-dark" value="${codeObj.colorDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
            `;
            container.appendChild(codeRow);

            // 💬 Blockquote (인용문) 행
            const bqObj = found.styles.blockquote || { colorLight: '#4b5563', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' };
            const bqRow = document.createElement('div');
            bqRow.style.display = 'flex';
            bqRow.style.alignItems = 'center';
            bqRow.style.gap = '6px';
            bqRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            bqRow.style.background = 'var(--input-frame-bg)';
            bqRow.style.border = '1px solid var(--border-frame)';
            bqRow.style.borderRadius = '4px';

            bqRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #a855f7; display:flex; align-items:center; gap:2px;">💬 > 인용문</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">글자:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 인용문 글자 색상">
                    ☀️<input type="color" id="modal-blockquote-color-light" value="${bqObj.colorLight || '#4b5563'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 인용문 글자 색상">
                    🌙<input type="color" id="modal-blockquote-color-dark" value="${bqObj.colorDark || '#cbd5e1'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 4px;">들여쓰기 막대:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 인용문 들여쓰기 막대 색상">
                    ☀️<input type="color" id="modal-blockquote-border-light" value="${bqObj.borderLight || '#0969da'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 인용문 들여쓰기 막대 색상">
                    🌙<input type="color" id="modal-blockquote-border-dark" value="${bqObj.borderDark || '#38bdf8'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
            `;
            container.appendChild(bqRow);

            // ➖ Line (선 색상/구분선) 행
            const lineObj = found.styles.line || { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' };
            const lineRow = document.createElement('div');
            lineRow.style.display = 'flex';
            lineRow.style.alignItems = 'center';
            lineRow.style.gap = '6px';
            lineRow.style.padding = '1px 6px'; /* 패딩 수직 압축 */
            lineRow.style.background = 'var(--input-frame-bg)';
            lineRow.style.border = '1px solid var(--border-frame)';
            lineRow.style.borderRadius = '4px';

            lineRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #10b981; display:flex; align-items:center; gap:2px;">➖ --- line 구분선</span>
                <span style="font-size: 0.75rem; color: var(--text-frame-muted);">색:</span>
                <label style="font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="라이트 모드 (White 배경) 선 색상">
                    ☀️<input type="color" id="modal-line-color-light" value="${lineObj.colorLight || '#cbd5e1'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="다크 모드 (Dark 배경) 선 색상">
                    🌙<input type="color" id="modal-line-color-dark" value="${lineObj.colorDark || '#334155'}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;">
                </label>
                <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">선 스타일:</label>
                <input type="text" id="modal-line-border" value="${lineObj.border || '1px solid #334155'}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
            `;
            container.appendChild(lineRow);
        },

        /**
         * 현재 모달 내부 HTML 폼들로부터 최신 입력 값들을 수집해 스타일 객체로 빌드
         */
        collectCurrentInputs: function() {
            const styles = {};

            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const colorLightEl = document.getElementById(`modal-${tag}-color-light`);
                const colorDarkEl = document.getElementById(`modal-${tag}-color-dark`);
                const sizeEl = document.getElementById(`modal-${tag}-size`);
                const borderEl = document.getElementById(`modal-${tag}-border`);
                if (colorLightEl && colorDarkEl && sizeEl && borderEl) {
                    styles[tag] = {
                        colorLight: colorLightEl.value,
                        colorDark: colorDarkEl.value,
                        size: sizeEl.value,
                        border: borderEl.value
                    };
                }
            });

            // 🔗 Link 수거
            const linkLight = document.getElementById('modal-link-color-light');
            const linkDark = document.getElementById('modal-link-color-dark');
            const linkDeco = document.getElementById('modal-link-decoration');
            if (linkLight && linkDark && linkDeco) {
                styles.link = {
                    colorLight: linkLight.value,
                    colorDark: linkDark.value,
                    decoration: linkDeco.value
                };
            }

            // 💪 Strong 수거
            const strongLight = document.getElementById('modal-strong-color-light');
            const strongDark = document.getElementById('modal-strong-color-dark');
            if (strongLight && strongDark) {
                styles.strong = {
                    colorLight: strongLight.value,
                    colorDark: strongDark.value
                };
            }

            // ✍️ Em 수거
            const emLight = document.getElementById('modal-em-color-light');
            const emDark = document.getElementById('modal-em-color-dark');
            if (emLight && emDark) {
                styles.em = {
                    colorLight: emLight.value,
                    colorDark: emDark.value
                };
            }

            // 💻 Code 수거
            const codeLight = document.getElementById('modal-code-color-light');
            const codeDark = document.getElementById('modal-code-color-dark');
            if (codeLight && codeDark) {
                styles.code = {
                    colorLight: codeLight.value,
                    colorDark: codeDark.value
                };
            }

            // 💬 Blockquote 수거
            const bqLight = document.getElementById('modal-blockquote-color-light');
            const bqDark = document.getElementById('modal-blockquote-color-dark');
            const bqBorderLight = document.getElementById('modal-blockquote-border-light');
            const bqBorderDark = document.getElementById('modal-blockquote-border-dark');
            if (bqLight && bqDark && bqBorderLight && bqBorderDark) {
                styles.blockquote = {
                    colorLight: bqLight.value,
                    colorDark: bqDark.value,
                    borderLight: bqBorderLight.value,
                    borderDark: bqBorderDark.value
                };
            }

            // ➖ Line 수거
            const lineLight = document.getElementById('modal-line-color-light');
            const lineDark = document.getElementById('modal-line-color-dark');
            const lineBorder = document.getElementById('modal-line-border');
            if (lineLight && lineDark && lineBorder) {
                styles.line = {
                    colorLight: lineLight.value,
                    colorDark: lineDark.value,
                    border: lineBorder.value
                };
            }

            return styles;
        }
    };
})();
