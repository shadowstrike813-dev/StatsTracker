initNav('workout');

const params = new URLSearchParams(location.search);
const EXERCISE_ID = params.get('id');
if (!EXERCISE_ID) location.href = 'workout.html';

let sets = [{ kg: '', reps: '', warmup: false }];
let chart = null;
let globalPR = 0; // PR-ul anterior salvărilor curente

function fmtDate(d) { const [y,m,day] = d.split('-'); return `${day}.${m}.${y}`; }
function setError(msg) { document.getElementById('err-msg').textContent = msg; }

// ─── Sets builder UI ─────────────────────────────────────────────────────────

function renderSets() {
  const builder = document.getElementById('sets-builder');
  builder.innerHTML = sets.map((s, i) => `
    <div class="set-row ${s.warmup ? 'set-warmup' : ''}">
      <div class="set-num">${s.warmup ? '<i class="ti ti-flame" style="color:var(--amber);font-size:13px;" title="Warmup"></i>' : i + 1}</div>
      <input type="number" placeholder="kg" value="${s.kg}" min="0" step="0.5"
        oninput="sets[${i}].kg = this.value"
        onkeydown="setKeyNav(event, ${i}, 'kg')" />
      <input type="number" placeholder="rep" value="${s.reps}" min="1"
        oninput="sets[${i}].reps = this.value"
        onkeydown="setKeyNav(event, ${i}, 'reps')" />
      <button class="btn-warmup-toggle ${s.warmup ? 'active' : ''}" onclick="toggleWarmup(${i})" title="${s.warmup ? 'Marchează ca serie normală' : 'Marchează ca warmup'}">
        <i class="ti ti-flame"></i>
      </button>
      <button class="btn-remove-set" onclick="removeSet(${i})" title="Sterge seria">
        <i class="ti ti-x"></i>
      </button>
    </div>
  `).join('');
}

function toggleWarmup(idx) {
  sets[idx].warmup = !sets[idx].warmup;
  renderSets();
}

function setKeyNav(e, idx, field) {
  const rows = document.querySelectorAll('.set-row');
  const colIdx = field === 'kg' ? 0 : 1;

  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    if (field === 'kg') {
      rows[idx]?.querySelectorAll('input')[1]?.focus();
    } else {
      if (rows[idx + 1]) {
        rows[idx + 1].querySelectorAll('input')[0]?.focus();
      } else {
        addSet();
        setTimeout(() => {
          const newRows = document.querySelectorAll('.set-row');
          newRows[newRows.length - 1]?.querySelectorAll('input')[0]?.focus();
        }, 50);
      }
    }
    return;
  }

  if (e.key === 'ArrowRight') { e.preventDefault(); if (field === 'kg') rows[idx]?.querySelectorAll('input')[1]?.focus(); return; }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); if (field === 'reps') rows[idx]?.querySelectorAll('input')[0]?.focus(); return; }
  if (e.key === 'ArrowDown')  { e.preventDefault(); rows[idx + 1]?.querySelectorAll('input')[colIdx]?.focus(); return; }
  if (e.key === 'ArrowUp')    { e.preventDefault(); rows[idx - 1]?.querySelectorAll('input')[colIdx]?.focus(); return; }
}

function addSet() {
  sets.push({ kg: '', reps: '', warmup: false });
  renderSets();
}

function removeSet(idx) {
  if (sets.length === 1) return;
  sets.splice(idx, 1);
  renderSets();
}

document.getElementById('btn-add-set').addEventListener('click', () => {
  addSet();
  setTimeout(() => {
    const rows = document.querySelectorAll('.set-row');
    rows[rows.length - 1]?.querySelectorAll('input')[0]?.focus();
  }, 50);
});

// ─── PR Badge ─────────────────────────────────────────────────────────────────

function showPRBadge(newMax) {
  const existing = document.getElementById('pr-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.id = 'pr-badge';
  badge.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #a78bfa, #7c3aed);
    color: #fff; border-radius: 40px;
    padding: 10px 20px; font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 4px 24px rgba(124,58,237,0.4);
    z-index: 400; animation: pr-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
    white-space: nowrap;
  `;
  badge.innerHTML = `<i class="ti ti-trophy" style="font-size:16px;"></i> Record nou: ${newMax} kg! 🏆`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pr-in {
      from { opacity:0; transform:translateX(-50%) translateY(-16px) scale(0.85); }
      to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(badge);

  setTimeout(() => {
    badge.style.transition = 'opacity 0.5s, transform 0.5s';
    badge.style.opacity = '0';
    badge.style.transform = 'translateX(-50%) translateY(-8px)';
    setTimeout(() => badge.remove(), 500);
  }, 3000);
}

// ─── Save session ─────────────────────────────────────────────────────────────

document.getElementById('btn-save').addEventListener('click', async () => {
  setError('');
  const date  = document.getElementById('inp-date').value;
  const notes = document.getElementById('inp-notes').value.trim();

  if (!date) { setError('! Alege o data.'); return; }

  const validSets = sets.filter(s => s.kg !== '' && s.reps !== '');
  if (!validSets.length) { setError('! Adauga cel putin o serie completa (kg + rep).'); return; }

  // Seriile de warmup nu intră în calcule (dar le salvăm cu flag)
  const workingSets   = validSets.filter(s => !s.warmup);
  const sessionMax    = workingSets.length
    ? Math.max(...workingSets.map(s => parseFloat(s.kg)))
    : Math.max(...validSets.map(s => parseFloat(s.kg)));

  const payload = {
    exercise_id: EXERCISE_ID,
    date,
    sets: validSets.map(s => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps), warmup: !!s.warmup })),
    notes,
  };

  try {
    await DB.addWorkout(payload);

    // Verificam PR
    if (workingSets.length && sessionMax > globalPR) {
      showPRBadge(sessionMax);
    }

    sets = [{ kg: '', reps: '', warmup: false }];
    renderSets();
    document.getElementById('inp-notes').value = '';
    await loadWorkouts();
  } catch(e) { setError('! Eroare la salvare.'); }
});

// ─── Load & render ────────────────────────────────────────────────────────────

async function loadWorkouts() {
  try {
    const workouts = await DB.getWorkouts(EXERCISE_ID);
    const allSorted = workouts.sort((a,b) => a.date.localeCompare(b.date));
    const sorted = allSorted.slice(-10); // Ultimele 10 sesiuni pentru grafic

    // Stats — excludem warmup din calcule
    if (allSorted.length) {
      const allMaxes = allSorted.map(w => {
        const working = w.sets.filter(s => !s.warmup);
        const src = working.length ? working : w.sets;
        return Math.max(...src.map(s => s.kg));
      });
      globalPR = Math.max(...allMaxes);
      const last = allSorted[allSorted.length - 1];
      const lastWorking = last.sets.filter(s => !s.warmup);
      const lastMax = Math.max(...(lastWorking.length ? lastWorking : last.sets).map(s => s.kg));
      document.getElementById('stat-max').textContent       = globalPR + ' kg';
      document.getElementById('stat-sessions').textContent  = allSorted.length;
      document.getElementById('stat-last').textContent      = lastMax + ' kg';
      document.getElementById('stat-last-date').textContent = fmtDate(last.date);
      ['stat-max','stat-sessions','stat-last'].forEach(id => {
        const card = document.getElementById(id)?.closest('.stat-card');
        if (!card) return;
        card.classList.remove('flash');
        void card.offsetWidth;
        card.classList.add('flash');
        card.addEventListener('animationend', () => card.classList.remove('flash'), { once: true });
      });
    } else {
      globalPR = 0;
      document.getElementById('stat-max').textContent       = '—';
      document.getElementById('stat-sessions').textContent  = '0';
      document.getElementById('stat-last').textContent      = '—';
      document.getElementById('stat-last-date').textContent = 'nicio sesiune';
    }

    // Chart — excludem warmup din volum și maxim
    if (chart) chart.destroy();
    if (sorted.length) {
      const labels  = sorted.map(w => fmtDate(w.date));
      const maxData = sorted.map(w => {
        const working = w.sets.filter(s => !s.warmup);
        const src = working.length ? working : w.sets;
        return Math.max(...src.map(s => s.kg));
      });
      const volData = sorted.map(w =>
        w.sets.filter(s => !s.warmup).reduce((sum, s) => sum + s.kg * s.reps, 0)
      );

      chart = new Chart(document.getElementById('exChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Maxim kg', data: maxData, yAxisID: 'y',
              borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.08)',
              tension: 0.35, pointRadius: 5, pointBackgroundColor: '#a78bfa',
              pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false,
            },
            {
              label: 'Volum', data: volData, yAxisID: 'y2',
              borderColor: '#4e9eff', backgroundColor: 'rgba(78,158,255,0.06)',
              tension: 0.35, pointRadius: 4, pointBackgroundColor: '#4e9eff',
              pointBorderColor: '#0e0f11', pointBorderWidth: 2,
              fill: false, borderDash: [5, 3],
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1e2026', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#7a7d87', bodyColor: '#e8e9ec', padding: 10, cornerRadius: 8 }
          },
          scales: {
            y:  { position: 'left',  grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 } }, border: { color: 'transparent' } },
            y2: { position: 'right', grid: { display: false }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 } }, border: { color: 'transparent' } },
            x:  { grid: { display: false }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, maxRotation: 30, autoSkip: true }, border: { color: 'rgba(255,255,255,0.07)' } },
          },
        },
      });
    }

    // History
    const historyEl = document.getElementById('history');
    if (!allSorted.length) {
      historyEl.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-dim);font-family:DM Mono,monospace;font-size:13px;">Nicio sesiune inregistrata.</p>';
      return;
    }

    historyEl.innerHTML = [...allSorted].reverse().map(w => {
      const workingSets = w.sets.filter(s => !s.warmup);
      const src    = workingSets.length ? workingSets : w.sets;
      const maxKg  = Math.max(...src.map(s => s.kg));
      const vol    = workingSets.reduce((sum, s) => sum + s.kg * s.reps, 0);
      const warmupCount = w.sets.filter(s => s.warmup).length;
      return `
        <div class="session-block">
          <div class="session-head" onclick="toggleSession(this)">
            <div class="session-date">${fmtDate(w.date)}</div>
            <div class="session-summary">${workingSets.length} serii${warmupCount ? ` + ${warmupCount}W` : ''} · vol ${vol} kg</div>
            <div class="session-max">${maxKg} kg</div>
          </div>
          <div class="session-body">
            <div class="session-sets">
              ${w.sets.map((s, i) => `
                <div class="session-set-row ${s.warmup ? 'set-warmup-row' : ''}">
                  <span>${s.warmup ? '<i class="ti ti-flame" style="color:var(--amber);font-size:12px;"></i> Warmup ' : `Seria ${i + 1 - w.sets.slice(0, i).filter(x => x.warmup).length} `}</span>
                  <span style="${s.warmup ? 'color:var(--text-dim)' : ''}">${s.kg} kg x ${s.reps} rep</span>
                </div>`).join('')}
              ${w.notes ? `<div style="margin-top:6px;color:var(--text-dim)">Note: ${w.notes}</div>` : ''}
            </div>
            <button class="btn-del-session" onclick="deleteSession('${w.id}')">
              <i class="ti ti-trash"></i> Sterge sesiunea
            </button>
          </div>
        </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

function toggleSession(head) {
  head.nextElementSibling.classList.toggle('open');
}

async function deleteSession(id) {
  if (!confirm('Stergi aceasta sesiune?')) return;
  try {
    await DB.deleteWorkout(id);
    await loadWorkouts();
  } catch(e) {}
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const exercises = await DB.getExercises();
    const found = exercises.find(e => e.id === EXERCISE_ID);
    if (!found) { location.href = 'workout.html'; return; }
    document.title = `${found.name} — Health Tracker`;
    document.getElementById('ex-title').textContent = found.name;
    const meta = [found.muscle_group, found.type === 'compound' ? 'Compus' : 'Izolat', found.equipment].filter(Boolean).join(' · ');
    document.getElementById('ex-meta').textContent = meta || 'Exercitiu';
  } catch(e) {}

  document.getElementById('inp-date').value = new Date().toISOString().split('T')[0];
  renderSets();
  await loadWorkouts();
}

init();