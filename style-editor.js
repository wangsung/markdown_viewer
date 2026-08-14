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
                codeblock: { colorLight: '#24292e', colorDark: '#f8fafc', bgLight: '#f6f8fa', bgDark: '#0f172a' },
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
                codeblock: { colorLight: '#0369a1', colorDark: '#e0f2fe', bgLight: '#e0f2fe', bgDark: '#0c4a6e' },
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
                h5: { colorLight: '#064e3b', colorDark: '#ecfdf5', size: '0.9em', border: 'none' },
                h6: { colorLight: '#334155', colorDark: '#f8fafc', size: '0.85em', border: 'none' },
                link: { colorLight: '#059669', colorDark: '#34d399', decoration: 'none' },
                strong: { colorLight: '#047857', colorDark: '#34d399' },
                em: { colorLight: '#059669', colorDark: '#6ee7b7' },
                code: { colorLight: '#059669', colorDark: '#34d399' },
                codeblock: { colorLight: '#047857', colorDark: '#d1fae5', bgLight: '#d1fae5', bgDark: '#064e3b' },
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
                codeblock: { colorLight: '#be123c', colorDark: '#ffe4e6', bgLight: '#ffe4e6', bgDark: '#881337' },
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
                codeblock: { colorLight: '#6d28d9', colorDark: '#ede9fe', bgLight: '#ede9fe', bgDark: '#4c1d95' },
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
                codeblock: { colorLight: '#24292e', colorDark: '#f8fafc', bgLight: '#f6f8fa', bgDark: '#0f172a' },
                blockquote: { colorLight: '#4b5563', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' },
                line: { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' }
            }
        }
    ];

    // 2. Table 컨트롤 헤더 아이콘 상수 객체
    const TABLE_ICONS = {
        border: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></span>',
        headerBorder: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="18" x2="21" y2="18"></line><rect x="3" y="4" width="18" height="10" rx="1"></rect></svg></span>',
        rowBorder: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="20" x2="21" y2="20"></line><rect x="3" y="4" width="18" height="12" rx="1"></rect></svg></span>',
        thBadge: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center; font-size:0.65rem; font-weight:800; padding:1px 0; background:#0284c7; color:#ffffff; border-radius:3px; font-family:monospace; line-height:1.1;">TH</span>',
        trBadge: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center; font-size:0.65rem; font-weight:800; padding:1px 0; background:#f8fafc; color:#0f172a; border-radius:3px; font-family:monospace; line-height:1.1;">TR</span>',
        tr2Badge: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center; font-size:0.65rem; font-weight:800; padding:1px 0; background:#38bdf8; color:#0f172a; border-radius:3px; font-family:monospace; line-height:1.1;">TR2</span>',
        hover: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="6"></rect><line x1="12" y1="7" x2="12" y2="11"></line></svg></span>',
        tdBadge: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center; font-size:0.65rem; font-weight:800; padding:1px 0; background:#f59e0b; color:#0f172a; border-radius:3px; font-family:monospace; line-height:1.1;">TD</span>',
        align: '<span style="display:inline-flex; width:28px; justify-content:center; align-items:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><polyline points="8 7 12 3 16 7"></polyline><polyline points="8 17 12 21 16 17"></polyline></svg></span>'
    };


    // -------------------------------------------------------------------------
    // 🛠️ 순수 서브 함수 (snake_case)
    // -------------------------------------------------------------------------
    function create_form_row(extraCss = '') {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:6px; padding:1px 6px; background:var(--input-frame-bg); border:1px solid var(--border-frame); border-radius:4px;' + (extraCss ? ' ' + extraCss : '');
        return row;
    }

    function build_table_section_header(title, iconHtml) {
        return `<span style="font-weight:700; width:135px; font-size:0.76rem; color:#f8fafc; display:flex; align-items:center; gap:6px;">${iconHtml}<span>${title}</span></span>`;
    }

    function build_color_picker_html(id, mode, value, title = '') {
        const isLight = mode === 'light';
        const icon = isLight ? '☀️' : '🌙';
        const styleStr = isLight
            ? 'font-size: 0.72rem; color: #0f172a; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; gap:3px; cursor:pointer;'
            : 'font-size: 0.72rem; color: #f8fafc; background: #0f172a; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; display:inline-flex; align-items:center; gap:3px; cursor:pointer;';
        const titleAttr = title ? ` title="${title}"` : '';
        return `<label style="${styleStr}"${titleAttr}>${icon}<input type="color" id="${id}" value="${value}" style="width:18px; height:18px; border:none; background:none; cursor:pointer; padding:0;"></label>`;
    }

    function build_color_pair_html(baseId, valLight, valDark, opts = {}) {
        const labelText = opts.labelText !== undefined ? opts.labelText : '색:';
        const lightTitle = opts.lightTitle || '';
        const darkTitle = opts.darkTitle || '';
        const labelStyle = 'font-size:0.75rem; color:var(--text-frame-muted);' + (opts.labelMargin ? ` margin-left:${opts.labelMargin};` : '');
        const labelHtml = labelText ? `<span style="${labelStyle}">${labelText}</span>` : '';
        const lightPicker = build_color_picker_html(`${baseId}-light`, 'light', valLight, lightTitle);
        const darkPicker = build_color_picker_html(`${baseId}-dark`, 'dark', valDark, darkTitle);
        return `${labelHtml}${lightPicker}${darkPicker}`;
    }

    function bind_toggle_picker(triggerSelector, targetId, isRadio = false) {
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        if (isRadio) {
            const radios = document.querySelectorAll(triggerSelector);
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const isCustom = e.target.value === 'custom';
                    targetEl.style.opacity = isCustom ? '1' : '0.35';
                    targetEl.style.pointerEvents = isCustom ? 'auto' : 'none';
                    if (typeof options.onLivePreview === 'function') {
                        options.onLivePreview();
                    }
                });
            });
        } else {
            const chkEl = document.querySelector(triggerSelector) || document.getElementById(triggerSelector);
            if (chkEl) {
                chkEl.addEventListener('change', (e) => {
                    const isActive = e.target.checked;
                    targetEl.style.opacity = isActive ? '1' : '0.35';
                    targetEl.style.pointerEvents = isActive ? 'auto' : 'none';
                    if (typeof options.onLivePreview === 'function') {
                        options.onLivePreview();
                    }
                });
            }
        }
    }

    function save_current_preset_action(self, callbackName) {
        const currentId = options.presetSelect ? options.presetSelect.value : 'github_classic';
        const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
        const foundIdx = presets.findIndex(p => p.id === currentId);
        if (foundIdx !== -1) {
            presets[foundIdx].styles = self.collectCurrentInputs();
            if (typeof options.savePresetsData === 'function') {
                options.savePresetsData(presets);
            }
            if (typeof options[callbackName] === 'function') {
                options[callbackName](presets[foundIdx].name);
            }
        }
    }

    function get_input_color_pair(baseId) {
        const lightEl = document.getElementById(`${baseId}-light`);
        const darkEl = document.getElementById(`${baseId}-dark`);
        if (lightEl && darkEl) {
            return { colorLight: lightEl.value, colorDark: darkEl.value };
        }
        return null;
    }

    let options = {};
    let activeTab = 'text'; // 'text' | 'table'
    let activeColorInput = null;
    let originalColorValue = null;
    let currentH = 0, currentS = 100, currentV = 100;

    // 모달 드래그 및 높이 동기화 상태 변수
    let dragX = 0;
    let dragY = 0;
    let maxControlsHeight = 365;

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
         * 모달 다이얼로그 띄우기 (Open Modal)
         */
        openModal: function(presetId) {
            const headingModal = document.getElementById('heading-modal');
            if (headingModal) {
                if (presetId) {
                    this.renderControls(presetId);
                }
                headingModal.style.display = 'block';
            }
        },

        /**
         * 모달 다이얼로그 닫기 (Close Modal)
         */
        closeModal: function() {
            const headingModal = document.getElementById('heading-modal');
            if (headingModal) {
                headingModal.style.display = 'none';
                this.resetModalPosition();
            }
        },

        /**
         * 모듈 초기 시동 바인딩
         */
        init: function(opt) {
            options = opt || {};
            if (options.elements) {
                if (options.elements.headingStyleControls && !options.controlsContainer) {
                    options.controlsContainer = options.elements.headingStyleControls;
                }
                if (options.elements.modalHeadingSelect && !options.presetSelect) {
                    options.presetSelect = options.elements.modalHeadingSelect;
                }
            }
            const self = this;

            // 🎨 닫기 버튼 이벤트 바인딩
            const closeHeadingModal = document.getElementById('close-heading-modal');
            const btnCloseHeadingModal = document.getElementById('btn-close-heading-modal');
            if (closeHeadingModal) {
                closeHeadingModal.addEventListener('click', () => self.closeModal());
            }
            if (btnCloseHeadingModal) {
                btnCloseHeadingModal.addEventListener('click', () => self.closeModal());
            }

            // 🎨 탭 스위처 바인딩
            const tabBtnText = document.getElementById('tab-btn-text');
            const tabBtnTable = document.getElementById('tab-btn-table');
            if (tabBtnText && tabBtnTable) {
                tabBtnText.addEventListener('click', () => {
                    if (activeTab === 'text') return;
                    activeTab = 'text';
                    tabBtnText.classList.add('active');
                    tabBtnTable.classList.remove('active');
                    const currentId = options.presetSelect ? options.presetSelect.value : '';
                    self.renderControls(currentId);
                });

                tabBtnTable.addEventListener('click', () => {
                    if (activeTab === 'table') return;
                    activeTab = 'table';
                    tabBtnTable.classList.add('active');
                    tabBtnText.classList.remove('active');
                    const currentId = options.presetSelect ? options.presetSelect.value : '';
                    self.renderControls(currentId);
                });
            }

            // 🎨 모달 다이얼로그 마우스 드래그 이동(Draggable) 연동 구현 (CSS transform 기반 무중력 드래그)
            document.addEventListener('mousedown', (e) => {
                const header = e.target.closest('#heading-modal .modal-header');
                if (!header) return;
                // 닫기 단추(X), Select 선택상자, 버튼, 팝오버 메뉴 클릭 시에는 드래그 무시
                if (e.target.closest('.close-modal, select, button, .preset-more-menu')) return;

                const modalContent = document.querySelector('#heading-modal .modal-content');
                if (!modalContent) return;

                header.style.cursor = 'move';
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

            // 컬러피커 가로채기 마운트 및 전체 컨트롤 실시간 미리보기 (Live Preview) 연동
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

                options.controlsContainer.addEventListener('change', () => {
                    if (typeof options.onLivePreview === 'function') {
                        options.onLivePreview();
                    }
                });

                options.controlsContainer.addEventListener('input', () => {
                    if (typeof options.onLivePreview === 'function') {
                        options.onLivePreview();
                    }
                });
            }

            // [1] 세트 저장 버튼 리스너
            const btnSaveOnly = document.getElementById('btn-save-only-heading-preset');
            if (btnSaveOnly) {
                btnSaveOnly.addEventListener('click', () => {
                    save_current_preset_action(self, 'onSave');
                });
            }

            // [2] 저장 및 적용 (적용 후 닫기) 버튼 리스너
            const btnSaveAndApply = document.getElementById('btn-save-heading-preset');
            if (btnSaveAndApply) {
                btnSaveAndApply.addEventListener('click', () => {
                    save_current_preset_action(self, 'onSaveAndClose');
                });
            }

            // [2-1] 프리셋 더보기 옵션 (점 3개) 팝오버 리스너
            const btnMore = document.getElementById('btn-preset-more');
            const menuMore = document.getElementById('preset-more-menu');
            if (btnMore && menuMore) {
                btnMore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menuMore.style.display === 'block';
                    menuMore.style.display = isOpen ? 'none' : 'block';
                });

                document.addEventListener('click', (e) => {
                    if (menuMore && !menuMore.contains(e.target) && e.target !== btnMore) {
                        menuMore.style.display = 'none';
                    }
                });
            }

            // [3] 새 스타일 추가 버튼 리스너
            const btnAdd = document.getElementById('btn-add-heading-preset');
            if (btnAdd) {
                btnAdd.addEventListener('click', () => {
                    if (menuMore) menuMore.style.display = 'none';
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
                    if (menuMore) menuMore.style.display = 'none';
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

            if (activeTab === 'table') {
                this.renderTableControls(found);
            } else {
                this.renderTextControls(found);
            }
        },

        renderTextControls: function(found) {
            const container = options.controlsContainer;
            if (!container) return;

            // H1 ~ H6 폼 빌드
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const styleObj = found.styles[tag] || {};
                const colorLight = styleObj.colorLight || styleObj.color || '#1d4ed8';
                const colorDark = styleObj.colorDark || styleObj.color || '#3b82f6';
                const size = styleObj.size || '1em';
                const border = styleObj.border || 'none';

                const row = create_form_row();
                row.innerHTML = `
                    <span style="font-weight: 700; width: 42px; font-size: 0.8rem; color: var(--frame-accent-color);"># ${tag.toUpperCase()}</span>
                    <label style="font-size: 0.75rem; color: var(--text-frame-muted);">크기:</label>
                    <input type="text" id="modal-${tag}-size" value="${size}" style="width: 45px; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                    ${build_color_pair_html(`modal-${tag}-color`, colorLight, colorDark, { lightTitle: '라이트 모드 (White 배경) Heading 색상', darkTitle: '다크 모드 (Dark 배경) Heading 색상', labelMargin: '2px' })}
                    <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">하단선:</label>
                    <input type="text" id="modal-${tag}-border" value="${border}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                `;
                container.appendChild(row);
            });

            // 🔗 Link 행
            const linkObj = found.styles.link || { colorLight: '#0969da', colorDark: '#38bdf8', decoration: 'underline' };
            const linkRow = create_form_row();
            linkRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #38bdf8; display:flex; align-items:center; gap:2px;">🔗 [ 대괄호 링크 ]</span>
                ${build_color_pair_html('modal-link-color', linkObj.colorLight || '#0969da', linkObj.colorDark || '#38bdf8', { lightTitle: '라이트 모드 (White 배경) 대괄호 링크 색상', darkTitle: '다크 모드 (Dark 배경) 대괄호 링크 색상' })}
                <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">밑줄:</label>
                <select id="modal-link-decoration" style="padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem; flex:1;">
                    <option value="underline" ${linkObj.decoration === 'underline' ? 'selected' : ''}>underline (밑줄 있음)</option>
                    <option value="none" ${linkObj.decoration === 'none' ? 'selected' : ''}>none (밑줄 없음)</option>
                </select>
            `;
            container.appendChild(linkRow);

            // 💪 Strong 행
            const strongObj = found.styles.strong || { colorLight: '#0f172a', colorDark: '#f8fafc' };
            const strongRow = create_form_row();
            strongRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #f59e0b; display:flex; align-items:center; gap:2px;"><strong style="font-size:0.85rem; font-weight:800; font-family:serif; margin-right:6px;">B</strong> ** 굵게 **</span>
                ${build_color_pair_html('modal-strong-color', strongObj.colorLight || '#0f172a', strongObj.colorDark || '#f8fafc', { lightTitle: '라이트 모드 굵게 글자 색상', darkTitle: '다크 모드 굵게 글자 색상' })}
            `;
            container.appendChild(strongRow);

            // ✍️ Em (이탤릭) 행
            const emObj = found.styles.em || { colorLight: '#0f172a', colorDark: '#f8fafc' };
            const emRow = create_form_row();
            emRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #eab308; display:flex; align-items:center; gap:2px;"><em style="font-size:0.85rem; font-style:italic; font-family:serif; margin-right:6px;">I</em> * 기울임 *</span>
                ${build_color_pair_html('modal-em-color', emObj.colorLight || '#0f172a', emObj.colorDark || '#f8fafc', { lightTitle: '라이트 모드 기울임 글자 색상', darkTitle: '다크 모드 기울임 글자 색상' })}
            `;
            container.appendChild(emRow);

            // 📦 Code block 행
            const cbObj = found.styles.codeblock || { colorLight: '#24292e', colorDark: '#f8fafc', bgLight: '#f6f8fa', bgDark: '#0f172a' };
            const cbRow = create_form_row();
            cbRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #ec4899; display:flex; align-items:center; gap:2px;">💻 \`\`\` Code block \`\`\`</span>
                ${build_color_pair_html('modal-codeblock-color', cbObj.colorLight || '#24292e', cbObj.colorDark || '#f8fafc', { labelText: '글자:', lightTitle: '라이트 모드 Code Block 글자 색상', darkTitle: '다크 모드 Code Block 글자 색상' })}
                ${build_color_pair_html('modal-codeblock-bg', cbObj.bgLight || '#f6f8fa', cbObj.bgDark || '#0f172a', { labelText: '배경:', labelMargin: '4px', lightTitle: '라이트 모드 Code Block 배경 색상', darkTitle: '다크 모드 Code Block 배경 색상' })}
            `;
            container.appendChild(cbRow);

            // 💬 Blockquote (인용문) 행
            const bqObj = found.styles.blockquote || { colorLight: '#4b5563', colorDark: '#cbd5e1', borderLight: '#0969da', borderDark: '#38bdf8' };
            const bqRow = create_form_row();
            bqRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #a855f7; display:flex; align-items:center; gap:2px;">💬 > 인용문</span>
                ${build_color_pair_html('modal-blockquote-color', bqObj.colorLight || '#4b5563', bqObj.colorDark || '#cbd5e1', { labelText: '글자:', lightTitle: '라이트 모드 인용문 글자 색상', darkTitle: '다크 모드 인용문 글자 색상' })}
                ${build_color_pair_html('modal-blockquote-border', bqObj.borderLight || '#0969da', bqObj.borderDark || '#38bdf8', { labelText: '들여쓰기 막대:', labelMargin: '4px', lightTitle: '라이트 모드 인용문 들여쓰기 막대 색상', darkTitle: '다크 모드 인용문 들여쓰기 막대 색상' })}
            `;
            container.appendChild(bqRow);

            // ➖ Line (선 색상/구분선) 행
            const lineObj = found.styles.line || { colorLight: '#cbd5e1', colorDark: '#334155', border: '1px solid #334155' };
            const lineRow = create_form_row();
            lineRow.innerHTML = `
                <span style="font-weight: 700; width: 140px; font-size: 0.76rem; color: #10b981; display:flex; align-items:center; gap:2px;">➖ --- line 구분선</span>
                ${build_color_pair_html('modal-line-color', lineObj.colorLight || '#cbd5e1', lineObj.colorDark || '#334155', { lightTitle: '라이트 모드 (White 배경) 선 색상', darkTitle: '다크 모드 (Dark 배경) 선 색상' })}
                <label style="font-size: 0.75rem; color: var(--text-frame-muted); margin-left: 2px;">선 스타일:</label>
                <input type="text" id="modal-line-border" value="${lineObj.border || '1px solid #334155'}" placeholder="1px solid #334155" style="flex:1; padding: 2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
            `;
            container.appendChild(lineRow);
        },

        renderTableControls: function(found) {
            const container = options.controlsContainer;
            if (!container) return;

            const tableObj = found.styles && found.styles.table ? found.styles.table : {
                headerColorLight: '#0f172a',
                headerColorDark: '#f8fafc',
                headerBgLight: '#f1f5f9',
                headerBgDark: '#1e293b',
                rowBgTransparent: true,
                rowBgLight: '#ffffff',
                rowBgDark: '#0f172a',
                stripeEnabled: true,
                stripeBgLight: '#f8fafc',
                stripeBgDark: '#1e293b',
                hoverEnabled: true,
                hoverBgLight: '#e2e8f0',
                hoverBgDark: '#334155',
                borderColorLight: '#cbd5e1',
                borderColorDark: '#334155',
                borderStyle: '1px solid',
                padding: 'normal',
                verticalAlign: 'middle'
            };

            // [1] 표 테두리 행 (맨 위)
            const isTableBorder = tableObj.borderEnabled !== false;
            const borderRow = create_form_row();
            borderRow.innerHTML = `
                ${build_table_section_header('표 테두리', TABLE_ICONS.border)}
                <label style="font-size:0.75rem; color:#f8fafc; display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="checkbox" id="modal-table-border-enabled" ${isTableBorder ? 'checked' : ''}> 테두리
                </label>
                <div id="modal-table-border-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${!isTableBorder ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-border-color', tableObj.borderColorLight || '#cbd5e1', tableObj.borderColorDark || '#334155', { labelText: '선 색:', lightTitle: '라이트 모드 테두리 색상', darkTitle: '다크 모드 테두리 색상' })}
                    <span style="font-size:0.75rem; color:var(--text-frame-muted); margin-left:4px;">선 스타일:</span>
                    <select id="modal-table-border-style" style="flex:1; padding:2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                        <option value="none" ${tableObj.borderStyle === 'none' ? 'selected' : ''}>없음 ( none )</option>
                        <option value="1px solid" ${tableObj.borderStyle === '1px solid' || !tableObj.borderStyle ? 'selected' : ''}>가는 선 ( 1px solid )</option>
                        <option value="1px dashed" ${tableObj.borderStyle === '1px dashed' ? 'selected' : ''}>점선 ( 1px dashed )</option>
                        <option value="2px solid" ${tableObj.borderStyle === '2px solid' ? 'selected' : ''}>굵은 선 ( 2px solid )</option>
                        <option value="2px dashed" ${tableObj.borderStyle === '2px dashed' ? 'selected' : ''}>굵은 점선 ( 2px dashed )</option>
                    </select>
                </div>
            `;
            container.appendChild(borderRow);

            // [2] TH 표 머리 구분선 행 (2번째)
            const isHeaderBorder = tableObj.headerBorderEnabled !== false;
            const thBorderRow = create_form_row();
            thBorderRow.innerHTML = `
                ${build_table_section_header('표 머리 구분선', TABLE_ICONS.headerBorder)}
                <label style="font-size:0.75rem; color:#f8fafc; display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="checkbox" id="modal-table-header-border-enabled" ${isHeaderBorder ? 'checked' : ''}> 구분선
                </label>
                <div id="modal-table-header-border-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${!isHeaderBorder ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-header-border-color', tableObj.headerBorderColorLight || '#f43f5e', tableObj.headerBorderColorDark || '#f43f5e', { labelText: '선 색:', lightTitle: '라이트 모드 표 머리 구분선 색상', darkTitle: '다크 모드 표 머리 구분선 색상' })}
                    <span style="font-size:0.75rem; color:var(--text-frame-muted); margin-left:4px;">선 스타일:</span>
                    <select id="modal-table-header-border-style" style="flex:1; padding:2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                        <option value="none" ${tableObj.headerBorderStyle === 'none' ? 'selected' : ''}>없음 ( none )</option>
                        <option value="1px solid" ${tableObj.headerBorderStyle === '1px solid' ? 'selected' : ''}>가는 선 ( 1px solid )</option>
                        <option value="1px dashed" ${tableObj.headerBorderStyle === '1px dashed' ? 'selected' : ''}>점선 ( 1px dashed )</option>
                        <option value="2px solid" ${tableObj.headerBorderStyle === '2px solid' || !tableObj.headerBorderStyle ? 'selected' : ''}>굵은 선 ( 2px solid )</option>
                        <option value="2px dashed" ${tableObj.headerBorderStyle === '2px dashed' ? 'selected' : ''}>굵은 점선 ( 2px dashed )</option>
                    </select>
                </div>
            `;
            container.appendChild(thBorderRow);

            // [3] 행 구분선 행 (3번째)
            const isRowBorder = tableObj.rowBorderEnabled !== false;
            const rowBorderRow = create_form_row();
            rowBorderRow.innerHTML = `
                ${build_table_section_header('행 구분선', TABLE_ICONS.rowBorder)}
                <label style="font-size:0.75rem; color:#f8fafc; display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="checkbox" id="modal-table-row-border-enabled" ${isRowBorder ? 'checked' : ''}> 구분선
                </label>
                <div id="modal-table-row-border-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${!isRowBorder ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-row-border-color', tableObj.rowBorderColorLight || '#cbd5e1', tableObj.rowBorderColorDark || '#334155', { labelText: '선 색:', lightTitle: '라이트 모드 행 구분선 색상', darkTitle: '다크 모드 행 구분선 색상' })}
                    <span style="font-size:0.75rem; color:var(--text-frame-muted); margin-left:4px;">선 스타일:</span>
                    <select id="modal-table-row-border-style" style="flex:1; padding:2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                        <option value="none" ${tableObj.rowBorderStyle === 'none' ? 'selected' : ''}>없음 ( none )</option>
                        <option value="1px solid" ${tableObj.rowBorderStyle === '1px solid' || !tableObj.rowBorderStyle ? 'selected' : ''}>가는 선 ( 1px solid )</option>
                        <option value="1px dashed" ${tableObj.rowBorderStyle === '1px dashed' ? 'selected' : ''}>점선 ( 1px dashed )</option>
                        <option value="2px solid" ${tableObj.rowBorderStyle === '2px solid' ? 'selected' : ''}>굵은 선 ( 2px solid )</option>
                        <option value="2px dashed" ${tableObj.rowBorderStyle === '2px dashed' ? 'selected' : ''}>굵은 점선 ( 2px dashed )</option>
                    </select>
                </div>
            `;
            container.appendChild(rowBorderRow);

            // [4] TH 표 머리글 행 (4번째)
            const thRow = create_form_row();
            thRow.innerHTML = `
                ${build_table_section_header('표 머리글', TABLE_ICONS.thBadge)}
                ${build_color_pair_html('modal-table-header-color', tableObj.headerColorLight || '#0f172a', tableObj.headerColorDark || '#f8fafc', { labelText: '글자:', lightTitle: '라이트 모드 TH 글자색', darkTitle: '다크 모드 TH 글자색' })}
                ${build_color_pair_html('modal-table-header-bg', tableObj.headerBgLight || '#f1f5f9', tableObj.headerBgDark || '#1e293b', { labelText: '배경:', labelMargin: '4px', lightTitle: '라이트 모드 TH 배경색', darkTitle: '다크 모드 TH 배경색' })}
            `;
            container.appendChild(thRow);

            // [5] 행 배경 행 (TR 역상)
            const isRowTrans = tableObj.rowBgTransparent !== false;
            const rowBgRow = create_form_row();
            rowBgRow.innerHTML = `
                ${build_table_section_header('행 배경', TABLE_ICONS.trBadge)}
                <label style="font-size:0.75rem; color:#f8fafc; display:inline-flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="radio" name="modal-table-row-bg-mode" value="transparent" ${isRowTrans ? 'checked' : ''}> 투명 (문서 배경색)
                </label>
                <label style="font-size:0.75rem; color:#f8fafc; display:inline-flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; margin-left:4px;">
                    <input type="radio" name="modal-table-row-bg-mode" value="custom" ${!isRowTrans ? 'checked' : ''}> 배경:
                </label>
                <div id="modal-table-row-bg-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${isRowTrans ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-row-bg', tableObj.rowBgLight || '#ffffff', tableObj.rowBgDark || '#0f172a', { labelText: '', lightTitle: '라이트 모드 행 배경색', darkTitle: '다크 모드 행 배경색' })}
                </div>
            `;
            container.appendChild(rowBgRow);

            // [6] 짝수 행 배경 행 (TR2)
            const isStripe = tableObj.stripeEnabled !== false;
            const stripeRow = create_form_row();
            stripeRow.innerHTML = `
                ${build_table_section_header('짝수 행 배경', TABLE_ICONS.tr2Badge)}
                <label style="font-size:0.75rem; color:#f8fafc; display:inline-flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="radio" name="modal-table-stripe-mode" value="standard" ${!isStripe ? 'checked' : ''}> 반투명 교차 (표준)
                </label>
                <label style="font-size:0.75rem; color:#f8fafc; display:inline-flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; margin-left:4px;">
                    <input type="radio" name="modal-table-stripe-mode" value="custom" ${isStripe ? 'checked' : ''}> 배경:
                </label>
                <div id="modal-table-stripe-bg-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${!isStripe ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-stripe-bg', tableObj.stripeBgLight || '#f8fafc', tableObj.stripeBgDark || '#1e293b', { labelText: '', lightTitle: '라이트 모드 짝수 행 배경색', darkTitle: '다크 모드 짝수 행 배경색' })}
                </div>
            `;
            container.appendChild(stripeRow);

            // [7] 행 호버 강조 행 (마우스 아이콘)
            const isHover = tableObj.hoverEnabled !== false;
            const hoverRow = create_form_row();
            hoverRow.innerHTML = `
                ${build_table_section_header('행 호버 강조', TABLE_ICONS.hover)}
                <label style="font-size:0.75rem; color:#f8fafc; display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                    <input type="checkbox" id="modal-table-hover-enabled" ${isHover ? 'checked' : ''}> 마우스 호버 사용
                </label>
                <div id="modal-table-hover-bg-pickers" style="display:flex; align-items:center; gap:4px; margin-left:4px; ${!isHover ? 'opacity:0.35; pointer-events:none;' : ''}">
                    ${build_color_pair_html('modal-table-hover-bg', tableObj.hoverBgLight || '#e2e8f0', tableObj.hoverBgDark || '#334155', { labelText: '', lightTitle: '라이트 모드 마우스 호버 배경색', darkTitle: '다크 모드 마우스 호버 배경색' })}
                </div>
            `;
            container.appendChild(hoverRow);

            // [8] 셀 여백 (TD 패딩) 행
            const padRow = create_form_row();
            padRow.innerHTML = `
                ${build_table_section_header('셀 여백 (Pad)', TABLE_ICONS.tdBadge)}
                <span style="font-size:0.75rem; color:var(--text-frame-muted);">여백:</span>
                <select id="modal-table-padding" style="flex:1; padding:2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                    <option value="none" ${tableObj.padding === 'none' ? 'selected' : ''}>없음 (0px)</option>
                    <option value="micro" ${tableObj.padding === 'micro' ? 'selected' : ''}>아주 좁게 (2px 4px)</option>
                    <option value="compact" ${tableObj.padding === 'compact' ? 'selected' : ''}>좁게 (4px 8px)</option>
                    <option value="normal" ${tableObj.padding === 'normal' || !tableObj.padding ? 'selected' : ''}>보통 (8px 12px)</option>
                    <option value="spacious" ${tableObj.padding === 'spacious' ? 'selected' : ''}>넓게 (12px 16px)</option>
                </select>
            `;
            container.appendChild(padRow);

            // [9] 셀 정렬 행 (상하 정렬 아이콘)
            const alignRow = create_form_row();
            alignRow.innerHTML = `
                ${build_table_section_header('셀 정렬', TABLE_ICONS.align)}
                <span style="font-size:0.75rem; color:var(--text-frame-muted);">세로 정렬:</span>
                <select id="modal-table-vertical-align" style="flex:1; padding:2px 4px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:3px; font-size:0.75rem;">
                    <option value="top" ${tableObj.verticalAlign === 'top' ? 'selected' : ''}>상단 (Top)</option>
                    <option value="middle" ${tableObj.verticalAlign === 'middle' || !tableObj.verticalAlign ? 'selected' : ''}>중앙 (Middle)</option>
                    <option value="bottom" ${tableObj.verticalAlign === 'bottom' ? 'selected' : ''}>하단 (Bottom)</option>
                </select>
            `;
            container.appendChild(alignRow);

            // 체크박스/라디오 토글 이벤트 바인딩 및 Live Preview 연동
            bind_toggle_picker('input[name="modal-table-row-bg-mode"]', 'modal-table-row-bg-pickers', true);
            bind_toggle_picker('input[name="modal-table-stripe-mode"]', 'modal-table-stripe-bg-pickers', true);
            bind_toggle_picker('#modal-table-border-enabled', 'modal-table-border-pickers', false);
            bind_toggle_picker('#modal-table-header-border-enabled', 'modal-table-header-border-pickers', false);
            bind_toggle_picker('#modal-table-row-border-enabled', 'modal-table-row-border-pickers', false);
            bind_toggle_picker('#modal-table-hover-enabled', 'modal-table-hover-bg-pickers', false);
        },

        /**
         * 현재 모달 내부 HTML 폼들로부터 최신 입력 값들을 수집해 스타일 객체로 빌드
         */
        collectCurrentInputs: function() {
            const currentId = options.presetSelect ? options.presetSelect.value : 'github_classic';
            const presets = typeof options.getPresetsData === 'function' ? options.getPresetsData() : [];
            const currentPreset = presets.find(p => p.id === currentId);

            // 기존 프리셋 데이터 복제본을 베이스로 수거 진행 (화면에 노출되지 않은 다른 탭 데이터 유실 방지)
            const styles = currentPreset ? JSON.parse(JSON.stringify(currentPreset.styles)) : {};

            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const pair = get_input_color_pair(`modal-${tag}-color`);
                const sizeEl = document.getElementById(`modal-${tag}-size`);
                const borderEl = document.getElementById(`modal-${tag}-border`);
                if (pair && sizeEl && borderEl) {
                    styles[tag] = {
                        colorLight: pair.colorLight,
                        colorDark: pair.colorDark,
                        size: sizeEl.value,
                        border: borderEl.value
                    };
                }
            });

            // 🔗 Link 수거
            const linkPair = get_input_color_pair('modal-link-color');
            const linkDeco = document.getElementById('modal-link-decoration');
            if (linkPair && linkDeco) {
                styles.link = {
                    colorLight: linkPair.colorLight,
                    colorDark: linkPair.colorDark,
                    decoration: linkDeco.value
                };
            }

            // 💪 Strong 수거
            const strongPair = get_input_color_pair('modal-strong-color');
            if (strongPair) {
                styles.strong = strongPair;
            }

            // ✍️ Em 수거
            const emPair = get_input_color_pair('modal-em-color');
            if (emPair) {
                styles.em = emPair;
            }

            // 📦 Code block 수거 및 Code (Inline Code) 동기화
            const cbPair = get_input_color_pair('modal-codeblock-color');
            const cbBgPair = get_input_color_pair('modal-codeblock-bg');
            if (cbPair && cbBgPair) {
                styles.codeblock = {
                    colorLight: cbPair.colorLight,
                    colorDark: cbPair.colorDark,
                    bgLight: cbBgPair.colorLight,
                    bgDark: cbBgPair.colorDark
                };
                styles.code = {
                    colorLight: cbPair.colorLight,
                    colorDark: cbPair.colorDark,
                    useCodeblockBg: true
                };
            }

            // 💬 Blockquote 수거
            const bqPair = get_input_color_pair('modal-blockquote-color');
            const bqBorderPair = get_input_color_pair('modal-blockquote-border');
            if (bqPair && bqBorderPair) {
                styles.blockquote = {
                    colorLight: bqPair.colorLight,
                    colorDark: bqPair.colorDark,
                    borderLight: bqBorderPair.colorLight,
                    borderDark: bqBorderPair.colorDark
                };
            }

            // ➖ Line 수거
            const linePair = get_input_color_pair('modal-line-color');
            const lineBorder = document.getElementById('modal-line-border');
            if (linePair && lineBorder) {
                styles.line = {
                    colorLight: linePair.colorLight,
                    colorDark: linePair.colorDark,
                    border: lineBorder.value
                };
            }

            // 📊 Table 스타일 수거
            const thColorPair = get_input_color_pair('modal-table-header-color');
            const thBgPair = get_input_color_pair('modal-table-header-bg');

            const headerBorderEnabled = document.getElementById('modal-table-header-border-enabled');
            const headerBorderColorPair = get_input_color_pair('modal-table-header-border-color');
            const headerBorderStyle = document.getElementById('modal-table-header-border-style');

            const rowBgPair = get_input_color_pair('modal-table-row-bg');
            const stripeBgPair = get_input_color_pair('modal-table-stripe-bg');

            const rowBorderEnabled = document.getElementById('modal-table-row-border-enabled');
            const rowBorderColorPair = get_input_color_pair('modal-table-row-border-color');
            const rowBorderStyle = document.getElementById('modal-table-row-border-style');

            const hoverEnabled = document.getElementById('modal-table-hover-enabled');
            const hoverBgPair = get_input_color_pair('modal-table-hover-bg');

            const borderEnabled = document.getElementById('modal-table-border-enabled');
            const borderColorPair = get_input_color_pair('modal-table-border-color');
            const borderStyle = document.getElementById('modal-table-border-style');

            const tablePadding = document.getElementById('modal-table-padding');
            const tableVertAlign = document.getElementById('modal-table-vertical-align');

            const rowBgModeRadio = document.querySelector('input[name="modal-table-row-bg-mode"]:checked');

            if (thColorPair || rowBgModeRadio || borderStyle || tablePadding) {
                styles.table = styles.table || {};
                if (thColorPair) {
                    styles.table.headerColorLight = thColorPair.colorLight;
                    styles.table.headerColorDark = thColorPair.colorDark;
                }
                if (thBgPair) {
                    styles.table.headerBgLight = thBgPair.colorLight;
                    styles.table.headerBgDark = thBgPair.colorDark;
                }

                if (headerBorderEnabled) styles.table.headerBorderEnabled = headerBorderEnabled.checked;
                if (headerBorderColorPair) {
                    styles.table.headerBorderColorLight = headerBorderColorPair.colorLight;
                    styles.table.headerBorderColorDark = headerBorderColorPair.colorDark;
                }
                if (headerBorderStyle) styles.table.headerBorderStyle = headerBorderStyle.value;

                if (rowBgModeRadio) styles.table.rowBgTransparent = (rowBgModeRadio.value === 'transparent');
                if (rowBgPair) {
                    styles.table.rowBgLight = rowBgPair.colorLight;
                    styles.table.rowBgDark = rowBgPair.colorDark;
                }

                const stripeModeRadio = document.querySelector('input[name="modal-table-stripe-mode"]:checked');
                if (stripeModeRadio) styles.table.stripeEnabled = (stripeModeRadio.value === 'custom');
                if (stripeBgPair) {
                    styles.table.stripeBgLight = stripeBgPair.colorLight;
                    styles.table.stripeBgDark = stripeBgPair.colorDark;
                }

                if (rowBorderEnabled) styles.table.rowBorderEnabled = rowBorderEnabled.checked;
                if (rowBorderColorPair) {
                    styles.table.rowBorderColorLight = rowBorderColorPair.colorLight;
                    styles.table.rowBorderColorDark = rowBorderColorPair.colorDark;
                }
                if (rowBorderStyle) styles.table.rowBorderStyle = rowBorderStyle.value;

                if (hoverEnabled) styles.table.hoverEnabled = hoverEnabled.checked;
                if (hoverBgPair) {
                    styles.table.hoverBgLight = hoverBgPair.colorLight;
                    styles.table.hoverBgDark = hoverBgPair.colorDark;
                }

                if (borderEnabled) styles.table.borderEnabled = borderEnabled.checked;
                if (borderColorPair) {
                    styles.table.borderColorLight = borderColorPair.colorLight;
                    styles.table.borderColorDark = borderColorPair.colorDark;
                }
                if (borderStyle) styles.table.borderStyle = borderStyle.value;

                if (tablePadding) styles.table.padding = tablePadding.value;
                if (tableVertAlign) styles.table.verticalAlign = tableVertAlign.value;
            }

            return styles;
        }
    };
})();
