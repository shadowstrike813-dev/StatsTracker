// ─── Touch Drag & Drop ────────────────────────────────────────────────────────
// enableTouchDrag(containerEl, itemSelector, onReorder)
// onReorder(fromIdx, toIdx) — callback dupa drop

function enableTouchDrag(container, itemSelector, onReorder) {
  let dragEl   = null;
  let clone    = null;
  let fromIdx  = null;
  let lastOver = null;
  let startX   = 0;
  let startY   = 0;
  let moved    = false;

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
      opacity: 0.9;
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

  function getItemAtPoint(x, y) {
    if (clone) clone.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (clone) clone.style.display = '';
    if (!el) return null;
    const items = getItems();
    let node = el;
    while (node && node !== container) {
      if (items.includes(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function cleanup() {
    if (clone)    { clone.remove(); clone = null; }
    if (lastOver) { lastOver.classList.remove('drag-over'); lastOver = null; }
    if (dragEl)   { dragEl.style.opacity = ''; dragEl = null; }
    fromIdx = null;
    moved   = false;
  }

  // ── touchstart ──────────────────────────────────────────────────────────────
  container.addEventListener('touchstart', (e) => {
    const touch  = e.touches[0];
    const target = e.target;

    // Ignoram input-uri si butoane
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
  // NON-passive ca sa putem apela preventDefault si opri scroll-ul
  container.addEventListener('touchmove', (e) => {
    if (!dragEl) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    // Pornim dragul dupa 8px miscare
    if (!moved) {
      if (dx < 8 && dy < 8) return; // nu am miscat suficient, lasam scroll normal
      // Daca miscarea e mai mult orizontala, lasam scroll vertical
      if (dy > dx * 1.5) { dragEl = null; return; }
      moved = true;
      clone = createClone(dragEl);
      dragEl.style.opacity = '0.3';
    }

    // Oprim scroll-ul paginii cat timp dragam
    e.preventDefault();
    e.stopPropagation();

    const x = touch.clientX;
    const y = touch.clientY;

    // Muta clona dupa deget
    const rect = dragEl.getBoundingClientRect();
    clone.style.left = (x - rect.width / 2) + 'px';
    clone.style.top  = (y - rect.height / 2) + 'px';

    // Highlight element tinta
    const overEl = getItemAtPoint(x, y);

    if (lastOver && lastOver !== overEl) {
      lastOver.classList.remove('drag-over');
    }

    if (overEl && overEl !== dragEl) {
      overEl.classList.add('drag-over');
      lastOver = overEl;
    } else {
      lastOver = null;
    }
  }, { passive: false });

  // ── touchend ─────────────────────────────────────────────────────────────────
  container.addEventListener('touchend', (e) => {
    if (!dragEl) return;

    if (moved) {
      // Prevenim click-ul care urmeaza dupa touchend
      e.preventDefault();
      e.stopPropagation();

      const touch  = e.changedTouches[0];
      const overEl = getItemAtPoint(touch.clientX, touch.clientY);

      if (overEl && overEl !== dragEl) {
        const toIdx = getIdx(overEl);
        if (toIdx !== fromIdx && toIdx !== -1) {
          // Blocam click-urile pe intregul document pentru 300ms dupa drop
          // ca sa nu se deschida/inchida meniuri
          const blocker = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
          document.addEventListener('click',     blocker, { capture: true, once: false });
          document.addEventListener('touchstart', blocker, { capture: true, once: false });
          setTimeout(() => {
            document.removeEventListener('click',     blocker, { capture: true });
            document.removeEventListener('touchstart', blocker, { capture: true });
          }, 300);

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