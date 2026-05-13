initNav('workout');

const MUSCLE_ORDER = ['Piept', 'Spate', 'Umeri', 'Biceps', 'Triceps', 'Antebrat', 'Picioare', 'Core'];

function fmtDate(d) { const [y,m,day] = d.split('-'); return `${day}.${m}.${y}`; }

async function load() {
  const content = document.getElementById('content');
  try {
    const [exercises, workouts] = await Promise.all([DB.getExercises(), DB.getWorkouts()]);
    const active = exercises.filter(e => e.active).sort((a,b) => a.order - b.order);

    if (!active.length) {
      content.innerHTML = `<p class="empty-state">Niciun exercițiu configurat încă.<br><a href="configure-exercises.html">Adaugă primul exercițiu →</a></p>`;
      return;
    }

    const byEx = {};
    workouts.forEach(w => { if (!byEx[w.exercise_id]) byEx[w.exercise_id] = []; byEx[w.exercise_id].push(w); });

    const grouped = {};
    active.forEach(ex => {
      const group = ex.muscle_group || 'Altele';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ex);
    });

    const groupKeys = Object.keys(grouped).sort((a,b) => {
      const ia = MUSCLE_ORDER.indexOf(a), ib = MUSCLE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });

    content.innerHTML = groupKeys.map(group => {
      const exRows = grouped[group].map(ex => {
        const wks = (byEx[ex.id] || []).sort((a,b) => b.date.localeCompare(a.date));
        const last = wks[0] || null;
        const allMaxes = wks.map(w => Math.max(...w.sets.map(s => s.kg)));
        const globalMax = allMaxes.length ? Math.max(...allMaxes) : null;
        return `
          <a class="ex-row" href="exercise.html?id=${ex.id}">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-max">${globalMax !== null ? globalMax + ' kg' : '—'}</div>
            <div class="ex-date">${last ? fmtDate(last.date) : 'nicio sesiune'}</div>
            <div class="ex-arrow"><i class="ti ti-chevron-right"></i></div>
          </a>`;
      }).join('');
      return `<div class="muscle-group"><div class="muscle-group-title">${group}</div><div class="ex-list">${exRows}</div></div>`;
    }).join('');

  } catch(e) {
    content.innerHTML = '<p class="empty-state">Eroare la încărcare.</p>';
  }
}

load();
