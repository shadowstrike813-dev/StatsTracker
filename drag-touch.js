// ─── Touch Drag & Drop ────────────────────────────────────────────────────────

// Injectam stilul pentru linia indicatoare
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .drag-insert-line {
      position: fixed;
      left: 0; right: 0;
      height: 2px;
      background: var(--blue, #4e9eff);
      box-shadow: 0 0 6px rgba(78,158,255,0.8);
      z-index: 9998;
      pointer-events: none;
      border-radius: 2px;
      transition: top 0.08s ease;
    }
  `;
  document.head.appendChild(style);
})();

function enableTouchDrag(container, itemSelector, onReorder) {
  let dragEl      = null;
  let clone       = null;
  let fromIdx     = null;
  let insertLine  = null;  // linia indicatoare
  let insertIdx   = null;  // unde urmeaza sa fie inserat
  let startX      = 0;
  let startY      = 0;
  let moved       = false;
  let blockClicks = false;

  function getItems() {
    return [...container.querySelectorAll(itemSelector)];
  }

  function getIdx(el) {
    return getItems().indexOf(el);
  }

  function createClone(el) {
    const rect = el.getBoundingClientRect();
    const c = el.cloneNode(true);
    c.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      opacity: 0.85;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border-radius: 10px;
      transform: scale(1.04);
      transition: none;
    `;
    document.body.appendChild(c);
    return c;
  }

  function createInsertLine() {
    const line = document.createElement('div');
    line.className = 'drag-insert-line';
    document.body.appendChild(line);
    return line;
  }

  // Calculeaza unde sa punem linia si ce index de insert
  function updateInsertLine(x, y) {
    const items = getItems();
    if (!items.length) return;

    let bestIdx  = 0;
    let bestY    = null;
    let position = 'before'; // 'before' primul item

    for (let i = 0; i < items.length; i++) {
      if (items[i] === dragEl) continue;
      const rect   = items[i].getBoundingClientRect();
      const midY   = rect.top + rect.height / 2;

      if (y > midY) {
        // Cursorul e sub mijlocul acestui item → inseram dupa el
        bestIdx  = i + 1;
        bestY    = rect.bottom + 2;
        position = 'after';
      } else if (bestY === null) {
        // Cursorul e deasupra primului item → inseram inainte
        bestIdx = 0;
        bestY   = rect.top - 2;
        break;
      }
    }

    // Daca am depasit ultimul item
    if (bestY === null) {
      const lastRect = items[items.length - 1].getBoundingClientRect();
      bestY   = lastRect.bottom + 2;
      bestIdx = items.length;
    }

    insertIdx = bestIdx;

    // Pozitionam linia
    const containerRect = container.getBoundingClientRect();
    insertLine.style.left  = containerRect.left + 'px';
    insertLine.style.right = (window.innerWidth - containerRect.right) + 'px';
    insertLine.style.top   = bestY + 'px';
    insertLine.style.display = 'block';
  }

  function cleanup() {
    if (clone)      { clone.remove();       clone = null; }
    if (insertLine) { insertLine.remove();  insertLine = null; }
    if (dragEl)     { dragEl.style.opacity = ''; dragEl = null; }
    fromIdx   = null;
    insertIdx = null;
    moved     = false;
  }

  // ── touchstart ──────────────────────────────────────────────────────────────
  container.addEventListener('touchstart', (e) => {
    if (blockClicks) return;
    const touch  = e.touches[0];
    const target = e.target;

    if (['INPUT','BUTTON','SELECT','TEXTAREA','A'].includes(target.tagName)) return;

    const items = getItems();
    let dragItem = null;
    let node = target;
    while (node && node !== container) {
      if (items.includes(node)) { dragItem = node; break; }
      node = node.parentElement;
    }
    if (!dragItem) return;

    startX  = touch.clientX;
    startY  = touch.clientY;
    moved   = false;
    dragEl  = dragItem;
    fromIdx = getIdx(dragEl);
  }, { passive: true });

  // ── touchmove ───────────────────────────────────────────────────────────────
  container.addEventListener('touchmove', (e) => {
    if (!dragEl) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    if (!moved) {
      if (dx < 8 && dy < 8) return;
      if (dy > dx * 1.5) { dragEl = null; return; } // scroll vertical
      moved      = true;
      clone      = createClone(dragEl);
      insertLine = createInsertLine();
      dragEl.style.opacity = '0.3';
    }

    e.preventDefault();
    e.stopPropagation();

    const x = touch.clientX;
    const y = touch.clientY;

    // Muta clona
    const rect = dragEl.getBoundingClientRect();
    clone.style.left = (x - rect.width / 2) + 'px';
    clone.style.top  = (y - rect.height / 2) + 'px';

    // Actualizeaza linia
    updateInsertLine(x, y);

  }, { passive: false });

  // ── touchend ─────────────────────────────────────────────────────────────────
  container.addEventListener('touchend', (e) => {
    if (!dragEl) { cleanup(); return; }

    if (moved) {
      e.preventDefault();
      e.stopPropagation();

      // Blocam click-uri si touchstart pentru 400ms
      blockClicks = true;
      const blocker = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      document.addEventListener('click',      blocker, { capture: true });
      document.addEventListener('touchstart', blocker, { capture: true });
      document.addEventListener('touchend',   blocker, { capture: true });
      setTimeout(() => {
        document.removeEventListener('click',      blocker, { capture: true });
        document.removeEventListener('touchstart', blocker, { capture: true });
        document.removeEventListener('touchend',   blocker, { capture: true });
        blockClicks = false;
      }, 400);

      // Calculeaza toIdx real tinand cont ca scoatem dragEl din lista
      if (insertIdx !== null && insertIdx !== fromIdx) {
        // Ajustam indexul: daca inseram dupa pozitia originala, scadem 1
        let toIdx = insertIdx;
        if (insertIdx > fromIdx) toIdx = insertIdx - 1;

        if (toIdx !== fromIdx) {
          onReorder(fromIdx, toIdx);
        }
      }
    }

    cleanup();
  }, { passive: false });

  // ── touchcancel ──────────────────────────────────────────────────────────────
  container.addEventListener('touchcancel', () => {
    cleanup();
  }, { passive: true });
}