initNav('sleep');

let chart = null;
let scheduleChart = null;

function fmtDate(d) { const [y, m, day] = d.split('-'); return `${day}.${m}.${y}`; }
function fmtTime(t) { return t ? t.slice(0, 5) : '—'; }
function setError(msg) { document.getElementById('err-msg').textContent = msg; }

// ─── Duration helpers ─────────────────────────────────────────────────────────

function calcDurationMinutes(sleepDate, sleepTime, wakeDate, wakeTime) {
  const sleepDt = new Date(`${sleepDate}T${sleepTime}:00`);
  const wakeDt  = new Date(`${wakeDate}T${wakeTime}:00`);
  return (wakeDt - sleepDt) / 60000;
}

function fmtDuration(minutes) {
  if (minutes === null || isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtDurationDecimal(minutes) {
  return (minutes / 60).toFixed(1);
}

function getSleepBadge(minutes) {
  const h = minutes / 60;
  if (h >= 9)   return { label: 'Lung',        cls: 'long' };
  if (h >= 7)   return { label: 'Optim',        cls: 'ok' };
  if (h >= 6)   return { label: 'Scurt',        cls: 'short' };
  return               { label: 'Insuficient',  cls: 'vshort' };
}

function timeToDecimal(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

function flashCard(id) {
  const card = document.getElementById(id)?.closest('.stat-card');
  if (!card) return;
  card.classList.remove('flash');
  void card.offsetWidth;
  card.classList.add('flash');
  card.addEventListener('animationend', () => card.classList.remove('flash'), { once: true });
}

// ─── Scroll chart wrapper ─────────────────────────────────────────────────────
// Fiecare punct ocupa BAR_W px latime, minim container e 100%

const BAR_W = 48; // px per punct de date

function setChartWidth(wrapperId, dataLen) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const minW = wrapper.parentElement.offsetWidth || 300;
  const calcW = dataLen * BAR_W;
  wrapper.style.width  = Math.max(minW, calcW) + 'px';
  wrapper.style.height = '100%';
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(entries) {
  const sorted = [...entries].sort((a, b) => {
    const da = `${a.wake_date}T${a.wake_time}`;
    const db = `${b.wake_date}T${b.wake_time}`;
    return da.localeCompare(db);
  });

  // Stats
  if (sorted.length) {
    const durations = sorted.map(e => calcDurationMinutes(e.sleep_date, e.sleep_time, e.wake_date, e.wake_time));
    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
    const max = Math.max(...durations);
    document.getElementById('avg-duration').textContent  = fmtDurationDecimal(avg);
    document.getElementById('max-duration').textContent  = fmtDurationDecimal(max);
    document.getElementById('total-entries').textContent = sorted.length;
    flashCard('avg-duration'); flashCard('max-duration'); flashCard('total-entries');
  } else {
    ['avg-duration', 'max-duration', 'total-entries'].forEach(id => document.getElementById(id).textContent = '—');
  }

  // Table
  const tbody = document.getElementById('tbl-body');
  const desc = [...sorted].reverse();
  if (!desc.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nicio înregistrare.</td></tr>';
  } else {
    tbody.innerHTML = desc.map(e => {
      const mins  = calcDurationMinutes(e.sleep_date, e.sleep_time, e.wake_date, e.wake_time);
      const badge = getSleepBadge(mins);
      return `<tr>
        <td>${fmtDate(e.wake_date)}</td>
        <td style="font-family:'DM Mono',monospace">${fmtDate(e.sleep_date)} ${fmtTime(e.sleep_time)}</td>
        <td style="font-family:'DM Mono',monospace">${fmtDate(e.wake_date)} ${fmtTime(e.wake_time)}</td>
        <td class="sleep-duration-cell">${fmtDuration(mins)}</td>
        <td><span class="sleep-badge ${badge.cls}">${badge.label}</span></td>
        <td><button class="btn-del" onclick="handleDelete('${e.id}')" title="Șterge">✕</button></td>
      </tr>`;
    }).join('');
  }

  // Charts — toate inregistrarile, nu doar 14
  if (chart) chart.destroy();
  if (scheduleChart) scheduleChart.destroy();

  if (!sorted.length) return;

  const labels    = sorted.map(e => fmtDate(e.wake_date));
  const durations = sorted.map(e => parseFloat(fmtDurationDecimal(
    calcDurationMinutes(e.sleep_date, e.sleep_time, e.wake_date, e.wake_time)
  )));

  // ── Chart 1: durată — scroll stanga/dreapta ──────────────────────────────
  setChartWidth('sleepChartWrap', sorted.length);

  chart = new Chart(document.getElementById('sleepChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ore dormite',
          data: durations,
          backgroundColor: durations.map(d =>
            d >= 7 ? 'rgba(167,139,250,0.7)' : d >= 6 ? 'rgba(251,191,36,0.7)' : 'rgba(248,113,113,0.7)'
          ),
          borderColor: durations.map(d =>
            d >= 7 ? '#a78bfa' : d >= 6 ? '#fbbf24' : '#f87171'
          ),
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Recomandare 8h',
          data: sorted.map(() => 8),
          type: 'line',
          borderColor: '#4e9eff',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: false, // dezactivam responsive ca sa controlam noi latimea
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2026',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#7a7d87',
          bodyColor: '#e8e9ec',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === 'Recomandare 8h') return '8h recomandat';
              const h = Math.floor(ctx.raw);
              const m = Math.round((ctx.raw - h) * 60);
              return `${h}h ${m}m dormite`;
            },
          },
        },
      },
      scales: {
        y: {
          min: 0, max: 12,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, callback: v => `${v}h` },
          border: { color: 'transparent' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, maxRotation: 30 },
          border: { color: 'rgba(255,255,255,0.07)' },
        },
      },
    },
  });

  // ── Chart 2: ora culcat vs ora trezit — scroll stanga/dreapta + sus/jos ──

  const sleepTimes = sorted.map(e => {
    let t = timeToDecimal(e.sleep_time);
    if (t < 12) t += 24; // dupa miezul noptii → 25, 26...
    return t;
  });

  const wakeTimes = sorted.map(e => {
    let st = timeToDecimal(e.sleep_time);
    let wt = timeToDecimal(e.wake_time);
    if (st < 12) st += 24;
    if (wt < st - 12) wt += 24;
    if (wt < st) wt += 24;
    return wt;
  });

  // ── Calculeaza axa Y centrata pe media orelor ──────────────────────────────
  const allTimes  = [...sleepTimes, ...wakeTimes];
  const avgCenter = allTimes.reduce((s, t) => s + t, 0) / allTimes.length;
  const minTime   = Math.min(...allTimes);
  const maxTime   = Math.max(...allTimes);
  // Padding de 1.5h sus/jos pentru context
  const padding   = 1.5;
  // Centram pe avgCenter dar nu taiem niciodata datele
  const halfRange = Math.max(
    avgCenter - minTime + padding,
    maxTime - avgCenter + padding,
    3 // minim 3h vizibil
  );
  const yMin = Math.floor(avgCenter - halfRange);
  const yMax = Math.ceil(avgCenter + halfRange);

  // Numarul de ticks — unul per ora in range
  const tickCount = yMax - yMin;

  setChartWidth('scheduleChartWrap', sorted.length);

  scheduleChart = new Chart(document.getElementById('scheduleChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Somn',
          data: sleepTimes.map((t, i) => [t, wakeTimes[i]]),
          backgroundColor: 'rgba(167,139,250,0.5)',
          borderColor: '#a78bfa',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2026',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#7a7d87',
          bodyColor: '#e8e9ec',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const [s, w] = ctx.raw;
              const fmt = h => {
                const hh = Math.floor(h % 24);
                const mm = Math.round((h - Math.floor(h)) * 60);
                return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
              };
              return `${fmt(s)} → ${fmt(w)}`;
            },
          },
        },
      },
      scales: {
        y: {
          min: yMin,
          max: yMax,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#4a4d57',
            font: { family: 'DM Mono', size: 11 },
            stepSize: 1,
            callback: v => {
              if (!Number.isInteger(v)) return '';
              const hh = Math.floor(v % 24);
              return `${String(hh).padStart(2,'0')}:00`;
            },
          },
          border: { color: 'transparent' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#4a4d57', font: { family: 'DM Mono', size: 11 }, maxRotation: 30 },
          border: { color: 'rgba(255,255,255,0.07)' },
        },
      },
    },
  });

  // Scroll automat la cel mai recent punct (dreapta)
  const scroll1 = document.getElementById('sleepChartScroll');
  const scroll2 = document.getElementById('scheduleChartScroll');
  if (scroll1) setTimeout(() => { scroll1.scrollLeft = scroll1.scrollWidth; }, 50);
  if (scroll2) setTimeout(() => { scroll2.scrollLeft = scroll2.scrollWidth; }, 50);
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadAndRender() {
  try {
    const entries = await DB.getSleep();
    render(entries);
  } catch (err) { setError('! Eroare la încărcare.'); }
}

// ─── Add ──────────────────────────────────────────────────────────────────────

async function handleAdd() {
  setError('');
  const sleepDate = document.getElementById('inp-sleep-date').value;
  const sleepTime = document.getElementById('inp-sleep-time').value;
  const wakeDate  = document.getElementById('inp-wake-date').value;
  const wakeTime  = document.getElementById('inp-wake-time').value;

  if (!sleepDate || !sleepTime || !wakeDate || !wakeTime) {
    setError('! Completează toate câmpurile.'); return;
  }

  const mins = calcDurationMinutes(sleepDate, sleepTime, wakeDate, wakeTime);
  if (mins <= 0) { setError('! Ora de trezire trebuie să fie după ora de culcare.'); return; }
  if (mins > 24 * 60) { setError('! Durata nu poate depăși 24 de ore.'); return; }

  try {
    await DB.addSleep({ sleep_date: sleepDate, sleep_time: sleepTime, wake_date: wakeDate, wake_time: wakeTime });
    document.getElementById('inp-sleep-time').value = '';
    document.getElementById('inp-wake-time').value  = '';
    await loadAndRender();
  } catch (err) { setError('! Eroare la salvare.'); }
}

async function handleDelete(id) {
  if (!confirm('Ștergi această înregistrare?')) return;
  try {
    await DB.deleteSleep(id);
    await loadAndRender();
  } catch (err) { setError('! Eroare la ștergere.'); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const today     = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
document.getElementById('inp-sleep-date').value = yesterday;
document.getElementById('inp-wake-date').value  = today;
document.getElementById('btn-add').addEventListener('click', handleAdd);
loadAndRender();