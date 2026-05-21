initNav('sessions');

let session = null;
let allExercises = [];
let allWorkouts = [];
let timerInterval = null;
let notifTimeout = null;
let notifTimerInterval = null;
let modalSets = [];
let modalExId = null;
let modalIsBodyweight = false;
let modalBodyWeight = null;
let sessionCharts = [];

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    [session, allExercises] = await Promise.all([DB.getActiveSession(), DB.getExercises()]);
    if (!session) { location.href = 'sessions.html'; return; }
    allWorkouts = await DB.getWorkoutsBySession(session.id);

    document.getElementById('session-title').textContent = session.template_name;
    document.getElementById('session-subtitle').textContent = `Sesiune ${session.status === 'active' ? 'activă' : 'finalizată'}`;

    renderExercises();
    updateStartStopButtons();
    if (session.date_start) startTimer();
  } catch(e) { console.error(e); }
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
  document.getElementById('session-timer').classList.add('running');
}

function updateTimer() {
  if (!session.date_start) return;
  const elapsed = Math.floor((Date.now() - new Date(session.date_start).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  document.getElementById('session-timer').textContent =
    h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateStartStopButtons() {
  const btnStart = document.getElementById('btn-start-session');
  const btnStop  = document.getElementById('btn-stop-session');
  if (!session.date_start) {
    btnStart.style.display = 'flex';
    btnStop.style.display  = 'none';
  } else {
    btnStart.style.display = 'none';
    btnStop.style.display  = 'flex';
  }
}

document.getElementById('btn-start-session').addEventListener('click', async () => {
  session = await DB.updateSession(session.id, { date_start: new Date().toISOString() });
  updateStartStopButtons();
  startTimer();
});

document.getElementById('btn-stop-session').addEventListener('click', async () => {
  if (!confirm('Finalizezi sesiunea?')) return;
  if (timerInterval) clearInterval(timerInterval);
  if (notifTimeout) { clearTimeout(notifTimeout); clearInterval(notifTimerInterval); }
  const dateEnd = new Date().toISOString();
  const duration = session.date_start
    ? Math.round((new Date(dateEnd) - new Date(session.date_start)) / 60000)
    : null;
  await DB.updateSession(session.id, { status: 'done', date_end: dateEnd, duration_minutes: duration });
  location.href = 'sessions.html';
});

// ─── Notification timer ───────────────────────────────────────────────────────

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

document.getElementById('btn-set-notif').addEventListener('click', async () => {
  const minutes = parseInt(document.getElementById('notif-minutes').value);
  const status  = document.getElementById('notif-status');
  if (!minutes || minutes <= 0) { status.textContent = 'Introdu un număr de minute.'; status.className = 'notif-status'; return; }
  const granted = await requestNotifPermission();
  if (!granted) { status.textContent = 'Notificările sunt blocate. Activează-le din setările browserului.'; status.className = 'notif-status'; return; }
  if (notifTimeout) { clearTimeout(notifTimeout); clearInterval(notifTimerInterval); }
  const notifEndTime = Date.now() + minutes * 60 * 1000;
  notifTimerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((notifEndTime - Date.now()) / 1000));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    status.textContent = `🔔 ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    status.className = 'notif-status active';
    if (remaining === 0) clearInterval(notifTimerInterval);
  }, 1000);
  notifTimeout = setTimeout(() => {
    clearInterval(notifTimerInterval);
    status.textContent = 'Notificare trimisă!';
    status.className = 'notif-status';
    new Notification('Health Tracker', {
      body: `Sesiunea "${session.template_name}" — ai uitat să o închizi?`,
      icon: './icons/icon-192.png',
    });
  }, minutes * 60 * 1000);
});

// ─── Exercise list ────────────────────────────────────────────────────────────

function renderExercises() {
  const list = document.getElementById('active-ex-list');
  if (!session.exercise_ids || !session.exercise_ids.length) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:13px;font-family:\'DM Mono\',monospace;text-align:center;padding:2rem;">Niciun exercițiu în template.</p>';
    return;
  }

  list.innerHTML = session.exercise_ids.map((exId, idx) => {
    const ex = allExercises.find(e => e.id === exId);
    if (!ex) return '';
    const wo = allWorkouts.find(w => w.exercise_id === exId);
    const setsCount = wo ? wo.sets.filter(s => !s.warmup).length : 0;
    const hasWarmup = wo ? wo.sets.some(s => s.warmup) : false;
    const hasSets   = wo && wo.sets.length > 0;

    return `
      <div class="active-ex-item ${hasSets ? 'has-sets' : ''}">
        <div class="active-ex-head" onclick="openSetsModal('${exId}')">
          <div class="ex-drag-handle" onclick="event.stopPropagation()">
            <i class="ti ti-grip-vertical" style="color:var(--text-dim);font-size:18px;"></i>
          </div>
          <div>
            <div class="active-ex-name">${ex.name}</div>
            <div class="active-ex-group">${[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ')}</div>
          </div>
          <div class="active-ex-sets-count">
            ${hasSets ? `${setsCount} serii${hasWarmup ? ' + W' : ''}` : '<span style="color:var(--text-dim);font-size:11px;">nesalvat</span>'}
          </div>
          <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px;"></i>
        </div>
      </div>`;
  }).join('');
}

// ─── Reordonare via modal ─────────────────────────────────────────────────────

document.getElementById('btn-reorder-session').addEventListener('click', () => {
  const items = (session.exercise_ids || []).map(exId => {
    const ex = allExercises.find(e => e.id === exId);
    return ex ? { id: ex.id, label: ex.name, sublabel: ex.muscle_group || '' } : null;
  }).filter(Boolean);

  openReorderModal(items, async (newIds) => {
    session.exercise_ids = newIds;
    await DB.updateSession(session.id, { exercise_ids: newIds });
    renderExercises();
  });
});

// ─── Sets modal ───────────────────────────────────────────────────────────────

function openSetsModal(exId) {
  const ex = allExercises.find(e => e.id === exId);
  if (!ex) return;
  modalExId = exId;
  modalIsBodyweight = (ex.equipment || '').toLowerCase().includes('corporală') ||
                      (ex.equipment || '').toLowerCase().includes('corporala');
  // Ia ultima greutate inregistrata
  DB.getWeight().then(weights => {
    if (weights.length) {
      const last = weights.sort((a,b) => b.date.localeCompare(a.date))[0];
      modalBodyWeight = last.kg;
      if (modalIsBodyweight) renderModalSets();
    }
  }).catch(() => {});

  document.getElementById('sets-modal-title').textContent = ex.name;
  document.getElementById('sets-modal-meta').textContent  = [ex.muscle_group, ex.type === 'compound' ? 'Compus' : 'Izolat', ex.equipment].filter(Boolean).join(' · ') || 'Exercițiu';
  document.getElementById('modal-err').textContent = '';

  const wo = allWorkouts.find(w => w.exercise_id === exId);
  if (wo) {
    modalSets = wo.sets.map(s => ({ kg: String(s.kg), reps: String(s.reps), warmup: !!s.warmup }));
    document.getElementById('modal-notes').value = wo.notes || '';
  } else {
    modalSets = [{ kg: '', reps: '', warmup: false }];
    document.getElementById('modal-notes').value = '';
  }

  renderModalSets();
  document.getElementById('sets-modal').classList.add('open');
}

function renderModalSets() {
  const builder = document.getElementById('modal-sets-builder');
  builder.innerHTML = modalSets.map((s, i) => `
    <div class="set-row ${s.warmup ? 'set-warmup' : ''}">
      <div class="set-num">${s.warmup ? '<i class="ti ti-flame" style="color:var(--amber);font-size:12px;"></i>' : i + 1}</div>
      <div style="display:flex; flex-direction:column; gap:3px;">
        <input type="number" placeholder="kg" value="${s.kg}" min="0" step="0.5"
          oninput="modalSets[${i}].kg = this.value"
          onkeydown="modalSetKeyNav(event,${i},'kg')" />
        ${modalIsBodyweight && modalBodyWeight ? `<button onclick="modalSets[${i}].kg='${modalBodyWeight}'; renderModalSets()" style="
          background:var(--amber-dim); border:1px solid rgba(251,191,36,0.3);
          border-radius:6px; padding:3px 6px; font-family:'DM Mono',monospace;
          font-size:10px; color:var(--amber); cursor:pointer; text-align:left;
        ">${modalBodyWeight} kg ↑</button>` : ''}
      </div>
      <input type="number" placeholder="rep" value="${s.reps}" min="1"
        oninput="modalSets[${i}].reps = this.value"
        onkeydown="modalSetKeyNav(event,${i},'reps')" />
      <button class="btn-warmup-toggle ${s.warmup ? 'active' : ''}" onclick="toggleModalWarmup(${i})" title="Warmup">
        <i class="ti ti-flame"></i>
      </button>
      <button class="btn-remove-set" onclick="removeModalSet(${i})"><i class="ti ti-x"></i></button>
    </div>
  `).join('');
}

function toggleModalWarmup(idx) { modalSets[idx].warmup = !modalSets[idx].warmup; renderModalSets(); }
function removeModalSet(idx)    { if (modalSets.length > 1) { modalSets.splice(idx, 1); renderModalSets(); } }

function modalSetKeyNav(e, idx, field) {
  const rows = document.querySelectorAll('#modal-sets-builder .set-row');
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    if (field === 'kg') { rows[idx]?.querySelectorAll('input')[1]?.focus(); }
    else {
      if (rows[idx + 1]) rows[idx + 1].querySelectorAll('input')[0]?.focus();
      else { addModalSet(); setTimeout(() => { const r = document.querySelectorAll('#modal-sets-builder .set-row'); r[r.length-1]?.querySelectorAll('input')[0]?.focus(); }, 50); }
    }
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); rows[idx+1]?.querySelectorAll('input')[field==='kg'?0:1]?.focus(); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); rows[idx-1]?.querySelectorAll('input')[field==='kg'?0:1]?.focus(); }
}

function addModalSet() { modalSets.push({ kg: '', reps: '', warmup: false }); renderModalSets(); }

document.getElementById('modal-btn-add-set').addEventListener('click', () => {
  addModalSet();
  setTimeout(() => { const r = document.querySelectorAll('#modal-sets-builder .set-row'); r[r.length-1]?.querySelectorAll('input')[0]?.focus(); }, 50);
});

document.getElementById('modal-btn-cancel').addEventListener('click', () => {
  document.getElementById('sets-modal').classList.remove('open');
});
document.getElementById('sets-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('sets-modal').classList.remove('open');
});

document.getElementById('modal-btn-save').addEventListener('click', async () => {
  const errEl = document.getElementById('modal-err');
  errEl.textContent = '';
  const validSets = modalSets.filter(s => s.kg !== '' && s.reps !== '');
  if (!validSets.length) { errEl.textContent = '! Adaugă cel puțin o serie completă.'; return; }

  const notes = document.getElementById('modal-notes').value.trim();
  const today = new Date().toISOString().split('T')[0];

  const existing = allWorkouts.find(w => w.exercise_id === modalExId);
  if (existing) await DB.deleteWorkout(existing.id);

  const workout = await DB.addWorkout({
    exercise_id: modalExId,
    date:        today,
    sets:        validSets.map(s => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps), warmup: !!s.warmup })),
    notes,
    session_id:  session.id,
  });

  allWorkouts = allWorkouts.filter(w => w.exercise_id !== modalExId || w.session_id !== session.id);
  allWorkouts.push(workout);

  document.getElementById('sets-modal').classList.remove('open');
  renderExercises();
});

// ─── Charts popup ─────────────────────────────────────────────────────────────

document.getElementById('btn-show-charts').addEventListener('click', async () => {
  sessionCharts.forEach(c => c.destroy());
  sessionCharts = [];

  const content = document.getElementById('charts-popup-content');
  content.innerHTML = '';

  for (const exId of session.exercise_ids) {
    const ex = allExercises.find(e => e.id === exId);
    if (!ex) continue;

    const workouts = (await DB.getWorkouts(exId)).sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
    if (!workouts.length) continue;

    const labels  = workouts.map(w => { const [y,m,d] = w.date.split('-'); return `${d}.${m}.${y}`; });
    const maxData = workouts.map(w => { const src = w.sets.filter(s=>!s.warmup); return src.length ? Math.max(...src.map(s=>s.kg)) : Math.max(...w.sets.map(s=>s.kg)); });

    const canvasId = `chart-${exId}`;
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `
      <div class="chart-card-title">${ex.name}</div>
      <div class="chart-card-meta">${[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ') || 'Exercițiu'} · Maxim kg</div>
      <div class="chart-card-wrap"><canvas id="${canvasId}"></canvas></div>
    `;
    content.appendChild(card);

    await new Promise(r => setTimeout(r, 30));

    const c = new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Maxim kg', data: maxData,
          borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.08)',
          tension: 0.35, pointRadius: 4, pointBackgroundColor: '#a78bfa',
          pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e2026', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#7a7d87', bodyColor: '#e8e9ec', padding: 8, cornerRadius: 8 } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 10 } }, border: { color: 'transparent' } },
          x: { grid: { display: false }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 10 }, maxRotation: 30 }, border: { color: 'rgba(255,255,255,0.07)' } },
        },
      },
    });
    sessionCharts.push(c);
  }

  if (!content.children.length) {
    content.innerHTML = '<p style="color:var(--text-dim);font-size:13px;font-family:\'DM Mono\',monospace;text-align:center;padding:2rem;">Nicio dată disponibilă pentru grafice.</p>';
  }

  document.getElementById('charts-popup').classList.add('open');
});

document.getElementById('btn-close-charts').addEventListener('click', () => {
  document.getElementById('charts-popup').classList.remove('open');
  sessionCharts.forEach(c => c.destroy());
  sessionCharts = [];
});

init();