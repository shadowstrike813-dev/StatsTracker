// ─── Touch support pentru drag & drop ────────────────────────────────────────
// Simuleaza evenimente dragstart / dragover / drop / dragend pe touch devices.

(function () {
  let dragEl = null;       // elementul tras
  let clone  = null;       // clona vizuala care urmeza degetul
  let srcIdx = null;       // indexul sursa
  let lastTarget = null;   // ultimul element peste care am trecut

  function getClosestDraggable(el) {
    while (el) {
      if (el.getAttribute && el.getAttribute('draggable') === 'true') return el;
      el = el.parentElement;
    }
    return null;
  }

  function getElementAtPoint(x, y) {
    // Ascundem clona ca sa putem gasi elementul de dedesubt
    if (clone) clone.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (clone) clone.style.display = '';
    return el;
  }

  function createClone(el) {
    const rect = el.getBoundingClientRect();
    clone = el.cloneNode(true);
    clone.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      opacity: 0.85;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border-radius: 10px;
      transition: none;
      transform: scale(1.03);
    `;
    document.body.appendChild(clone);
    return clone;
  }

  function fire(el, type, x, y) {
    const rect = el.getBoundingClientRect();
    const evt = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    // Setam dataTransfer minimal
    try { evt.dataTransfer.effectAllowed = 'move'; } catch(e) {}
    el.dispatchEvent(evt);
  }

  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const target = getClosestDraggable(touch.target);
    if (!target) return;

    // Nu pornim drag daca e input/button
    if (['INPUT','BUTTON','SELECT','TEXTAREA'].includes(touch.target.tagName)) return;

    dragEl = target;
    dragEl.classList.add('dragging');
    dragEl.style.opacity = '0.3';

    clone = createClone(dragEl);
    fire(dragEl, 'dragstart', touch.clientX, touch.clientY);

    // Prevenim scroll in timp ce tragem
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!dragEl) return;
    e.preventDefault();

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Muta clona
    const rect = dragEl.getBoundingClientRect();
    clone.style.left = (x - rect.width / 2) + 'px';
    clone.style.top  = (y - rect.height / 2) + 'px';

    // Gasim elementul de dedesubt
    const below = getElementAtPoint(x, y);
    const overEl = getClosestDraggable(below);

    if (overEl && overEl !== dragEl) {
      if (lastTarget && lastTarget !== overEl) {
        fire(lastTarget, 'dragleave', x, y);
        lastTarget.classList.remove('drag-over');
      }
      if (overEl !== lastTarget) {
        fire(overEl, 'dragover', x, y);
        overEl.classList.add('drag-over');
        lastTarget = overEl;
      }
    } else if (lastTarget && (!overEl || overEl === dragEl)) {
      fire(lastTarget, 'dragleave', x, y);
      lastTarget.classList.remove('drag-over');
      lastTarget = null;
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!dragEl) return;

    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Drop
    const below = getElementAtPoint(x, y);
    const dropEl = getClosestDraggable(below);

    if (dropEl && dropEl !== dragEl) {
      dropEl.classList.remove('drag-over');
      fire(dropEl, 'drop', x, y);
    }

    fire(dragEl, 'dragend', x, y);

    // Cleanup
    dragEl.classList.remove('dragging');
    dragEl.style.opacity = '';
    if (lastTarget) { lastTarget.classList.remove('drag-over'); lastTarget = null; }
    if (clone) { clone.remove(); clone = null; }
    dragEl = null;
  }, { passive: false });

  document.addEventListener('touchcancel', () => {
    if (!dragEl) return;
    fire(dragEl, 'dragend', 0, 0);
    dragEl.classList.remove('dragging');
    dragEl.style.opacity = '';
    if (lastTarget) { lastTarget.classList.remove('drag-over'); lastTarget = null; }
    if (clone) { clone.remove(); clone = null; }
    dragEl = null;
  });
})();