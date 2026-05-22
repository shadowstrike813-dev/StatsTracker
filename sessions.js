initNav('sessions');

let allSessions = [];
let allExercises = [];
let allWorkouts = [];
let templates = [];

function fmtDate(d) { const [y,m,day] = d.split('-'); return `${day}.${m}.${y}`; }
function fmtDateTime(iso) {
  if (!iso) return '—';
  const dt = new Date(iso);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}
function fmtDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function loadAll() {
  [allSessions, allExercises, allWorkouts, templates] = await Promise.all([
    DB.getSessions(), DB.getExercises(), DB.getWorkouts(), DB.getSessionTemplates()
  ]);
  allSessions.sort((a,b) => b.created_at.localeCompare(a.created_at));
  renderSessions();
  checkActiveSession();
}

function checkActiveSession() {
  const active = allSessions.find(s => s.status === 'active');
  const btn = document.getElementById('btn-new-session');
  if (active) {
    btn.textContent = '▶ Continuă sesiunea';
    btn.onclick = () => location.href = 'session-active.html';
  } else {
    btn.innerHTML = '<i class="ti ti-plus"></i> Sesiune nouă';
    btn.onclick = openTplModal;
  }
}

function renderSessions() {
  const stack = document.getElementById('sessions-stack');
  if (!allSessions.length) {
    stack.innerHTML = '<p class="empty-sessions">Nicio sesiune înregistrată.<br>Apasă "Sesiune nouă" pentru a începe.</p>';
    return;
  }

  stack.innerHTML = allSessions.map((session, idx) => {
    const isActive = session.status === 'active';
    const workouts = allWorkouts.filter(w => w.session_id === session.id);

    // Exercitii in ordinea sesiunii
    const exRows = (session.exercise_ids || []).map(exId => {
      const ex = allExercises.find(e => e.id === exId);
      if (!ex) return '';
      const wo = workouts.find(w => w.exercise_id === exId);
      const setsCount = wo ? wo.sets.filter(s => !s.warmup).length : 0;
      const maxKg = wo ? Math.max(...wo.sets.filter(s => !s.warmup).map(s => s.kg), 0) : null;
      return `
        <div class="session-ex-row" onclick="openExModal('${session.id}','${exId}')">
          <div>
            <div class="session-ex-name">${ex.name}</div>
            <div class="session-ex-sets">${wo ? `${setsCount} serii` : 'neefectuat'}</div>
          </div>
          <div class="session-ex-max">${maxKg ? maxKg + ' kg' : '—'}</div>
          <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px;"></i>
        </div>`;
    }).join('');

    // Navigare intre sesiuni cu acelasi template
    const sameTpl = allSessions.filter(s => s.template_id === session.template_id).sort((a,b) => a.created_at.localeCompare(b.created_at));
    const tplIdx  = sameTpl.findIndex(s => s.id === session.id);
    const prevId  = tplIdx > 0 ? sameTpl[tplIdx - 1].id : null;
    const nextId  = tplIdx < sameTpl.length - 1 ? sameTpl[tplIdx + 1].id : null;

    return `
      <div class="session-card" id="sc-${session.id}">
        <div class="session-card-head" onclick="${isActive ? `location.href='session-active.html'` : `toggleSession('${session.id}')`}">
          <div>
            <div class="session-card-title">${session.template_name}</div>
            <div class="session-card-meta">
              <span><i class="ti ti-calendar" style="font-size:11px;"></i> ${fmtDateTime(session.date_start || session.created_at)}</span>
              ${session.duration_minutes ? `<span><i class="ti ti-clock" style="font-size:11px;"></i> ${fmtDuration(session.duration_minutes)}</span>` : ''}
              <span>${(session.exercise_ids || []).length} exerciții</span>
            </div>
          </div>
          <span class="session-card-badge ${isActive ? 'active-badge' : ''}">${isActive ? '● Activă' : 'Finalizată'}</span>
        </div>
        <div class="session-card-body" id="scb-${session.id}">
          <div class="session-ex-list">${exRows || '<div style="padding:8px;color:var(--text-dim);font-size:12px;font-family:\'DM Mono\',monospace;">Niciun exercițiu.</div>'}</div>
          <div class="session-card-footer">
            <div class="session-nav-btns">
              <button class="btn-session-nav" onclick="scrollToSession('${prevId}')" ${!prevId ? 'disabled' : ''}>
                <i class="ti ti-arrow-left"></i> Anterioară
              </button>
              <button class="btn-session-nav" onclick="scrollToSession('${nextId}')" ${!nextId ? 'disabled' : ''}>
                Următoarea <i class="ti ti-arrow-right"></i>
              </button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              ${!isActive ? `<button class="btn-session-nav" onclick="openSessionCharts('${session.id}')"><i class="ti ti-chart-line"></i> Grafice</button>` : ''}
              <button class="btn-del-session" onclick="deleteSession('${session.id}')"><i class="ti ti-trash"></i> Șterge</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleSession(id) {
  const body = document.getElementById(`scb-${id}`);
  body.classList.toggle('open');
}

function scrollToSession(id) {
  if (!id) return;
  // Deschide cardul si scroll
  const card = document.getElementById(`sc-${id}`);
  if (!card) return;
  const body = document.getElementById(`scb-${id}`);
  body.classList.add('open');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Exercise detail modal ────────────────────────────────────────────────────

async function openExModal(sessionId, exId) {
  const ex = allExercises.find(e => e.id === exId);
  if (!ex) return;
  const workouts = allWorkouts.filter(w => w.session_id === sessionId && w.exercise_id === exId);

  document.getElementById('ex-modal-title').textContent = ex.name;

  if (!workouts.length) {
    document.getElementById('ex-modal-content').innerHTML = '<p style="color:var(--text-dim);font-size:13px;font-family:\'DM Mono\',monospace;">Nicio serie înregistrată în această sesiune.</p>';
  } else {
    const wo = workouts[0];
    document.getElementById('ex-modal-content').innerHTML = `
      <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">Serii</div>
      <div class="ex-modal-sets">
        ${wo.sets.map((s, i) => `
          <div class="ex-modal-set-row ${s.warmup ? 'warmup-row' : ''}">
            <span>${s.warmup ? '🔥 Warmup' : `Seria ${i + 1 - wo.sets.slice(0,i).filter(x=>x.warmup).length}`}</span>
            <span style="color:${s.warmup ? 'var(--text-dim)' : '#a78bfa'}">${s.kg} kg × ${s.reps} rep</span>
          </div>`).join('')}
      </div>
      ${wo.notes ? `<div style="margin-top:10px;font-size:12px;color:var(--text-dim);font-family:'DM Mono',monospace;">Note: ${wo.notes}</div>` : ''}
    `;
  }

  document.getElementById('ex-modal').classList.add('open');
}

document.getElementById('btn-close-ex-modal').addEventListener('click', () => {
  document.getElementById('ex-modal').classList.remove('open');
});
document.getElementById('ex-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('ex-modal').classList.remove('open');
});

// ─── New session modal ────────────────────────────────────────────────────────

function openTplModal() {
  const list = document.getElementById('tpl-choice-list');
  if (!templates.length) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:13px;font-family:\'DM Mono\',monospace;text-align:center;padding:1rem;">Niciun template. <a href="session-templates.html" style="color:var(--blue);">Creează unul →</a></p>';
  } else {
    list.innerHTML = templates.map(tpl => {
      const exNames = (tpl.exercise_ids || []).map(id => {
        const ex = allExercises.find(e => e.id === id);
        return ex ? ex.name : null;
      }).filter(Boolean);
      return `
        <div class="tpl-choice-item" onclick="createSession('${tpl.id}')">
          <div class="tpl-choice-name">${tpl.name}</div>
          <div class="tpl-choice-meta">${exNames.join(' · ') || 'Niciun exercițiu'}</div>
        </div>`;
    }).join('');
  }
  document.getElementById('tpl-modal').classList.add('open');
}

async function createSession(templateId) {
  document.getElementById('tpl-modal').classList.remove('open');
  const tpl = templates.find(t => t.id === templateId);
  if (!tpl) return;
  try {
    await DB.addSession({
      template_id:   tpl.id,
      template_name: tpl.name,
      exercise_ids:  [...tpl.exercise_ids],
    });
    location.href = 'session-active.html';
  } catch(e) { alert('Eroare la crearea sesiunii.'); }
}

document.getElementById('btn-cancel-tpl').addEventListener('click', () => {
  document.getElementById('tpl-modal').classList.remove('open');
});
document.getElementById('tpl-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('tpl-modal').classList.remove('open');
});

// ─── Delete session ───────────────────────────────────────────────────────────

async function deleteSession(id) {
  if (!confirm('Ștergi această sesiune? Seriile înregistrate rămân în antrenamente.')) return;
  await DB.deleteSession(id);
  await loadAll();
}

// ─── Session charts popup ─────────────────────────────────────────────────────

let sessionCharts = [];

async function openSessionCharts(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;

  sessionCharts.forEach(c => c.destroy());
  sessionCharts = [];

  const content = document.getElementById('session-charts-content');
  content.innerHTML = '';

  for (const exId of (session.exercise_ids || [])) {
    const ex = allExercises.find(e => e.id === exId);
    if (!ex) continue;

    const workouts = (await DB.getWorkouts(exId)).sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
    if (!workouts.length) continue;

    const labels  = workouts.map(w => { const [y,m,d] = w.date.split('-'); return `${d}.${m}.${y}`; });
    const maxData = workouts.map(w => { const src = w.sets.filter(s => !s.warmup); return src.length ? Math.max(...src.map(s => s.kg)) : Math.max(...w.sets.map(s => s.kg)); });

    const canvasId = `sc-chart-${exId}`;
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
        datasets: [{ label: 'Maxim kg', data: maxData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.08)', tension: 0.35, pointRadius: 4, pointBackgroundColor: '#a78bfa', pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false }],
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
    content.innerHTML = '<p style="color:var(--text-dim);font-size:13px;font-family:\'DM Mono\',monospace;text-align:center;padding:2rem;">Nicio dată disponibilă.</p>';
  }

  document.getElementById('session-charts-popup').classList.add('open');
}

document.getElementById('btn-close-session-charts').addEventListener('click', () => {
  document.getElementById('session-charts-popup').classList.remove('open');
  sessionCharts.forEach(c => c.destroy());
  sessionCharts = [];
});

// ─── Init ─────────────────────────────────────────────────────────────────────

loadAll();