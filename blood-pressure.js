initNav('blood-pressure');

const INPUT_IDS = ['inp-sys', 'inp-dia', 'inp-puls'];
let chart = null;

function getStatus(sys, dia) {
  if (sys < 90 || dia < 60)   return { label: 'Hipotensiune',  cls: 'badge-warn' };
  if (sys < 120 && dia < 80)  return { label: 'Optimă',        cls: 'badge-ok' };
  if (sys < 130 && dia < 85)  return { label: 'Normală',       cls: 'badge-ok' };
  if (sys < 140 && dia < 90)  return { label: 'Normal-înaltă', cls: 'badge-warn' };
  if (sys < 160 && dia < 100) return { label: 'HTA grad 1',    cls: 'badge-danger' };
  return                              { label: 'HTA grad 2+',   cls: 'badge-danger' };
}

function fmtDate(d) { const [y, m, day] = d.split('-'); return `${day}.${m}.${y}`; }
function setError(msg) { document.getElementById('err-msg').textContent = msg; }
function setLoading(on) {
  const btn = document.getElementById('btn-add');
  btn.disabled = on; btn.textContent = on ? 'Se salvează…' : '+ Adaugă';
}

function flashCard(id) {
  const card = document.getElementById(id)?.closest('.stat-card');
  if (!card) return;
  card.classList.remove('flash');
  void card.offsetWidth; // forteaza reflow
  card.classList.add('flash');
  card.addEventListener('animationend', () => card.classList.remove('flash'), { once: true });
}

function render(entries) {
  const allSorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const sorted = allSorted.slice(-10); // ultimele 10 pentru grafic

  if (allSorted.length) {
    document.getElementById('avg-sys').textContent  = Math.round(allSorted.reduce((s, e) => s + e.sys,  0) / allSorted.length);
    document.getElementById('avg-dia').textContent  = Math.round(allSorted.reduce((s, e) => s + e.dia,  0) / allSorted.length);
    document.getElementById('avg-puls').textContent = Math.round(allSorted.reduce((s, e) => s + e.puls, 0) / allSorted.length);
    flashCard('avg-sys'); flashCard('avg-dia'); flashCard('avg-puls');
  } else {
    ['avg-sys', 'avg-dia', 'avg-puls'].forEach(id => document.getElementById(id).textContent = '—');
  }

  const tbody = document.getElementById('tbl-body');
  const sortedDesc = [...allSorted].reverse();
  if (!sortedDesc.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nicio înregistrare.</td></tr>';
  } else {
    tbody.innerHTML = sortedDesc.map(e => {
      const st = getStatus(e.sys, e.dia);
      return `<tr class="bp-row-head" onclick="toggleBpRow(this)">
        <td>${fmtDate(e.date)}</td>
        <td style="color:#4e9eff">${e.sys} mmHg</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td><button class="btn-del" onclick="event.stopPropagation(); handleDelete('${e.id}')" title="Șterge">✕</button></td>
        <td><span class="expand-icon"><i class="ti ti-chevron-right"></i></span></td>
      </tr>
      <tr class="bp-row-body">
        <td colspan="5">
          <div class="bp-detail">
            <div class="bp-detail-item">
              <span class="bp-detail-label">Sistolică</span>
              <span class="bp-detail-value" style="color:#4e9eff">${e.sys} <small style="font-size:11px;font-weight:400">mmHg</small></span>
            </div>
            <div class="bp-detail-item">
              <span class="bp-detail-label">Diastolică</span>
              <span class="bp-detail-value" style="color:#34d399">${e.dia} <small style="font-size:11px;font-weight:400">mmHg</small></span>
            </div>
            <div class="bp-detail-item">
              <span class="bp-detail-label">Puls</span>
              <span class="bp-detail-value" style="color:#fbbf24">${e.puls} <small style="font-size:11px;font-weight:400">bpm</small></span>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  if (chart) chart.destroy();
  if (sorted.length) {
    chart = new Chart(document.getElementById('bpChart'), {
      type: 'line',
      data: {
        labels: sorted.map(e => fmtDate(e.date)),
        datasets: [
          { label: 'Sistolică', data: sorted.map(e => e.sys), borderColor: '#4e9eff', backgroundColor: 'rgba(78,158,255,0.08)', tension: 0.35, pointRadius: 5, pointBackgroundColor: '#4e9eff', pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false },
          { label: 'Diastolică', data: sorted.map(e => e.dia), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.06)', tension: 0.35, pointRadius: 5, pointBackgroundColor: '#34d399', pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false, borderDash: [6,3] },
          { label: 'Puls', data: sorted.map(e => e.puls), borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.06)', tension: 0.35, pointRadius: 5, pointBackgroundColor: '#fbbf24', pointBorderColor: '#0e0f11', pointBorderWidth: 2, fill: false, borderDash: [2,4] },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e2026', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#7a7d87', bodyColor: '#e8e9ec', padding: 10, cornerRadius: 8 } },
        scales: {
          y: { min: 50, max: 170, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 } }, border: { color: 'transparent' } },
          x: { grid: { display: false }, ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, maxRotation: 30, autoSkip: false }, border: { color: 'rgba(255,255,255,0.07)' } },
        },
      },
    });
  }
}

async function loadAndRender() {
  try {
    render(await DB.getEntries());
  } catch (err) { setError('! Eroare la încărcare.'); }
}

// ─── Dialog înlocuire / adăugare ─────────────────────────────────────────────

function showDuplicateDialog(onReplace, onAdd) {
  // Dacă există deja un dialog, îl închidem
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
          background:var(--blue); border:none; border-radius:var(--radius);
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
  const sys  = parseInt(document.getElementById('inp-sys').value);
  const dia  = parseInt(document.getElementById('inp-dia').value);
  const puls = parseInt(document.getElementById('inp-puls').value);
  setError('');
  if (!date || isNaN(sys) || isNaN(dia) || isNaN(puls)) { setError('! Completează toate câmpurile.'); return; }
  if (sys < 60 || sys > 250 || dia < 40 || dia > 160)   { setError('! Valori în afara intervalului.'); return; }

  // Verificam daca exista deja o inregistrare pentru aceasta data
  const existing = await DB.getEntries();
  const sameDay  = existing.filter(e => e.date === date);

  if (sameDay.length > 0) {
    showDuplicateDialog(
      // Înlocuiește — sterge toate din ziua respectiva si adauga noua
      async () => {
        setLoading(true);
        try {
          for (const e of sameDay) await DB.deleteEntry(e.id);
          await DB.addEntry({ date, sys, dia, puls });
          ['inp-sys', 'inp-dia', 'inp-puls'].forEach(id => document.getElementById(id).value = '');
          await loadAndRender();
        } catch (err) { setError('! Eroare la salvare.'); }
        finally { setLoading(false); }
      },
      // Adaugă nouă — adauga pur si simplu
      async () => {
        setLoading(true);
        try {
          await DB.addEntry({ date, sys, dia, puls });
          ['inp-sys', 'inp-dia', 'inp-puls'].forEach(id => document.getElementById(id).value = '');
          await loadAndRender();
        } catch (err) { setError('! Eroare la salvare.'); }
        finally { setLoading(false); }
      }
    );
    return;
  }

  setLoading(true);
  try {
    await DB.addEntry({ date, sys, dia, puls });
    ['inp-sys', 'inp-dia', 'inp-puls'].forEach(id => document.getElementById(id).value = '');
    await loadAndRender();
  } catch (err) { setError('! Eroare la salvare.'); }
  finally { setLoading(false); }
}

async function handleDelete(id) {
  if (!confirm('Ștergi această înregistrare?')) return;
  try {
    await DB.deleteEntry(id);
    await loadAndRender();
  } catch (err) { setError('! Eroare la ștergere.'); }
}

INPUT_IDS.forEach((id, idx) => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const n = INPUT_IDS[idx+1]; if (n) document.getElementById(n).focus(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); const p = INPUT_IDS[idx-1]; if (p) document.getElementById(p).focus(); }
    if (e.key === 'Enter') { e.preventDefault(); idx < INPUT_IDS.length - 1 ? document.getElementById(INPUT_IDS[idx+1]).focus() : handleAdd(); }
  });
});

document.getElementById('inp-date').value = new Date().toISOString().split('T')[0];
document.getElementById('btn-add').addEventListener('click', handleAdd);
loadAndRender();

function toggleBpRow(head) {
  const body = head.nextElementSibling;
  const isOpen = body.classList.contains('open');
  // Inchide toate celelalte
  document.querySelectorAll('.bp-row-body.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.bp-row-head.expanded').forEach(el => el.classList.remove('expanded'));
  // Toggle curent
  if (!isOpen) {
    body.classList.add('open');
    head.classList.add('expanded');
  }
}