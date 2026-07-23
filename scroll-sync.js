/**
 * ScrollSync Module
 * Encapsulated ES6 class for managing proportional scroll synchronization
 * between CodeMirror editor and rendered HTML preview container.
 */

class ScrollSync {
  /**
   * @param {Object} options
   * @param {Object} options.cm - CodeMirror editor instance
   * @param {HTMLElement} options.previewViewport - Viewport container element (e.g. .preview-viewport)
   * @param {HTMLElement} options.previewContainer - HTML render container element (e.g. #preview)
   * @param {boolean} [options.enableScrollSync=true] - Initial enabled state
   * @param {function(number):void} [options.onActiveLineChange] - Callback when active line/heading changes
   * @param {function(Array, string):void} [options.onDebugUpdate] - Callback when keyframes or scroll source updates
   */
  constructor(options = {}) {
    this.cm = options.cm;
    this.previewViewport = options.previewViewport;
    this.previewContainer = options.previewContainer || options.previewViewport;
    this.isEnabled = options.enableScrollSync !== undefined ? !!options.enableScrollSync : true;
    this.onActiveLineChange = options.onActiveLineChange || null;
    this.onDebugUpdate = options.onDebugUpdate || null;
    this.onToast = options.onToast || null;

    // Internal State (ScrollSyncState)
    this.activeScrollSource = null; // null | 'editor' | 'preview'
    this.keyframes = [];            // Array of { id, line, editorPercent, previewPercent, previewScrollY }
    this.lastEditorScrollTop = -1;
    this.lastPreviewScrollTop = -1;
    this.isSyncing = false;

    // Event listener references for clean cleanup
    this._listeners = [];
    this._cmListeners = [];
    this.resizeObserver = null;
  }

  /**
   * Clean text string to generate a predictable keyframe identifier
   * @param {string} text 
   * @param {boolean} isHeading 
   * @returns {string}
   */
  cleanTextForIdentifier(text, isHeading) {
    if (!text) return '';
    let cleanText = text
      .replace(/^[#>\s\-*+]+/g, '')   // Strip header, blockquote, bullet list symbols
      .replace(/[*_`~]/g, '')         // Strip formatting characters
      .trim();
    return isHeading ? cleanText : cleanText.substring(0, 30);
  }

  /**
   * Extract keyframe text identifier for a specific line number (1-based)
   * @param {number} lineNum 
   * @returns {string}
   */
  getLineIdentifier(lineNum) {
    if (!this.cm) return '';
    const lines = this.cm.getValue().replace(/\r\n/g, '\n').split('\n');
    if (lineNum <= 0 || lineNum > lines.length) return '';
    const rawLine = lines[lineNum - 1].trim();
    if (!rawLine) return '';

    const isHeading = /^#+\s/.test(rawLine);
    const cleanText = this.cleanTextForIdentifier(rawLine, isHeading);
    if (!cleanText) return '';
    return `${cleanText}_line_${lineNum}`;
  }

  /**
   * Find matching DOM element inside preview container using identifier
   * @param {string} id 
   * @returns {HTMLElement|null}
   */
  findPreviewElementByIdentifier(id) {
    if (!id || id === '[START]' || id === '[END]' || !this.previewContainer) return null;

    const candidates = this.previewContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table');

    let baseId = id;
    const lineSuffixMatch = id.match(/(.+)_line_\d+$/);
    if (lineSuffixMatch) {
      baseId = lineSuffixMatch[1];
    }

    const cleanId = baseId.trim().toLowerCase();

    for (let el of candidates) {
      const text = el.textContent.trim().toLowerCase();
      if (text.startsWith(cleanId) || cleanId.startsWith(text.substring(0, 30))) {
        return el;
      }
    }
    return null;
  }

  /**
   * Rebuild initial keyframe list from headings in editor and preview
   */
  rebuildKeyframes() {
    if (!this.previewViewport || !this.cm) return;
    const lines = this.cm.getValue().replace(/\r\n/g, '\n').split('\n');
    const totalLines = lines.length;
    const maxPreviewScrollY = this.previewViewport.scrollHeight - this.previewViewport.clientHeight;

    const rawKeyframes = [];

    // 1. Start boundary node
    rawKeyframes.push({
      id: '[START]',
      line: 0,
      editorPercent: 0,
      previewPercent: 0,
      previewScrollY: 0
    });

    // 2. Heading elements with data-line attributes
    const headings = Array.from(this.previewContainer.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line]'));
    headings.forEach(el => {
      const line = parseInt(el.getAttribute('data-line'), 10);
      const cleanText = this.cleanTextForIdentifier(el.textContent, true);
      if (!isNaN(line) && cleanText) {
        const id = `${cleanText}_line_${line}`;
        const editorPercent = totalLines > 1 ? (line - 1) / (totalLines - 1) : 0;
        const previewPercent = editorPercent;
        const previewScrollY = previewPercent * maxPreviewScrollY;

        rawKeyframes.push({
          id: id,
          line: line,
          editorPercent: editorPercent,
          previewPercent: previewPercent,
          previewScrollY: previewScrollY
        });
      }
    });

    // 3. End boundary node
    rawKeyframes.push({
      id: '[END]',
      line: totalLines,
      editorPercent: 1.0,
      previewPercent: 1.0,
      previewScrollY: Math.max(0, maxPreviewScrollY)
    });

    // Sort by line number
    rawKeyframes.sort((a, b) => a.line - b.line);

    // Deduplicate keyframes
    this.keyframes = [];
    const seenIds = new Set();
    rawKeyframes.forEach(kf => {
      if (!seenIds.has(kf.id)) {
        seenIds.add(kf.id);
        this.keyframes.push(kf);
      }
    });

    // Guarantee minimum [START] and [END] boundary anchors
    if (this.keyframes.length < 2) {
      this.keyframes = [
        { id: '[START]', line: 0, editorPercent: 0, previewPercent: 0, previewScrollY: 0 },
        { id: '[END]', line: totalLines, editorPercent: 1.0, previewPercent: 1.0, previewScrollY: Math.max(0, maxPreviewScrollY) }
      ];
    }

    // If headings were expected but DOM wasn't painted yet, retry on next frame
    if (headings.length === 0 && !this._hasRetriedBuild) {
      this._hasRetriedBuild = true;
      requestAnimationFrame(() => {
        this.rebuildKeyframes();
        this._hasRetriedBuild = false;
      });
    }

    this._notifyDebug();
  }

  /**
   * Recalculate preview Y-pixel positions of existing keyframes on resize
   */
  recalculateKeyframePositions() {
    if (!this.previewViewport || this.keyframes.length === 0) return;
    const maxPreviewScrollY = this.previewViewport.scrollHeight - this.previewViewport.clientHeight;

    this.keyframes.forEach(kf => {
      if (kf.id === '[START]') {
        kf.previewScrollY = 0;
      } else if (kf.id === '[END]') {
        kf.previewScrollY = Math.max(0, maxPreviewScrollY);
      } else {
        kf.previewScrollY = kf.previewPercent * maxPreviewScrollY;
      }
    });

    this._notifyDebug();
  }

  /**
   * Dynamically add or update keyframe with monotonicity clamping and proportional rescaling
   */
  addOrUpdateKeyframe(id, line, newPercent, targetScrollTop) {
    if (this.keyframes.length < 2) {
      this.rebuildKeyframes();
    }
    if (id === '[START]' || id === '[END]' || line <= 1) return; // Boundary and line 1 nodes are protected

    let existingIdx = this.keyframes.findIndex(k => k.id === id || k.line === line);

    if (existingIdx !== -1) {
      const prevNode = this.keyframes[existingIdx - 1];
      const nextNode = this.keyframes[existingIdx + 1];
      const edPercent = (line - 1) / (this.cm.lineCount() - 1 || 1);

      // Floor bound: never drop below editorPercent (e.g. 41%, 64%) and never exceed 0.98
      let clampedPercent = Math.min(0.98, Math.max(edPercent, newPercent));

      if (prevNode && clampedPercent <= prevNode.previewPercent) {
        clampedPercent = Math.min(0.98, prevNode.previewPercent + 0.001);
      }
      if (nextNode && clampedPercent >= nextNode.previewPercent) {
        clampedPercent = Math.max(edPercent, nextNode.previewPercent - 0.001);
      }

      const oldPercent = this.keyframes[existingIdx].previewPercent;
      this.keyframes[existingIdx].previewPercent = clampedPercent;
      this.keyframes[existingIdx].previewScrollY = targetScrollTop;

      this.rescaleKeyframePercentages(existingIdx, oldPercent, clampedPercent);
    } else {
      let insertIdx = this.keyframes.findIndex(k => k.line > line);
      if (insertIdx === -1) insertIdx = this.keyframes.length - 1;

      const prevNode = this.keyframes[insertIdx - 1];
      const nextNode = this.keyframes[insertIdx];
      const edPercent = (line - 1) / (this.cm.lineCount() - 1 || 1);

      // Floor bound: never drop below editorPercent and max 0.98
      let clampedPercent = Math.min(0.98, Math.max(edPercent, newPercent));

      if (prevNode && clampedPercent <= prevNode.previewPercent) {
        clampedPercent = Math.min(0.98, prevNode.previewPercent + 0.001);
      }
      if (nextNode && clampedPercent >= nextNode.previewPercent) {
        clampedPercent = Math.max(edPercent, nextNode.previewPercent - 0.001);
      }

      const newKf = {
        id: id,
        line: line,
        editorPercent: (line - 1) / (this.cm.lineCount() - 1 || 1),
        previewPercent: clampedPercent,
        previewScrollY: targetScrollTop
      };

      this.keyframes.splice(insertIdx, 0, newKf);
    }

    this._notifyDebug();
  }

  /**
   * Proportionally rescale upper and lower keyframe boundaries
   */
  rescaleKeyframePercentages(pivotIndex, oldPercent, newPercent) {
    if (this.keyframes.length <= 2) return;

    if (newPercent > oldPercent) {
      const deltaUpper = newPercent - oldPercent;
      const spaceUpper = 1.0 - oldPercent;
      if (spaceUpper > 0) {
        for (let i = pivotIndex + 1; i < this.keyframes.length - 1; i++) {
          const kf = this.keyframes[i];
          const factor = (1.0 - kf.previewPercent) / spaceUpper;
          kf.previewPercent = Math.min(0.98, kf.previewPercent + deltaUpper * factor);
          kf.previewScrollY = kf.previewPercent * (this.previewViewport.scrollHeight - this.previewViewport.clientHeight);
        }
      }
    } else if (newPercent < oldPercent) {
      const deltaLower = oldPercent - newPercent;
      const spaceLower = oldPercent - 0.0;
      if (spaceLower > 0) {
        for (let i = 1; i < pivotIndex; i++) {
          const kf = this.keyframes[i];
          const factor = (kf.previewPercent - 0.0) / spaceLower;
          // Floor bound: never shrink below editorPercent
          kf.previewPercent = Math.max(kf.editorPercent, kf.previewPercent - deltaLower * factor);
          kf.previewScrollY = kf.previewPercent * (this.previewViewport.scrollHeight - this.previewViewport.clientHeight);
        }
      }
    }
  }

  /**
   * Sync preview position to current cursor line with 20px padding buffer
   */
  syncPreviewToCursor() {
    if (!this.cm || !this.previewViewport || !this.isEnabled) return;

    const cursor = this.cm.getCursor();
    const cursorLine = cursor.line + 1;

    // Protection for line 1: align preview to top (0px) without distorting keyframes
    if (cursorLine <= 1) {
      this.previewViewport.scrollTop = 0;
      this.lastPreviewScrollTop = 0;
      this._notifyDebug();
      return;
    }

    let targetId = this.getLineIdentifier(cursorLine);
    let targetEl = targetId ? this.findPreviewElementByIdentifier(targetId) : null;

    if (!targetEl) {
      for (let l = cursorLine - 1; l >= Math.max(1, cursorLine - 10); l--) {
        const fallbackId = this.getLineIdentifier(l);
        if (fallbackId) {
          targetEl = this.findPreviewElementByIdentifier(fallbackId);
          if (targetEl) {
            targetId = fallbackId;
            break;
          }
        }
      }
    }

    if (targetEl) {
      const containerRect = this.previewViewport.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();

      const topOffset = elRect.top - containerRect.top;
      const bottomOffset = elRect.bottom - containerRect.top;
      const padding = 20;

      if (topOffset < padding || bottomOffset > (containerRect.height - padding)) {
        let newScrollTop = this.previewViewport.scrollTop + topOffset - padding;
        const maxScroll = this.previewViewport.scrollHeight - containerRect.height;
        newScrollTop = Math.max(0, Math.min(newScrollTop, maxScroll));

        this.previewViewport.scrollTop = newScrollTop;
        const newPercent = maxScroll > 0 ? newScrollTop / maxScroll : 0;

        if (targetId) {
          this.addOrUpdateKeyframe(targetId, cursorLine, newPercent, newScrollTop);
        }
      }
    }
  }

  /**
   * Linear interpolation for editor -> preview scroll
   */
  getPreviewScrollForEditor(editorScrollTop) {
    if (this.keyframes.length === 0 || !this.cm) return 0;

    const scrollInfo = this.cm.getScrollInfo();
    const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;
    const currentPercent = maxEditorScrollTop > 0 ? editorScrollTop / maxEditorScrollTop : 0;

    let kfBefore = this.keyframes[0];
    let kfAfter = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length; i++) {
      const kf = this.keyframes[i];
      if (kf.editorPercent <= currentPercent) {
        kfBefore = kf;
      } else {
        kfAfter = kf;
        break;
      }
    }

    if (kfBefore === kfAfter) {
      return kfBefore.previewScrollY;
    }

    const denom = kfAfter.editorPercent - kfBefore.editorPercent;
    const ratio = denom > 0 ? (currentPercent - kfBefore.editorPercent) / denom : 0;

    return kfBefore.previewScrollY + ratio * (kfAfter.previewScrollY - kfBefore.previewScrollY);
  }

  /**
   * Linear interpolation for preview -> editor scroll
   */
  getEditorScrollForPreview(previewScrollTop) {
    if (this.keyframes.length === 0 || !this.cm || !this.previewViewport) return 0;

    const maxPreviewScrollY = this.previewViewport.scrollHeight - this.previewViewport.clientHeight;
    const currentPercent = maxPreviewScrollY > 0 ? previewScrollTop / maxPreviewScrollY : 0;

    let kfBefore = this.keyframes[0];
    let kfAfter = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length; i++) {
      const kf = this.keyframes[i];
      if (kf.previewPercent <= currentPercent) {
        kfBefore = kf;
      } else {
        kfAfter = kf;
        break;
      }
    }

    const scrollInfo = this.cm.getScrollInfo();
    const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;

    if (kfBefore === kfAfter) {
      return kfBefore.editorPercent * maxEditorScrollTop;
    }

    const denom = kfAfter.previewPercent - kfBefore.previewPercent;
    const ratio = denom > 0 ? (currentPercent - kfBefore.previewPercent) / denom : 0;
    const targetEditorPercent = kfBefore.editorPercent + ratio * (kfAfter.editorPercent - kfBefore.editorPercent);

    return targetEditorPercent * maxEditorScrollTop;
  }

  /**
   * Smoothly scroll editor and preview to target line (1-based)
   * @param {number} lineNum 
   */
  scrollToLine(lineNum) {
    if (!this.cm || !this.previewViewport) return;

    this.isSyncing = true;
    const targetLine = Math.max(1, lineNum);
    const linePos = this.cm.heightAtLine(targetLine - 1, 'local');

    this.cm.scrollTo(null, linePos);

    const targetId = this.getLineIdentifier(targetLine);
    let targetEl = targetId ? this.findPreviewElementByIdentifier(targetId) : null;

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (typeof this.onActiveLineChange === 'function') {
      this.onActiveLineChange(targetLine);
    }

    setTimeout(() => {
      this.isSyncing = false;
    }, 300);
  }

  /**
   * Internal editor scroll handler
   * Uses Relative Delta-Y mechanism by default, with Linear Interpolation fallback when keyframes are invalid or scaleFactor is zero.
   * @private
   */
  _handleEditorScroll() {
    if (!this.isEnabled || this.isSyncing || this.activeScrollSource === 'preview' || !this.previewViewport || !this.cm) return;

    // Auto-claim scroll source if null
    if (!this.activeScrollSource) {
      this.activeScrollSource = 'editor';
    }

    const scrollInfo = this.cm.getScrollInfo();
    const scrollTop = scrollInfo.top;
    if (scrollTop === this.lastEditorScrollTop) return;

    if (this.lastEditorScrollTop === -1) {
      this.lastEditorScrollTop = scrollTop;
    }

    const deltaY_ed = scrollTop - this.lastEditorScrollTop;
    this.lastEditorScrollTop = scrollTop;

    const maxEditorScrollTop = scrollInfo.height - scrollInfo.clientHeight;
    const maxPreviewScrollY = this.previewViewport.scrollHeight - this.previewViewport.clientHeight;

    // Edge boundary checks (Top / Bottom overscroll)
    if (scrollTop < 0) {
      this.previewViewport.scrollTop = 0;
      this.lastPreviewScrollTop = 0;
      this._notifyDebug();
      this._detectActiveLineFromPreview();
      return;
    }
    if (scrollTop >= maxEditorScrollTop && maxEditorScrollTop > 0) {
      this.previewViewport.scrollTop = maxPreviewScrollY;
      this.lastPreviewScrollTop = maxPreviewScrollY;
      this._notifyDebug();
      this._detectActiveLineFromPreview();
      return;
    }

    // Anomaly Check 1: Keyframes not built properly (< 2)
    if (this.keyframes.length < 2) {
      const fallbackScroll = this.getPreviewScrollForEditor(scrollTop);
      this.lastPreviewScrollTop = fallbackScroll;
      this.previewViewport.scrollTop = fallbackScroll;
      this.rebuildKeyframes();
      this._notifyDebug();
      this._detectActiveLineFromPreview();
      return;
    }

    // Segment Keyframe Search
    const currentPercent = maxEditorScrollTop > 0 ? scrollTop / maxEditorScrollTop : 0;
    let kfBefore = this.keyframes[0];
    let kfAfter = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length; i++) {
      const kf = this.keyframes[i];
      if (kf.editorPercent <= currentPercent) {
        kfBefore = kf;
      } else {
        kfAfter = kf;
        break;
      }
    }

    const height_ed_range = (kfAfter.editorPercent - kfBefore.editorPercent) * maxEditorScrollTop;
    const height_pr_range = kfAfter.previewScrollY - kfBefore.previewScrollY;

    let scaleFactor = 0;
    if (height_ed_range > 0 && height_pr_range > 0) {
      scaleFactor = height_pr_range / height_ed_range;
    }

    // Anomaly Check 2: scaleFactor is Zero or invalid -> Fallback to Linear Interpolation Mapping
    if (scaleFactor <= 0) {
      const fallbackScroll = this.getPreviewScrollForEditor(scrollTop);
      this.lastPreviewScrollTop = fallbackScroll;
      this.previewViewport.scrollTop = fallbackScroll;
      this._notifyDebug();
      this._detectActiveLineFromPreview();
      return;
    }

    // Normal Execution: Relative Delta-Y calculation
    const deltaY_pr = deltaY_ed * scaleFactor;
    let newPreviewScrollTop = this.previewViewport.scrollTop + deltaY_pr;
    newPreviewScrollTop = Math.max(0, Math.min(newPreviewScrollTop, maxPreviewScrollY));

    this.lastPreviewScrollTop = newPreviewScrollTop;
    this.previewViewport.scrollTop = newPreviewScrollTop;

    this._notifyDebug();
    this._detectActiveLineFromPreview();
  }

  /**
   * Internal preview scroll handler
   * @private
   */
  _handlePreviewScroll() {
    if (!this.isEnabled || this.isSyncing || this.activeScrollSource === 'editor' || !this.previewViewport || !this.cm) return;

    if (!this.activeScrollSource) {
      this.activeScrollSource = 'preview';
    }

    if (this.previewViewport.scrollTop === this.lastPreviewScrollTop) return;

    this.lastPreviewScrollTop = this.previewViewport.scrollTop;
    const targetScroll = this.getEditorScrollForPreview(this.previewViewport.scrollTop);
    this.lastEditorScrollTop = targetScroll;

    this.cm.scrollTo(null, targetScroll);

    this._notifyDebug();
    this._detectActiveLineFromPreview();
  }

  /**
   * Detect currently active line/heading near top 100px of preview
   * @private
   */
  _detectActiveLineFromPreview() {
    if (typeof this.onActiveLineChange !== 'function' || !this.previewContainer) return;

    const headings = this.previewContainer.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line]');
    const containerRect = this.previewViewport.getBoundingClientRect();

    let activeLine = 1;
    for (let h of headings) {
      const rect = h.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      if (relativeTop <= 100) {
        const line = parseInt(h.getAttribute('data-line'), 10);
        if (!isNaN(line)) activeLine = line;
      } else {
        break;
      }
    }

    this.onActiveLineChange(activeLine);
  }

  /**
   * Helper to trigger onDebugUpdate callback
   * @private
   */
  _notifyDebug() {
    if (typeof this.onDebugUpdate === 'function') {
      this.onDebugUpdate(this.keyframes, this.activeScrollSource);
    }
  }

  /**
   * Attach event listeners, ResizeObserver, and build initial keyframes
   */
  init() {
    if (!this.cm || !this.previewViewport) return;

    // Mouseenter bindings for active scroll source detection
    const cmWrapper = this.cm.getWrapperElement();

    const onCmMouseEnter = () => { this.activeScrollSource = 'editor'; };
    const onPreviewMouseEnter = () => { this.activeScrollSource = 'preview'; };

    cmWrapper.addEventListener('mouseenter', onCmMouseEnter);
    this.previewViewport.addEventListener('mouseenter', onPreviewMouseEnter);
    this._listeners.push({ target: cmWrapper, event: 'mouseenter', handler: onCmMouseEnter });
    this._listeners.push({ target: this.previewViewport, event: 'mouseenter', handler: onPreviewMouseEnter });

    // CodeMirror event handlers
    const onCmCursorActivity = () => { this.syncPreviewToCursor(); };
    const onCmFocus = () => { this.activeScrollSource = 'editor'; };
    const onCmScroll = () => { this._handleEditorScroll(); };

    this.cm.on('cursorActivity', onCmCursorActivity);
    this.cm.on('focus', onCmFocus);
    this.cm.on('scroll', onCmScroll);

    this._cmListeners = [
      { event: 'cursorActivity', handler: onCmCursorActivity },
      { event: 'focus', handler: onCmFocus },
      { event: 'scroll', handler: onCmScroll }
    ];

    // Preview scroll handler
    const onPreviewScroll = () => { this._handlePreviewScroll(); };
    this.previewViewport.addEventListener('scroll', onPreviewScroll);
    this._listeners.push({ target: this.previewViewport, event: 'scroll', handler: onPreviewScroll });

    // ResizeObserver on preview container
    if (this.previewContainer && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.recalculateKeyframePositions();
      });
      this.resizeObserver.observe(this.previewContainer);
    }

    // Build keyframes on initialization
    this.rebuildKeyframes();
  }

  /**
   * Cleanup event listeners and disconnect observers
   */
  destroy() {
    this._listeners.forEach(({ target, event, handler }) => {
      if (target && target.removeEventListener) {
        target.removeEventListener(event, handler);
      }
    });
    this._listeners = [];

    if (this.cm && this._cmListeners) {
      this._cmListeners.forEach(({ event, handler }) => {
        this.cm.off(event, handler);
      });
      this._cmListeners = [];
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Enable or disable scroll synchronization
   * @param {boolean} enable 
   */
  setEnable(enable) {
    this.isEnabled = !!enable;
  }
}

// Export to global window scope
if (typeof window !== 'undefined') {
  window.ScrollSync = ScrollSync;
}
