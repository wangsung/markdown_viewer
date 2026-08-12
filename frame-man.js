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
        }
    };

    window.FrameManager = FrameManager;

})(typeof window !== 'undefined' ? window : this);
