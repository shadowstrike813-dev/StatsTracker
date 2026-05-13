initNav('weight');

let chart = null;
let profileHeight = null;

function fmtDate(d) { const [y, m, day] = d.split('-'); return `${day}.${m}.${y}`; }
function setError(msg) { document.getElementById('err-msg').textContent = msg; }
function setLoading(on) {
  const btn = document.getElementById('btn-add');
  btn.disabled = on; btn.textContent = on ? 'Se salvează…' : '+ Adaugă';
}

function calcBmi(kg, heightCm) {
  if (!heightCm) return null;
  const h = heightCm / 100;
  return Math.round((kg / (h * h)) * 10) / 10;
}

function bmiLabel(bmi) {
  if (bmi < 18.5) return 'Subponderal';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Supraponderal';
  return 'Obezitate';
}

function render(entries, targetWeight) {
  const allSorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const sorted = allSorted.slice(-10); // ultimele 10 pentru grafic

  if (allSorted.length) {
    const last = allSorted[allSorted.length - 1];
    const avg  = Math.round((allSorted.reduce((s, e) => s + e.kg, 0) / allSorted.length) * 10) / 10;

    // Delta față de penultima înregistrare
    let deltaHtml = '';
    if (allSorted.length >= 2) {
      const prev  = allSorted[allSorted.length - 2];
      const delta = Math.round((last.kg - prev.kg) * 10) / 10;
      if (delta > 0) {
        deltaHtml = `<div style="font-size:12px; font-family:'DM Mono',monospace; color:var(--red); margin-top:3px;">▲ +${delta} kg față de ${fmtDate(prev.date)}</div>`;
      } else if (delta < 0) {
        deltaHtml = `<div style="font-size:12px; font-family:'DM Mono',monospace; color:var(--green); margin-top:3px;">▼ ${delta} kg față de ${fmtDate(prev.date)}</div>`;
      } else {
        deltaHtml = `<div style="font-size:12px; font-family:'DM Mono',monospace; color:var(--text-dim); margin-top:3px;">= nicio schimbare față de ${fmtDate(prev.date)}</div>`;
      }
    }

    const lastCard = document.getElementById('last-kg');
    lastCard.textContent = `${last.kg} kg`;
    // Adaugam delta sub valoare
    let deltaEl = document.getElementById('weight-delta');
    if (!deltaEl) {
      deltaEl = document.createElement('div');
      deltaEl.id = 'weight-delta';
      lastCard.parentNode.appendChild(deltaEl);
    }
    deltaEl.innerHTML = deltaHtml;

    document.getElementById('avg-kg').textContent = `${avg} kg`;
    if (profileHeight) {
      const bmi = calcBmi(last.kg, profileHeight);
      document.getElementById('bmi-val').textContent   = bmi;
      document.getElementById('bmi-label').textContent = bmiLabel(bmi);
    }
  } else {
    ['last-kg', 'avg-kg', 'bmi-val'].forEach(id => document.getElementById(id).textContent = '—');
    const deltaEl = document.getElementById('weight-delta');
    if (deltaEl) deltaEl.innerHTML = '';
  }

  const tbody = document.getElementById('tbl-body');
  const sortedDesc = [...allSorted].reverse();
  if (!sortedDesc.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Nicio înregistrare.</td></tr>';
  } else {
    tbody.innerHTML = sortedDesc.map((e, idx) => {
      const bmi  = profileHeight ? calcBmi(e.kg, profileHeight) : '—';
      // Delta față de înregistrarea anterioară (în ordine descrescătoare, deci următoarea din array)
      const prev = sortedDesc[idx + 1];
      let deltaCell = '';
      if (prev) {
        const d = Math.round((e.kg - prev.kg) * 10) / 10;
        if (d > 0)      deltaCell = `<span style="color:var(--red);font-size:11px;">▲ +${d}</span>`;
        else if (d < 0) deltaCell = `<span style="color:var(--green);font-size:11px;">▼ ${d}</span>`;
        else            deltaCell = `<span style="color:var(--text-dim);font-size:11px;">—</span>`;
      }
      return `<tr>
        <td>${fmtDate(e.date)}</td>
        <td style="color:#34d399">${e.kg} kg ${deltaCell}</td>
        <td class="hide-mobile" style="color:#fbbf24">${bmi}</td>
        <td><button class="btn-del" onclick="handleDelete('${e.id}')" title="Șterge">✕</button></td>
      </tr>`;
    }).join('');
  }

  if (chart) chart.destroy();
  if (sorted.length) {
    const datasets = [
      { label: 'Greutate', data: sorted.map(e => e.kg), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', tension: 0.35, pointRadius: 5, pointBackgroundColor: '#34d399', pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false },
    ];
    if (targetWeight) {
      datasets.push({ label: 'Obiectiv', data: sorted.map(() => targetWeight), borderColor: '#fbbf24', borderDash: [6, 4], pointRadius: 0, fill: false, tension: 0 });
    }
    chart = new Chart(document.getElementById('weightChart'), {
      type: 'line',
      data: { labels: sorted.map(e => fmtDate(e.date)), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e2026', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#7a7d87', bodyColor: '#e8e9ec', padding: 10, cornerRadius: 8 } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 } }, border: { color: 'transparent' } },
          x: { grid: { display: false }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, maxRotation: 30, autoSkip: false }, border: { color: 'rgba(255,255,255,0.07)' } },
        },
      },
    });
  }
}

async function loadAndRender() {
  try {
    const [entries, profile] = await Promise.all([DB.getWeight(), DB.getProfile()]);
    profileHeight = profile.height || null;
    render(entries, profile.target_weight || null);
  } catch (err) { setError('! Eroare la încărcare.'); }
}

// ─── Dialog înlocuire / adăugare ─────────────────────────────────────────────

function showDuplicateDialog(onReplace, onAdd) {
  const existing = document.getElementById('dup-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.id = 'dup-dialog';
  dialog.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 300; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  `;
  dialog.innerHTML = `
    <div style="
      background: var(--surface); border: 1px solid var(--border2);
      border-radius: var(--radius-lg); padding: 1.5rem;
      max-width: 360px; width: 100%;
    ">
      <div style="font-size:15px; font-weight:600; margin-bottom:8px;">Măsurătoare existentă</div>
      <div style="font-size:13px; color:var(--text-muted); font-family:'DM Mono',monospace; margin-bottom:1.25rem; line-height:1.5;">
        Există deja o înregistrare pentru această dată.<br>Ce dorești să faci?
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button id="dup-cancel" style="
          background:none; border:1px solid var(--border2); border-radius:var(--radius);
          padding:8px 14px; color:var(--text-muted); font-family:'Syne',sans-serif;
          font-size:13px; cursor:pointer;
        ">Anulează</button>
        <button id="dup-add" style="
          background:var(--surface3); border:1px solid var(--border2); border-radius:var(--radius);
          padding:8px 14px; color:var(--text); font-family:'Syne',sans-serif;
          font-size:13px; cursor:pointer; font-weight:600;
        ">Adaugă nouă</button>
        <button id="dup-replace" style="
          background:var(--green); border:none; border-radius:var(--radius);
          padding:8px 14px; color:#000; font-family:'Syne',sans-serif;
          font-size:13px; cursor:pointer; font-weight:600;
        ">Înlocuiește</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  document.getElementById('dup-cancel').onclick  = () => dialog.remove();
  document.getElementById('dup-add').onclick     = () => { dialog.remove(); onAdd(); };
  document.getElementById('dup-replace').onclick = () => { dialog.remove(); onReplace(); };
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
}

async function handleAdd() {
  const date = document.getElementById('inp-date').value;
  const kg   = parseFloat(document.getElementById('inp-kg').value);
  setError('');
  if (!date || isNaN(kg)) { setError('! Completează toate câmpurile.'); return; }
  if (kg < 20 || kg > 300) { setError('! Greutate în afara intervalului.'); return; }

  // Verificam daca exista deja o inregistrare pentru aceasta data
  const existing = await DB.getWeight();
  const sameDay  = existing.filter(e => e.date === date);

  if (sameDay.length > 0) {
    showDuplicateDialog(
      async () => {
        setLoading(true);
        try {
          for (const e of sameDay) await DB.deleteWeight(e.id);
          await DB.addWeight({ date, kg });
          document.getElementById('inp-kg').value = '';
          await loadAndRender();
        } catch (err) { setError('! Eroare la salvare.'); }
        finally { setLoading(false); }
      },
      async () => {
        setLoading(true);
        try {
          await DB.addWeight({ date, kg });
          document.getElementById('inp-kg').value = '';
          await loadAndRender();
        } catch (err) { setError('! Eroare la salvare.'); }
        finally { setLoading(false); }
      }
    );
    return;
  }

  setLoading(true);
  try {
    await DB.addWeight({ date, kg });
    document.getElementById('inp-kg').value = '';
    await loadAndRender();
  } catch (err) { setError('! Eroare la salvare.'); }
  finally { setLoading(false); }
}

async function handleDelete(id) {
  if (!confirm('Ștergi această înregistrare?')) return;
  try {
    await DB.deleteWeight(id);
    await loadAndRender();
  } catch (err) { setError('! Eroare la ștergere.'); }
}

document.getElementById('inp-kg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
});

document.getElementById('inp-date').value = new Date().toISOString().split('T')[0];
document.getElementById('btn-add').addEventListener('click', handleAdd);
loadAndRender();