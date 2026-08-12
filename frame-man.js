/**
 * frame-man.js - 레이아웃 프레임 및 메뉴 UI 제어 전용 서브 모듈
 * 
 * 주요 담당 기능:
 * 1. 테마(Dark/Light) UI 적용 및 아이콘/텍스트 토글
 * 2. 패널 드래그 리사이징 (Editor <-> Preview Splitter)
 * 3. 메뉴 드롭다운 UI 팝업 열기/닫기 및 바깥 영역 클릭 시 자동 숨김
 * 4. 메뉴 버튼과 비즈니스 로직 콜백 연결
 */

(function(window) {
    'use strict';

    let options = {
        elements: {},
        actions: {}
    };

    let isDragging = false;

    // ==========================================================================
    // 순수 서브 함수 (Pure Sub-functions in snake_case)
    // ==========================================================================

    function apply_theme_ui(theme, elements, onThemeChange) {
        const targetTheme = theme || 'dark';
        
        if (elements.container) {
            elements.container.setAttribute('data-editor-theme', targetTheme);
        }
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-editor-theme', targetTheme);
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('markvi_editor_theme', targetTheme);
            }
        } catch (e) {
            console.warn('Failed to save theme to localStorage:', e);
        }

        if (targetTheme === 'dark') {
            if (elements.themeIconSun) elements.themeIconSun.style.display = 'none';
            if (elements.themeIconMoon) elements.themeIconMoon.style.display = 'inline-block';
            if (elements.themeToggleText) elements.themeToggleText.textContent = 'Dark';
        } else {
            if (elements.themeIconSun) elements.themeIconSun.style.display = 'inline-block';
            if (elements.themeIconMoon) elements.themeIconMoon.style.display = 'none';
            if (elements.themeToggleText) elements.themeToggleText.textContent = 'Light';
        }

        if (typeof onThemeChange === 'function') {
            onThemeChange(targetTheme);
        }
    }

    function init_theme_ui(elements, onThemeChange) {
        let savedTheme = 'dark';
        try {
            if (typeof localStorage !== 'undefined') {
                savedTheme = localStorage.getItem('markvi_editor_theme') || 'dark';
            }
        } catch (e) {
            console.warn('Failed to read theme from localStorage:', e);
        }
        apply_theme_ui(savedTheme, elements, onThemeChange);
    }

    function close_all_dropdowns(elements) {
        if (!elements) return;
        const menus = [elements.exportMenu, elements.viewMenu, elements.headingStyleMenu, elements.mainMenu];
        menus.forEach(menu => {
            if (menu && menu.classList) {
                menu.classList.remove('show');
            }
        });
    }

    function toggle_dropdown_menu(menuEl, allElements) {
        if (!menuEl) return;
        const isShow = menuEl.classList.contains('show');
        close_all_dropdowns(allElements);
        if (!isShow) {
            menuEl.classList.add('show');
        }
    }

    function setup_outside_click_dismissal(elements) {
        if (typeof document === 'undefined') return;
        document.addEventListener('click', (e) => {
            if (elements.exportDropdown && !elements.exportDropdown.contains(e.target)) {
                if (elements.exportMenu) elements.exportMenu.classList.remove('show');
            }
            if (elements.viewDropdown && !elements.viewDropdown.contains(e.target)) {
                if (elements.viewMenu) elements.viewMenu.classList.remove('show');
            }
            if (elements.menuDropdown && !elements.menuDropdown.contains(e.target)) {
                if (elements.mainMenu) elements.mainMenu.classList.remove('show');
            }
            if (elements.headingDropdown && !elements.headingDropdown.contains(e.target)) {
                if (elements.headingStyleMenu) elements.headingStyleMenu.classList.remove('show');
            }
        });
    }

    function calculate_split_percentage(clientX, containerEl, editorPanelEl) {
        if (!containerEl || !editorPanelEl) return 50;
        
        const containerRect = containerEl.getBoundingClientRect();
        const tocSidebar = typeof document !== 'undefined' ? document.getElementById('toc-sidebar') : null;
        const tocWidth = tocSidebar && !tocSidebar.classList.contains('collapsed') ? tocSidebar.getBoundingClientRect().width : 0;
        
        const relativeX = clientX - containerRect.left - tocWidth;
        const availableWidth = containerRect.width - tocWidth;
        
        let percentageOfAvailable = availableWidth > 0 ? (relativeX / availableWidth) * 100 : 50;
        if (percentageOfAvailable < 20) percentageOfAvailable = 20;
        if (percentageOfAvailable > 80) percentageOfAvailable = 80;
        
        const targetEditorWidth = (percentageOfAvailable / 100) * availableWidth;
        let percentage = (targetEditorWidth / containerRect.width) * 100;
        return percentage;
    }

    function start_drag(e, dragDividerEl) {
        isDragging = true;
        if (dragDividerEl) dragDividerEl.classList.add('dragging');
        if (typeof document !== 'undefined' && document.body) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
    }

    function drag_move(e, containerEl, editorPanelEl, onPanelResize) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percentage = calculate_split_percentage(clientX, containerEl, editorPanelEl);
        if (editorPanelEl) {
            editorPanelEl.style.width = `${percentage}%`;
        }
        if (typeof onPanelResize === 'function') {
            onPanelResize(percentage);
        }
    }

    function stop_drag(dragDividerEl, onResizeComplete) {
        if (!isDragging) return;
        isDragging = false;
        if (dragDividerEl) dragDividerEl.classList.remove('dragging');
        if (typeof document !== 'undefined' && document.body) {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        if (typeof onResizeComplete === 'function') {
            onResizeComplete();
        }
    }

    function setup_splitter_events(elements, actions) {
        const { dragDivider, container, editorPanel } = elements;
        if (!dragDivider || typeof document === 'undefined') return;

        const handleMove = (e) => drag_move(e, container, editorPanel, actions.onPanelResize);
        const handleStop = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleStop);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleStop);
            stop_drag(dragDivider, actions.onResizeComplete);
        };

        const handleStart = (e) => {
            start_drag(e, dragDivider);
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleStop);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleStop);
        };

        dragDivider.addEventListener('mousedown', handleStart);
        dragDivider.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleStart(e);
        });
    }

    function setup_menu_toggles(elements) {
        if (elements.btnExport) {
            elements.btnExport.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.exportMenu, elements);
            });
        }
        if (elements.btnView) {
            elements.btnView.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.viewMenu, elements);
            });
        }
        if (elements.btnHeadingStyle) {
            elements.btnHeadingStyle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.headingStyleMenu, elements);
            });
        }
        if (elements.btnMenu) {
            elements.btnMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle_dropdown_menu(elements.mainMenu, elements);
            });
        }
    }

    function setup_button_actions(elements, actions) {
        if (!actions) return;

        // Theme Toggle Button
        if (elements.btnThemeToggle) {
            elements.btnThemeToggle.addEventListener('click', () => {
                let currentTheme = 'dark';
                if (elements.container) {
                    currentTheme = elements.container.getAttribute('data-editor-theme') || 'dark';
                }
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                apply_theme_ui(newTheme, elements, actions.onThemeChange);
            });
        }

        // Action Buttons with Auto Dropdown Close
        const actionBindings = [
            { el: elements.btnNewFile, action: actions.onNewFile },
            { el: elements.btnOpenFile, action: actions.onOpenFile },
            { el: elements.btnCopy, action: actions.onCopy },
            { el: elements.btnSave, action: actions.onSave },
            { el: elements.btnSaveAs, action: actions.onSaveAs },
            { el: elements.btnExportHtml, action: actions.onExportHtml },
            { el: elements.btnExportPdfPrint, action: actions.onExportPdfPrint },
            { el: elements.btnExportPdfHtml2Pdf, action: actions.onExportPdfHtml2Pdf },
            { el: elements.btnOpenNewWindow, action: actions.onOpenNewWindow },
            { el: elements.btnOpenNewWindowDefault, action: actions.onOpenNewWindowDefault },
            { el: elements.btnJoinParagraphs, action: actions.onJoinParagraphs },
            { el: elements.btnDebug, action: actions.onToggleDebug }
        ];

        actionBindings.forEach(binding => {
            if (binding.el && typeof binding.action === 'function') {
                binding.el.addEventListener('click', (e) => {
                    close_all_dropdowns(elements);
                    binding.action(e);
                });
            }
        });
    }

    function update_filename_display_ui(name, isModified, elements) {
        if (!name) return;
        const filenameSpan = (elements && elements.filenameSpan) || (typeof document !== 'undefined' ? document.getElementById('current-filename') : null);
        const fileBadge = (elements && elements.fileBadge) || (typeof document !== 'undefined' ? document.getElementById('file-badge') : null);
        
        if (filenameSpan && fileBadge) {
            filenameSpan.textContent = isModified ? `${name} *` : name;
            if (isModified) {
                fileBadge.classList.add('modified');
                fileBadge.title = "현재 파일 (수정됨)";
            } else {
                fileBadge.classList.remove('modified');
                fileBadge.title = "현재 파일";
            }
        }
        if (typeof document !== 'undefined') {
            document.title = isModified ? `* ${name} - MarkVi` : `${name} - MarkVi`;
        }
    }

    function format_file_size(bytes) {
        if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 KB';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function format_recent_time(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '';
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }

    function render_recent_files_ui(files, elements, onSelectFile) {
        if (typeof document === 'undefined') return;
        const wrapperEl = (elements && elements.recentFilesWrapper) || document.getElementById('recent-files-wrapper');
        const submenuEl = (elements && elements.recentFilesSubmenu) || document.getElementById('recent-files-submenu');
        if (!submenuEl) return;
        if (wrapperEl) wrapperEl.style.display = 'block';

        if (!files || files.length === 0) {
            submenuEl.innerHTML = '<div class="dropdown-submenu-empty">최근 파일이 없습니다.</div>';
            return;
        }

        submenuEl.innerHTML = '';
        files.forEach((entry) => {
            const itemBtn = document.createElement('button');
            itemBtn.className = 'recent-file-item';
            const timeStr = format_recent_time(entry.timestamp);
            const sizeStr = format_file_size(entry.size);
            const metaText = timeStr ? `${timeStr} · ${sizeStr}` : sizeStr;

            itemBtn.title = `${entry.name}\n작업 일시: ${timeStr}\n크기: ${sizeStr}\n클릭 시 파일 열기`;
            itemBtn.innerHTML = `
                <div class="recent-file-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>${entry.name}</span>
                </div>
                <div class="recent-file-path">${metaText}</div>
            `;
            itemBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                close_all_dropdowns(elements);
                if (typeof onSelectFile === 'function') {
                    onSelectFile(entry);
                }
            });
            submenuEl.appendChild(itemBtn);
        });
    }

    function show_toast_ui(message, duration = 3000, elements = {}) {
        if (typeof document === 'undefined') return;
        let toastEl = (elements && elements.toastEl) || document.getElementById('toast-container');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'toast-container';
            toastEl.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #1e293b; color: #f8fafc; padding: 10px 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 13px; transition: opacity 0.3s; opacity: 0; pointer-events: none;';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = message;
        toastEl.style.opacity = '1';
        toastEl.style.pointerEvents = 'auto';

        if (toastEl._timer) clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.pointerEvents = 'none';
        }, duration);
    }

    function apply_preview_max_width_limit_ui(isLimited = true, elements = {}) {
        if (typeof document === 'undefined') return;
        const previewViewport = (elements && elements.previewViewport) || document.querySelector('.preview-viewport');
        if (previewViewport) {
            if (isLimited) {
                previewViewport.classList.remove('full-width');
            } else {
                previewViewport.classList.add('full-width');
            }
        }
        const checkbox = (elements && elements.togglePreviewMaxWidthCheckbox) || document.getElementById('toggle-preview-max-width');
        if (checkbox) {
            checkbox.checked = !!isLimited;
        }
    }

    function init_debug_panel_ui(elements = {}) {
        if (typeof document === 'undefined') return null;
        let debugPanel = (elements && elements.debugPanel) || document.getElementById('debug-keyframe-panel');
        if (!debugPanel) {
            debugPanel = document.createElement('div');
            debugPanel.id = 'debug-keyframe-panel';
            debugPanel.style.position = 'fixed';
            debugPanel.style.bottom = '20px';
            debugPanel.style.right = '20px';
            debugPanel.style.width = '420px';
            debugPanel.style.maxHeight = '280px';
            debugPanel.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
            debugPanel.style.backdropFilter = 'blur(8px)';
            debugPanel.style.border = '1px solid var(--theme-color, #3b82f6)';
            debugPanel.style.borderRadius = '8px';
            debugPanel.style.color = '#f1f5f9';
            debugPanel.style.fontFamily = 'monospace';
            debugPanel.style.fontSize = '11px';
            debugPanel.style.padding = '12px';
            debugPanel.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
            debugPanel.style.zIndex = '9999';
            debugPanel.style.overflowY = 'auto';
            debugPanel.style.display = 'none';
            if (document.body) document.body.appendChild(debugPanel);
        }
        return debugPanel;
    }

    function toggle_debug_panel_ui(elements = {}, onToggle) {
        const debugPanel = init_debug_panel_ui(elements);
        if (!debugPanel) return;
        if (debugPanel.style.display === 'none') {
            debugPanel.style.display = 'block';
            if (typeof onToggle === 'function') {
                onToggle(true);
            }
        } else {
            debugPanel.style.display = 'none';
            if (typeof onToggle === 'function') {
                onToggle(false);
            }
        }
    }

    function render_debug_panel_ui(keyframesList, activeSource, elements = {}) {
        const debugPanel = init_debug_panel_ui(elements);
        if (!debugPanel || debugPanel.style.display === 'none') return;
        
        const list = keyframesList || [];
        let html = `<div style="font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🔑 Keyframes Debug List (${list.length})</span>
            <span style="color: var(--theme-color);">Active: ${activeSource || 'None'}</span>
        </div>`;
        
        html += `<table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
                <tr style="color: #94a3b8; border-bottom: 1px solid #1e293b;">
                    <th style="padding: 2px;">Line</th>
                    <th style="padding: 2px;">ID (Text)</th>
                    <th style="padding: 2px; text-align: right;">Ed%</th>
                    <th style="padding: 2px; text-align: right;">Pr%</th>
                    <th style="padding: 2px; text-align: right;">Y(px)</th>
                    <th style="padding: 2px; text-align: right;">ScaleFactor</th>
                </tr>
            </thead>
            <tbody>`;
            
        list.forEach((kf) => {
            const edPct = (kf.editorPercent * 100).toFixed(0) + '%';
            const prPct = (kf.previewPercent * 100).toFixed(0) + '%';
            const isBoundary = kf.id === '[START]' || kf.id === '[END]';
            const rowColor = isBoundary ? '#64748b' : '#38bdf8';
            const sfVal = kf.scaleFactor !== null && kf.scaleFactor !== undefined ? kf.scaleFactor : '-';
            
            const sfHighlight = kf.isActiveSegment 
                ? `background: #0284c7; color: #ffffff; padding: 1px 5px; border-radius: 4px; font-weight: bold; box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);` 
                : `color: ${rowColor};`;

            const rowBg = kf.isActiveSegment ? 'background: rgba(2, 132, 199, 0.15);' : '';
            const pinnedPrefix = kf.isUserPinned ? '📌 ' : '';

            html += `<tr style="color: ${rowColor}; ${rowBg} border-bottom: 1px dashed #1e293b;">
                <td style="padding: 3px 2px;">${Math.round(kf.line)}</td>
                <td style="padding: 3px 2px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${kf.id}">${pinnedPrefix}${kf.id}</td>
                <td style="padding: 3px 2px; text-align: right;">${edPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${prPct}</td>
                <td style="padding: 3px 2px; text-align: right;">${Math.round(kf.previewScrollY)}</td>
                <td style="padding: 3px 2px; text-align: right;"><span style="${sfHighlight}">${sfVal}</span></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        debugPanel.innerHTML = html;
    }

    function calc_scaled_font_size(percentStr, basePt = 10) {
        if (!percentStr) return `${basePt}pt`;
        const str = String(percentStr).trim();
        if (str.endsWith('pt') || str.endsWith('px')) return str;
        const num = parseFloat(str);
        if (isNaN(num)) return `${basePt}pt`;
        const scaled = (basePt * (num / 100)).toFixed(1);
        const cleanPt = scaled.endsWith('.0') ? scaled.slice(0, -2) : scaled;
        return `${cleanPt}pt`;
    }

    function restore_frame_settings_ui(sessionData, elements = {}, callbacks = {}) {
        if (!sessionData) return;
        const els = elements || {};
        const cb = callbacks || {};

        // 1. Panel Split Width Restore
        const editorPanel = els.editorPanel || (typeof document !== 'undefined' ? document.getElementById('editor-panel') : null);
        if (sessionData.editorWidthPercent && editorPanel) {
            editorPanel.style.width = sessionData.editorWidthPercent;
            if (typeof cb.onPanelResize === 'function') {
                cb.onPanelResize();
            }
        }

        // 2. Font Family Restore
        const fontSelect = els.fontSelect || (typeof document !== 'undefined' ? document.getElementById('font-select') : null);
        const preview = els.preview || (typeof document !== 'undefined' ? document.getElementById('markdown-body') : null);
        if (sessionData.fontFamily && fontSelect) {
            fontSelect.value = sessionData.fontFamily;
            if (preview && preview.style && typeof preview.style.setProperty === 'function') {
                preview.style.setProperty('--preview-font-family', sessionData.fontFamily);
            }
        }

        // 3. Font Size Restore
        const fontSizeSelect = els.fontSizeSelect || (typeof document !== 'undefined' ? document.getElementById('font-size-select') : null);
        if (fontSizeSelect || sessionData.fontSize) {
            let valToSet = sessionData.fontSize || '120%';
            if (valToSet.endsWith('px')) {
                if (valToSet === '12px') valToSet = '100%';
                else if (valToSet === '14px') valToSet = '110%';
                else if (valToSet === '16px') valToSet = '120%';
                else if (valToSet === '18px') valToSet = '130%';
                else if (valToSet === '20px') valToSet = '140%';
                else valToSet = '120%';
            }
            if (fontSizeSelect) fontSizeSelect.value = valToSet;
            const computedPt = calc_scaled_font_size(valToSet, 10);
            if (preview && preview.style && typeof preview.style.setProperty === 'function') {
                preview.style.setProperty('--preview-font-size', computedPt);
            }
            if (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && typeof document.documentElement.style.setProperty === 'function') {
                document.documentElement.style.setProperty('--preview-font-size', computedPt);
                document.documentElement.style.setProperty('--editor-font-size', computedPt);
            }
        }

        // 4. Line Color Restore
        const lineColorPicker = els.lineColorPicker || (typeof document !== 'undefined' ? document.getElementById('line-color-picker') : null);
        if (sessionData.lineColor && lineColorPicker) {
            lineColorPicker.value = sessionData.lineColor;
            if (typeof cb.onLineColorChange === 'function') {
                cb.onLineColorChange(sessionData.lineColor);
            }
        }

        // 5. Preview Max Width Limit Restore
        if (typeof sessionData.previewMaxWidthLimited === 'boolean') {
            apply_preview_max_width_limit_ui(sessionData.previewMaxWidthLimited, els);
        } else {
            apply_preview_max_width_limit_ui(true, els);
        }

        // 6. Color Swatch Restore
        const colorSwatchCheckbox = els.colorSwatchCheckbox || (typeof document !== 'undefined' ? document.getElementById('color-swatch-checkbox') : null);
        if (colorSwatchCheckbox) {
            colorSwatchCheckbox.checked = typeof sessionData.colorSwatchEnabled === 'boolean' ? sessionData.colorSwatchEnabled : true;
            if (typeof cb.onColorSwatchToggle === 'function') {
                cb.onColorSwatchToggle(colorSwatchCheckbox.checked);
            }
        }

        // 7. Scroll Sync Restore
        const scrollSyncCheckbox = els.scrollSyncCheckbox || (typeof document !== 'undefined' ? document.getElementById('scroll-sync') : null);
        if (scrollSyncCheckbox) {
            scrollSyncCheckbox.checked = typeof sessionData.scrollSyncEnabled === 'boolean' ? sessionData.scrollSyncEnabled : true;
            if (typeof cb.onScrollSyncToggle === 'function') {
                cb.onScrollSyncToggle(scrollSyncCheckbox.checked);
            }
        }
    }

    // ==========================================================================
    // Public API (camelCase)
    // ==========================================================================

    const FrameManager = {
        init: function(userOptions) {
            options = Object.assign({ elements: {}, actions: {} }, userOptions);
            const els = options.elements;
            const acts = options.actions;

            init_theme_ui(els, acts.onThemeChange);
            setup_splitter_events(els, acts);
            setup_menu_toggles(els);
            setup_outside_click_dismissal(els);
            setup_button_actions(els, acts);
        },

        applyTheme: function(theme) {
            apply_theme_ui(theme, options.elements, options.actions.onThemeChange);
        },

        initTheme: function() {
            init_theme_ui(options.elements, options.actions.onThemeChange);
        },

        closeAllDropdowns: function() {
            close_all_dropdowns(options.elements);
        },

        toggleDropdown: function(menuEl) {
            toggle_dropdown_menu(menuEl, options.elements);
        },

        updateFilenameDisplay: function(name, isModified) {
            update_filename_display_ui(name, isModified, options.elements);
        },

        renderRecentFilesMenu: function(files, onSelectFile) {
            render_recent_files_ui(files, options.elements, onSelectFile);
        },

        showToast: function(message, duration) {
            show_toast_ui(message, duration, options.elements);
        },

        applyPreviewMaxWidthLimit: function(isLimited) {
            apply_preview_max_width_limit_ui(isLimited, options.elements);
        },

        initDebugPanel: function() {
            return init_debug_panel_ui(options.elements);
        },

        toggleDebugPanel: function(onToggle) {
            toggle_debug_panel_ui(options.elements, onToggle);
        },

        updateDebugPanel: function(keyframesList, activeSource) {
            render_debug_panel_ui(keyframesList, activeSource, options.elements);
        },

        restoreFrameSettings: function(sessionData) {
            restore_frame_settings_ui(sessionData, options.elements, {
                onPanelResize: options.actions.onPanelResize,
                onLineColorChange: options.actions.onLineColorChange,
                onColorSwatchToggle: options.actions.onColorSwatchToggle,
                onScrollSyncToggle: options.actions.onScrollSyncToggle
            });
        },

        calcScaledFontSize: calc_scaled_font_size,
        formatFileSize: format_file_size,
        formatRecentTime: format_recent_time
    };

    window.FrameManager = FrameManager;

})(typeof window !== 'undefined' ? window : this);
