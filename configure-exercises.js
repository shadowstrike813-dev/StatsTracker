initNav('workout');

let exercises = [];
let editingId = null;
let dragSrcIdx = null;

async function loadExercises() {
  try {
    exercises = await DB.getExercises();
    exercises.sort((a, b) => a.order - b.order);
    renderList();
  } catch(e) {
    document.getElementById('ex-list').innerHTML = '<p class="empty-list">Eroare la încărcare.</p>';
  }
}

function renderList() {
  const list = document.getElementById('ex-list');
  if (!exercises.length) { list.innerHTML = '<p class="empty-list">Niciun exercițiu adăugat încă.</p>'; return; }
  list.innerHTML = exercises.map((ex, idx) => `
    <div class="ex-item ${ex.active ? '' : 'inactive'}" draggable="true" data-idx="${idx}"
      ondragstart="onDragStart(event, ${idx})" ondragover="onDragOver(event, ${idx})"
      ondragleave="onDragLeave(event)" ondrop="onDrop(event, ${idx})" ondragend="onDragEnd(event)">
      <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="ex-info">
        <div class="ex-info-name">${ex.name}</div>
        <div class="ex-info-meta">${[ex.equipment, ex.target_sets ? ex.target_sets + ' serii' : '', ex.target_reps ? ex.target_reps + ' rep' : ''].filter(Boolean).join(' · ') || '—'}</div>
      </div>
      <div class="ex-group-badge">${ex.muscle_group || '—'}</div>
      <button class="ex-item-btn" onclick="openEdit('${ex.id}')" title="Editează"><i class="ti ti-pencil"></i></button>
      <button class="ex-item-btn del" onclick="deleteExercise('${ex.id}')" title="Șterge"><i class="ti ti-trash"></i></button>
    </div>
  `).join('');

  // Touch drag & drop
  enableTouchDrag(list, '.ex-item', (fromIdx, toIdx) => {
    const moved = exercises.splice(fromIdx, 1)[0];
    exercises.splice(toIdx, 0, moved);
    exercises.forEach((ex, i) => { ex.order = i + 1; });
    renderList();
    DB.reorderExercises(exercises.map(ex => ({ id: ex.id, order: ex.order })));
  });
}

function onDragStart(e, idx) { dragSrcIdx = idx; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
function onDragOver(e, idx)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (idx !== dragSrcIdx) e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e)      { e.currentTarget.classList.remove('drag-over'); }
function onDragEnd(e)        { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.ex-item').forEach(el => el.classList.remove('drag-over')); dragSrcIdx = null; }

function onDrop(e, idx) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if (idx === dragSrcIdx) return;
  const moved = exercises.splice(dragSrcIdx, 1)[0];
  exercises.splice(idx, 0, moved);
  exercises.forEach((ex, i) => { ex.order = i + 1; });
  renderList();
  DB.reorderExercises(exercises.map(ex => ({ id: ex.id, order: ex.order })));
}

document.getElementById('btn-add-ex').addEventListener('click', async () => {
  const msg  = document.getElementById('add-msg');
  const name = document.getElementById('f-name').value.trim();
  msg.textContent = '';
  if (!name) { msg.textContent = '! Numele este obligatoriu.'; msg.className = 'save-msg err'; return; }
  try {
    await DB.addExercise({
      name,
      muscle_group:    document.getElementById('f-group').value,
      type:            document.getElementById('f-type').value,
      equipment:       document.getElementById('f-equipment').value,
      target_sets:     document.getElementById('f-sets').value || null,
      target_reps:     document.getElementById('f-reps').value.trim(),
      starting_weight: document.getElementById('f-startkg').value || null,
      description:     document.getElementById('f-desc').value.trim(),
    });
    ['f-name','f-sets','f-reps','f-startkg','f-desc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-group').value = ''; document.getElementById('f-type').value = 'compound'; document.getElementById('f-equipment').value = '';
    msg.textContent = '✓ Exercițiu adăugat'; msg.className = 'save-msg ok';
    setTimeout(() => { msg.textContent = ''; }, 2500);
    await loadExercises();
  } catch(e) { msg.textContent = '! Eroare la salvare.'; msg.className = 'save-msg err'; }
});

async function deleteExercise(id) {
  if (!confirm('Ștergi exercițiul?')) return;
  try { await DB.deleteExercise(id); await loadExercises(); } catch(e) {}
}

function openEdit(id) {
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;
  editingId = id;
  document.getElementById('e-name').value      = ex.name;
  document.getElementById('e-group').value     = ex.muscle_group || '';
  document.getElementById('e-type').value      = ex.type || 'compound';
  document.getElementById('e-equipment').value = ex.equipment || '';
  document.getElementById('e-sets').value      = ex.target_sets || '';
  document.getElementById('e-reps').value      = ex.target_reps || '';
  document.getElementById('e-startkg').value   = ex.starting_weight || '';
  document.getElementById('e-active').value    = ex.active ? 'true' : 'false';
  document.getElementById('e-desc').value      = ex.description || '';
  document.getElementById('edit-msg').textContent = '';
  document.getElementById('modal').classList.add('open');
}

document.getElementById('btn-cancel').addEventListener('click', () => { document.getElementById('modal').classList.remove('open'); editingId = null; });
document.getElementById('modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) { document.getElementById('modal').classList.remove('open'); editingId = null; } });

document.getElementById('btn-save-edit').addEventListener('click', async () => {
  const msg = document.getElementById('edit-msg');
  msg.textContent = '';
  if (!editingId) return;
  const payload = {
    name:            document.getElementById('e-name').value.trim(),
    muscle_group:    document.getElementById('e-group').value,
    type:            document.getElementById('e-type').value,
    equipment:       document.getElementById('e-equipment').value,
    target_sets:     document.getElementById('e-sets').value || null,
    target_reps:     document.getElementById('e-reps').value.trim(),
    starting_weight: document.getElementById('e-startkg').value || null,
    active:          document.getElementById('e-active').value === 'true',
    description:     document.getElementById('e-desc').value.trim(),
  };
  if (!payload.name) { msg.textContent = '! Numele este obligatoriu.'; msg.className = 'save-msg err'; return; }
  try {
    await DB.updateExercise(editingId, payload);
    document.getElementById('modal').classList.remove('open');
    editingId = null;
    await loadExercises();
  } catch(e) { msg.textContent = '! Eroare la salvare.'; msg.className = 'save-msg err'; }
});

loadExercises();