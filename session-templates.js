initNav('sessions');

let allExercises = [];
let templates = [];
let editingId = null;
let dragSrcIdx = null;
let editDragSrcIdx = null;

// ─── Load exercises for picker ────────────────────────────────────────────────

async function loadExercises() {
  allExercises = (await DB.getExercises()).filter(e => e.active).sort((a,b) => a.order - b.order);
  renderPicker('ex-picker', []);
}

function renderPicker(containerId, selectedIds) {
  const container = document.getElementById(containerId);
  if (!allExercises.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:12px;font-family:\'DM Mono\',monospace;padding:6px;">Niciun exercițiu activ.</div>';
    return;
  }
  container.innerHTML = allExercises.map(ex => `
    <label class="ex-picker-item">
      <input type="checkbox" value="${ex.id}" ${selectedIds.includes(ex.id) ? 'checked' : ''} />
      <div class="ex-picker-item-name">${ex.name}</div>
      <div class="ex-picker-item-group">${ex.muscle_group || ''}</div>
    </label>
  `).join('');
}

function getSelectedIds(containerId) {
  return [...document.getElementById(containerId).querySelectorAll('input[type=checkbox]:checked')]
    .map(cb => cb.value);
}

// ─── Template list ────────────────────────────────────────────────────────────

async function loadTemplates() {
  templates = await DB.getSessionTemplates();
  renderTemplates();
}

function renderTemplates() {
  const list = document.getElementById('tpl-list');
  if (!templates.length) {
    list.innerHTML = '<p class="empty-tpl">Niciun template creat încă.</p>';
    return;
  }
  list.innerHTML = templates.map((tpl, tplIdx) => {
    const exNames = tpl.exercise_ids.map(id => {
      const ex = allExercises.find(e => e.id === id);
      return ex ? ex : null;
    }).filter(Boolean);
    return `
      <div class="tpl-item">
        <div class="tpl-head" onclick="toggleTpl(this)">
          <div>
            <div class="tpl-name">${tpl.name}</div>
            <div class="tpl-count">${exNames.length} exerciții</div>
          </div>
          <div class="tpl-actions" onclick="event.stopPropagation()">
            <button class="tpl-btn" onclick="openEdit('${tpl.id}')" title="Editează"><i class="ti ti-pencil"></i></button>
            <button class="tpl-btn del" onclick="deleteTpl('${tpl.id}')" title="Șterge"><i class="ti ti-trash"></i></button>
          </div>
          <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px;transition:transform 0.2s;" id="chevron-${tpl.id}"></i>
        </div>
        <div class="tpl-body" id="tpl-body-${tpl.id}">
          <div class="tpl-ex-list" id="tpl-ex-list-${tpl.id}">
            ${renderTplExList(tpl, exNames)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Touch drag & drop per template
  templates.forEach(tpl => {
    const exListEl = document.getElementById(`tpl-ex-list-${tpl.id}`);
    if (!exListEl) return;
    enableTouchDrag(exListEl, '.tpl-ex-row', async (fromIdx, toIdx) => {
      const ids = [...tpl.exercise_ids];
      const moved = ids.splice(fromIdx, 1)[0];
      ids.splice(toIdx, 0, moved);
      tpl.exercise_ids = ids;
      await DB.updateSessionTemplate(tpl.id, { exercise_ids: ids });
      renderTemplates();
    });
  });
}

function renderTplExList(tpl, exNames) {
  if (!exNames.length) return '<div style="color:var(--text-dim);font-size:12px;font-family:\'DM Mono\',monospace;">Niciun exercițiu.</div>';
  return exNames.map((ex, idx) => `
    <div class="tpl-ex-row" draggable="true" data-tpl="${tpl.id}" data-idx="${idx}"
      ondragstart="onTplDragStart(event,'${tpl.id}',${idx})"
      ondragover="onTplDragOver(event,${idx})"
      ondragleave="onTplDragLeave(event)"
      ondrop="onTplDrop(event,'${tpl.id}',${idx})"
      ondragend="onTplDragEnd(event)">
      <i class="ti ti-grip-vertical tpl-ex-drag"></i>
      <div>
        <div class="tpl-ex-name">${ex.name}</div>
        <div class="tpl-ex-group">${ex.muscle_group || ''}</div>
      </div>
    </div>
  `).join('');
}

function toggleTpl(head) {
  const id = head.closest('.tpl-item').querySelector('.tpl-body').id.replace('tpl-body-', '');
  const body = document.getElementById(`tpl-body-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
}

// ─── Drag & drop reorder within template ─────────────────────────────────────

function onTplDragStart(e, tplId, idx) {
  dragSrcIdx = idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('tplId', tplId);
}
function onTplDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (idx !== dragSrcIdx) e.currentTarget.classList.add('drag-over');
}
function onTplDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onTplDragEnd(e)   { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.tpl-ex-row').forEach(el => el.classList.remove('drag-over')); }

async function onTplDrop(e, tplId, idx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (idx === dragSrcIdx) return;
  const tpl = templates.find(t => t.id === tplId);
  if (!tpl) return;
  const ids = [...tpl.exercise_ids];
  const moved = ids.splice(dragSrcIdx, 1)[0];
  ids.splice(idx, 0, moved);
  tpl.exercise_ids = ids;
  await DB.updateSessionTemplate(tplId, { exercise_ids: ids });
  renderTemplates();
}

// ─── Add template ─────────────────────────────────────────────────────────────

document.getElementById('btn-add-tpl').addEventListener('click', async () => {
  const msg  = document.getElementById('add-msg');
  const name = document.getElementById('f-name').value.trim();
  msg.textContent = '';
  if (!name) { msg.textContent = '! Numele este obligatoriu.'; msg.className = 'save-msg err'; return; }
  const selectedIds = getSelectedIds('ex-picker');
  try {
    await DB.addSessionTemplate({ name, exercise_ids: selectedIds });
    document.getElementById('f-name').value = '';
    renderPicker('ex-picker', []);
    msg.textContent = '✓ Template adăugat'; msg.className = 'save-msg ok';
    setTimeout(() => msg.textContent = '', 2500);
    await loadTemplates();
  } catch(e) { msg.textContent = '! Eroare.'; msg.className = 'save-msg err'; }
});

// ─── Delete template ──────────────────────────────────────────────────────────

async function deleteTpl(id) {
  if (!confirm('Ștergi acest template?')) return;
  await DB.deleteSessionTemplate(id);
  await loadTemplates();
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function openEdit(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  editingId = id;
  document.getElementById('e-name').value = tpl.name;
  renderPicker('e-ex-picker', tpl.exercise_ids);
  document.getElementById('edit-msg').textContent = '';
  document.getElementById('edit-modal').classList.add('open');
}

document.getElementById('btn-cancel').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.remove('open');
  editingId = null;
});
document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) { document.getElementById('edit-modal').classList.remove('open'); editingId = null; }
});

document.getElementById('btn-save-edit').addEventListener('click', async () => {
  const msg  = document.getElementById('edit-msg');
  const name = document.getElementById('e-name').value.trim();
  msg.textContent = '';
  if (!name) { msg.textContent = '! Numele este obligatoriu.'; msg.className = 'save-msg err'; return; }
  const selectedIds = getSelectedIds('e-ex-picker');
  try {
    await DB.updateSessionTemplate(editingId, { name, exercise_ids: selectedIds });
    document.getElementById('edit-modal').classList.remove('open');
    editingId = null;
    await loadTemplates();
  } catch(e) { msg.textContent = '! Eroare.'; msg.className = 'save-msg err'; }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await loadExercises();
  await loadTemplates();
}

init();