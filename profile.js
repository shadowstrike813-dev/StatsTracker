initNav('profile');

function calcAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  // Parsam manual ca sa evitam problemele de timezone
  const [y, m, d] = birthdate.split('-').map(Number);
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age;
}

async function loadProfile() {
  try {
    const p = await DB.getProfile();
    // Setam explicit fiecare camp, inclusiv string gol, ca sa nu ramana valori reziduale
    document.getElementById('p-name').value      = p.name          || '';
    // Convertim ISO (yyyy-mm-dd) in dd.mm.yyyy pentru afisare
    if (p.birthdate) {
      const [y, m, d] = p.birthdate.split('-');
      document.getElementById('p-birthdate').value = d + '.' + m + '.' + y;
    } else {
      document.getElementById('p-birthdate').value = '';
    }
    document.getElementById('p-height').value    = p.height        || '';
    document.getElementById('p-target').value    = p.target_weight || '';
    document.getElementById('p-meds').value      = p.medications   || '';
    document.getElementById('p-desc').value      = p.description   || '';
    updateAge(p.birthdate || '');
  } catch (err) {}
}

function updateAge(birthdate) {
  const hint = document.getElementById('age-hint');
  const age  = calcAge(birthdate);
  hint.textContent = age !== null ? `Vârstă: ${age} ani` : '';
}

document.getElementById('p-birthdate').addEventListener('input', (e) => {
  let raw = e.target.value.replace(/\D/g, '').slice(0, 8);
  let formatted = '';
  if (raw.length <= 2) {
    formatted = raw;
  } else if (raw.length <= 4) {
    formatted = raw.slice(0,2) + '.' + raw.slice(2);
  } else {
    formatted = raw.slice(0,2) + '.' + raw.slice(2,4) + '.' + raw.slice(4);
  }
  e.target.value = formatted;

  // Calculeaza varsta daca data e completa
  if (raw.length === 8) {
    const isoDate = raw.slice(4) + '-' + raw.slice(2,4) + '-' + raw.slice(0,2);
    updateAge(isoDate);
  } else {
    updateAge('');
  }
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const msg = document.getElementById('save-msg');
  msg.textContent = '';
  const payload = {
    name:          document.getElementById('p-name').value.trim(),
    birthdate:     (function() {
      const raw = document.getElementById('p-birthdate').value.trim();
      if (!raw) return '';
      const parts = raw.split('.');
      if (parts.length === 3 && parts[2].length === 4) {
        return parts[2] + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0');
      }
      return raw; // fallback
    })(),
    height:        document.getElementById('p-height').value,
    target_weight: document.getElementById('p-target').value,
    medications:   document.getElementById('p-meds').value.trim(),
    description:   document.getElementById('p-desc').value.trim(),
  };
  try {
    await DB.saveProfile(payload);
    msg.textContent = '✓ Profil salvat';
    msg.className = 'save-msg ok';
  } catch (err) {
    msg.textContent = '! Eroare la salvare.';
    msg.className = 'save-msg err';
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
});

// ─── Export ───────────────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href     = url;
    a.download = `health-tracker-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Eroare la export.');
  }
});

// ─── Import ───────────────────────────────────────────────────────────────────

document.getElementById('btn-import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('import-msg');
  msg.textContent = '';

  try {
    const text = await file.text();
    const json = JSON.parse(text);

    if (!json.version || !json.entries) {
      msg.textContent = '! Fișier invalid.';
      msg.className = 'save-msg err';
      return;
    }

    if (!confirm('Atenție: toate datele existente vor fi înlocuite cu cele din fișier. Continui?')) return;

    // Import toate datele
    await DB.importAll(json);

    // Verifica daca exista workout-uri cu exercise_id-uri care nu au exercitiu corespunzator
    const existingExercises = await DB.getExercises();
    const existingIds = new Set(existingExercises.map(ex => ex.id));
    const workouts = await DB.getWorkouts();
    const missingIds = [...new Set(workouts.map(w => w.exercise_id))].filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      const importedExercises = json.exercises || [];

      for (const missingId of missingIds) {
        // Cauta exercitiul in fisierul importat
        const found = importedExercises.find(ex => ex.id === missingId);

        if (found) {
          // Il adaugam direct cu toate datele lui
          await DB.putExercise(found);
        } else {
          // Nu exista in fisier - cream unul placeholder
          await DB.putExercise({
            id:              missingId,
            name:            'Exercițiu importat',
            muscle_group:    '',
            type:            'compound',
            equipment:       '',
            description:     '',
            target_sets:     null,
            target_reps:     '',
            starting_weight: null,
            order:           999,
            active:          true,
          });
        }
      }
    }

    msg.textContent = '✓ Date importate cu succes.';
    msg.className = 'save-msg ok';
    await loadProfile();

  } catch (err) {
    msg.textContent = '! Eroare la import: fișier corupt sau invalid.';
    msg.className = 'save-msg err';
  }

  e.target.value = '';
  setTimeout(() => { msg.textContent = ''; }, 4000);
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('btn-import-file').click();
});

loadProfile();
