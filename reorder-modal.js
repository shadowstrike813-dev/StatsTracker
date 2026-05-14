// ─── Reorder Modal ────────────────────────────────────────────────────────────
// Folosire: openReorderModal(items, onSave)
// items: [{ id, label, sublabel }]
// onSave(newOrderedIds) — callback cu array de id-uri in noua ordine

(function () {

  // Injectam stilurile
  const style = document.createElement('style');
  style.textContent = `
    .reorder-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 800;
      align-items: center; justify-content: center;
      padding: 1rem;
    }
    .reorder-overlay.open { display: flex; }

    .reorder-modal {
      background: var(--surface);
      border: 1px solid var(--border2);
      border-radius: var(--radius-lg);
      width: 100%; max-width: 420px;
      max-height: 85vh;
      display: flex; flex-direction: column;
      overflow: hidden;
    }

    .reorder-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .reorder-title {
      font-size: 14px; font-weight: 600;
    }
    .reorder-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-dim); font-size: 20px;
      padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }
    .reorder-close:hover { color: var(--text); background: var(--surface2); }

    .reorder-hint {
      font-size: 11px; color: var(--text-dim);
      font-family: 'DM Mono', monospace;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .reorder-list {
      overflow-y: auto;
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .reorder-item {
      display: grid;
      grid-template-columns: 36px 1fr;
      align-items: center;
      gap: 8px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 12px;
      user-select: none;
      transition: background 0.12s, border-color 0.12s, opacity 0.12s;
      touch-action: none;
    }
    .reorder-item.is-dragging {
      opacity: 0.4;
    }
    .reorder-item.drag-above {
      border-top: 2px solid var(--blue);
    }
    .reorder-item.drag-below {
      border-bottom: 2px solid var(--blue);
    }

    .reorder-grip {
      display: flex; align-items: center; justify-content: center;
      color: var(--text-dim); font-size: 18px;
      cursor: grab;
    }
    .reorder-grip:active { cursor: grabbing; }

    .reorder-item-label    { font-size: 13px; font-weight: 500; }
    .reorder-item-sublabel { font-size: 11px; color: var(--text-dim); font-family: 'DM Mono', monospace; }

    .reorder-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 8px;
      flex-shrink: 0;
    }
    .reorder-btn-cancel {
      background: none; border: 1px solid var(--border2);
      border-radius: var(--radius); padding: 8px 16px;
      color: var(--text-muted); font-family: 'Syne', sans-serif;
      font-size: 13px; cursor: pointer;
    }
    .reorder-btn-cancel:hover { background: var(--surface2); }
    .reorder-btn-save {
      background: var(--blue); color: #000; border: none;
      border-radius: var(--radius); padding: 8px 20px;
      font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s;
    }
    .reorder-btn-save:hover { opacity: 0.85; }

    /* Clona care urmeaza degetul */
    .reorder-drag-clone {
      position: fixed;
      pointer-events: none;
      z-index: 900;
      opacity: 0.92;
      box-shadow: 0 8px 28px rgba(0,0,0,0.5);
      border-radius: var(--radius);
      background: var(--surface3);
      border: 1px solid var(--border2);
      padding: 10px 12px;
      display: grid;
      grid-template-columns: 36px 1fr;
      align-items: center;
      gap: 8px;
      transform: scale(1.03);
    }
  `;
  document.head.appendChild(style);

  // ─── Creeaza overlay + modal ────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'reorder-overlay';
  overlay.id = 'reorder-overlay';
  overlay.innerHTML = `
    <div class="reorder-modal" id="reorder-modal">
      <div class="reorder-header">
        <div class="reorder-title">Reordonează exercițiile</div>
        <button class="reorder-close" id="reorder-close"><i class="ti ti-x"></i></button>
      </div>
      <div class="reorder-hint">Trage de <i class="ti ti-grip-vertical"></i> pentru a schimba ordinea</div>
      <div class="reorder-list" id="reorder-list"></div>
      <div class="reorder-footer">
        <button class="reorder-btn-cancel" id="reorder-btn-cancel">Anulează</button>
        <button class="reorder-btn-save"   id="reorder-btn-save">Salvează ordinea</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let currentItems = [];
  let onSaveCallback = null;

  // ─── Deschide modalul ───────────────────────────────────────────────────────
  window.openReorderModal = function (items, onSave) {
    currentItems   = items.map(i => ({ ...i }));
    onSaveCallback = onSave;
    renderReorderList();
    overlay.classList.add('open');
  };

  function closeModal() {
    overlay.classList.remove('open');
  }

  document.getElementById('reorder-close').addEventListener('click', closeModal);
  document.getElementById('reorder-btn-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('reorder-btn-save').addEventListener('click', () => {
    if (onSaveCallback) onSaveCallback(currentItems.map(i => i.id));
    closeModal();
  });

  // ─── Randeaza lista ─────────────────────────────────────────────────────────
  function renderReorderList() {
    const list = document.getElementById('reorder-list');
    list.innerHTML = currentItems.map((item, idx) => `
      <div class="reorder-item" data-idx="${idx}">
        <div class="reorder-grip"><i class="ti ti-grip-vertical"></i></div>
        <div>
          <div class="reorder-item-label">${item.label}</div>
          ${item.sublabel ? `<div class="reorder-item-sublabel">${item.sublabel}</div>` : ''}
        </div>
      </div>
    `).join('');

    attachDragEvents(list);
  }

  // ─── Drag & Drop ────────────────────────────────────────────────────────────
  function attachDragEvents(list) {
    let dragIdx  = null;
    let dragEl   = null;
    let clone    = null;
    let startY   = 0;
    let lastOverEl = null;
    let lastOverPos = null; // 'above' | 'below'

    function getItems() { return [...list.querySelectorAll('.reorder-item')]; }

    function createClone(el, touchX, touchY) {
      const rect = el.getBoundingClientRect();
      const c = document.createElement('div');
      c.className = 'reorder-drag-clone';
      c.innerHTML = el.innerHTML;
      c.style.width  = rect.width + 'px';
      c.style.left   = rect.left + 'px';
      c.style.top    = rect.top  + 'px';
      document.body.appendChild(c);
      return c;
    }

    function moveClone(c, touchY) {
      const items = getItems();
      if (!items.length) return;
      const rect = items[0].getBoundingClientRect();
      c.style.top = (touchY - rect.height / 2) + 'px';
    }

    function clearHighlights() {
      getItems().forEach(el => { el.classList.remove('drag-above', 'drag-below'); });
    }

    function getTargetInfo(touchY) {
      const items = getItems();
      for (let i = 0; i < items.length; i++) {
        if (i === dragIdx) continue;
        const rect = items[i].getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        if (touchY < mid) return { el: items[i], idx: i, pos: 'above' };
      }
      // Sub toate
      const last = items[items.length - 1];
      if (last && (dragIdx === null || dragIdx !== items.length - 1)) {
        return { el: last, idx: items.length - 1, pos: 'below' };
      }
      return null;
    }

    function doReorder(fromIdx, toEl, pos) {
      const items = getItems();
      const toIdx = items.indexOf(toEl);
      if (toIdx === -1 || toIdx === fromIdx) return;

      const item = currentItems.splice(fromIdx, 1)[0];
      let insertAt = toIdx;
      if (pos === 'below') insertAt = toIdx + 1;
      if (fromIdx < toIdx && pos === 'above') insertAt = toIdx - 1;
      if (insertAt < 0) insertAt = 0;
      if (insertAt > currentItems.length) insertAt = currentItems.length;

      // Re-calculeaza dupa stergere
      let finalIdx = insertAt;
      if (fromIdx < toIdx) {
        finalIdx = pos === 'above' ? toIdx - 1 : toIdx;
      } else {
        finalIdx = pos === 'above' ? toIdx : toIdx + 1;
      }
      if (finalIdx < 0) finalIdx = 0;
      if (finalIdx > currentItems.length) finalIdx = currentItems.length;

      currentItems.splice(finalIdx, 0, item);
      renderReorderList();
    }

    // ── Mouse drag ────────────────────────────────────────────────────────────

    list.addEventListener('mousedown', (e) => {
      const grip = e.target.closest('.reorder-grip');
      if (!grip) return;
      const item = grip.closest('.reorder-item');
      if (!item) return;

      dragIdx = parseInt(item.dataset.idx);
      dragEl  = item;
      dragEl.classList.add('is-dragging');
      clone   = createClone(dragEl, e.clientX, e.clientY);
      startY  = e.clientY;

      const onMouseMove = (ev) => {
        moveClone(clone, ev.clientY);
        clearHighlights();
        const info = getTargetInfo(ev.clientY);
        if (info) {
          info.el.classList.add(info.pos === 'above' ? 'drag-above' : 'drag-below');
          lastOverEl  = info.el;
          lastOverPos = info.pos;
        } else {
          lastOverEl  = null;
          lastOverPos = null;
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        clearHighlights();
        clone.remove(); clone = null;
        dragEl.classList.remove('is-dragging');
        if (lastOverEl) doReorder(dragIdx, lastOverEl, lastOverPos);
        dragEl = null; dragIdx = null; lastOverEl = null; lastOverPos = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
      e.preventDefault();
    });

    // ── Touch drag ────────────────────────────────────────────────────────────

    list.addEventListener('touchstart', (e) => {
      const grip = e.target.closest('.reorder-grip');
      if (!grip) return;
      const item = grip.closest('.reorder-item');
      if (!item) return;

      dragIdx = parseInt(item.dataset.idx);
      dragEl  = item;
      const touch = e.touches[0];
      startY  = touch.clientY;
      dragEl.classList.add('is-dragging');
      clone = createClone(dragEl, touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });

    list.addEventListener('touchmove', (e) => {
      if (dragIdx === null) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      moveClone(clone, touch.clientY);
      clearHighlights();
      const info = getTargetInfo(touch.clientY);
      if (info) {
        info.el.classList.add(info.pos === 'above' ? 'drag-above' : 'drag-below');
        lastOverEl  = info.el;
        lastOverPos = info.pos;
      } else {
        lastOverEl  = null;
        lastOverPos = null;
      }
    }, { passive: false });

    list.addEventListener('touchend', (e) => {
      if (dragIdx === null) return;
      e.preventDefault();
      e.stopPropagation();
      clearHighlights();
      if (clone) { clone.remove(); clone = null; }
      if (dragEl) { dragEl.classList.remove('is-dragging'); }
      if (lastOverEl) doReorder(dragIdx, lastOverEl, lastOverPos);
      dragEl = null; dragIdx = null; lastOverEl = null; lastOverPos = null;
    }, { passive: false });

    list.addEventListener('touchcancel', () => {
      clearHighlights();
      if (clone) { clone.remove(); clone = null; }
      if (dragEl) { dragEl.classList.remove('is-dragging'); }
      dragEl = null; dragIdx = null; lastOverEl = null; lastOverPos = null;
    }, { passive: true });
  }

})();