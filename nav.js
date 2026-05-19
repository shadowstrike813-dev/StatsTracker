function initNav(activePage) {
  // Incarca version.js daca nu e deja incarcat
  if (typeof APP_VERSION === 'undefined') {
    const vs = document.createElement('script');
    vs.src = './version.js';
    document.head.appendChild(vs);
  }

  // ─── Update detection — mobile friendly ────────────────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {

      // Verifica update la fiecare 60 secunde (prinde si telefonul)
      setInterval(() => reg.update(), 60 * 1000);

      // Cand gaseste un worker nou
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // Workerul nou e instalat si gata — il activam imediat
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Trimitem mesaj workerului sa faca skipWaiting
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });

    // Cand controllerul s-a schimbat (workerul nou a preluat) — reincarcam automat
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      // Nu reincarcam daca utilizatorul e in mijlocul unei sesiuni active
      const isActiveSession = window.location.pathname.includes('session-active');
      if (isActiveSession) {
        showUpdateBanner(); // pe sesiunea activa doar aratam bannerul
      } else {
        location.reload();  // pe orice alta pagina reincarcam automat
      }
    });
  }

  function showUpdateBanner() {
    if (document.getElementById('update-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = `
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      background: var(--surface); border: 1px solid var(--border2);
      border-radius: var(--radius-lg); padding: 12px 20px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      z-index: 1000; font-family: 'DM Mono', monospace; font-size: 13px;
      color: var(--text); white-space: nowrap;
      animation: slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    `;
    banner.innerHTML = `
      <style>
        @keyframes slide-up {
          from { opacity:0; transform:translateX(-50%) translateY(16px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      </style>
      <i class="ti ti-refresh" style="font-size:16px;color:var(--blue);"></i>
      <span>Update disponibil</span>
      <button onclick="location.reload()" style="
        background:var(--blue); color:#000; border:none;
        border-radius:var(--radius); padding:6px 14px;
        font-family:'Syne',sans-serif; font-size:12px; font-weight:600;
        cursor:pointer;
      ">Reîncarcă</button>
      <button onclick="this.closest('#update-banner').remove()" style="
        background:none; border:none; cursor:pointer;
        color:var(--text-dim); font-size:18px; line-height:1; padding:2px;
      ">×</button>
    `;
    document.body.appendChild(banner);
  }

  // ─── Top bar ───────────────────────────────────────────────────────────────
  const topbar = document.createElement('div');
  topbar.className = 'nav-topbar';
  topbar.innerHTML = `
    <button class="nav-hamburger" id="nav-open" aria-label="Deschide meniu">
      <i class="ti ti-menu-2"></i>
    </button>
    <div class="nav-topbar-title">
      <i class="ti ti-heart-rate-monitor"></i>
      Health Tracker
    </div>
    <a href="sleep.html" class="nav-active-session" id="nav-active-sleep" style="display:none" title="Somn activ">
      <span class="nav-active-dot" style="background:var(--amber)"></span>
      <span style="color:var(--amber)">Somn activ</span>
    </a>
    <a href="session-active.html" class="nav-active-session" id="nav-active-session" style="display:none" title="Sesiune activă">
      <span class="nav-active-dot"></span>
      Sesiune activă
    </a>
  `;

  // ─── Overlay ───────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.id = 'nav-overlay';

  // ─── Drawer ────────────────────────────────────────────────────────────────
  const drawer = document.createElement('nav');
  drawer.className = 'nav-drawer';
  drawer.id = 'nav-drawer';
  drawer.setAttribute('aria-label', 'Navigare principală');

  drawer.innerHTML = `
    <div class="nav-drawer-header">
      <div class="nav-drawer-logo">
        <i class="ti ti-heart-rate-monitor"></i>
        Health Tracker
      </div>
      <button class="nav-drawer-close" id="nav-close" aria-label="Închide meniu">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <div class="nav-drawer-links">
      <a href="home.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">
        <i class="ti ti-home"></i> Home
      </a>

      <div class="nav-drawer-section">Sănătate</div>
      <a href="blood-pressure.html" class="nav-link ${activePage === 'blood-pressure' ? 'active' : ''}">
        <i class="ti ti-activity"></i> Tensiune
      </a>
      <a href="weight.html" class="nav-link ${activePage === 'weight' ? 'active' : ''}">
        <i class="ti ti-weight"></i> Greutate
      </a>
      <a href="sleep.html" class="nav-link ${activePage === 'sleep' ? 'active' : ''}">
        <i class="ti ti-moon"></i> Somn
      </a>

      <div class="nav-drawer-section">Fitness</div>
      <a href="workout.html" class="nav-link ${activePage === 'workout' ? 'active' : ''}">
        <i class="ti ti-barbell"></i> Antrenament
      </a>
      <a href="sessions.html" class="nav-link ${activePage === 'sessions' ? 'active' : ''}">
        <i class="ti ti-calendar-stats"></i> Sesiuni
      </a>
    </div>

    <div class="nav-drawer-footer">
      <a href="profile.html" class="nav-link ${activePage === 'profile' ? 'active' : ''}">
        <i class="ti ti-user"></i> Profil
      </a>
      <div class="nav-version" id="nav-version">v—</div>
    </div>
  `;

  // ─── Insert into DOM ───────────────────────────────────────────────────────
  document.body.prepend(drawer);
  document.body.prepend(overlay);
  document.body.prepend(topbar);

  // ─── Open / Close ──────────────────────────────────────────────────────────
  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  document.getElementById('nav-open').addEventListener('click', openDrawer);
  document.getElementById('nav-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // ─── Version ───────────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
    const el = document.getElementById('nav-version');
    if (el && typeof APP_VERSION !== 'undefined') el.textContent = 'v' + APP_VERSION;
  });

  // ─── Active session indicator ──────────────────────────────────────────────
  function checkIndicators() {
    DB.getActiveSession().then(s => {
      if (s) document.getElementById('nav-active-session').style.display = 'flex';
    }).catch(() => {});
    DB.getActiveSleepSession().then(s => {
      if (s) document.getElementById('nav-active-sleep').style.display = 'flex';
    }).catch(() => {});
  }

  if (typeof DB !== 'undefined') {
    checkIndicators();
  } else {
    window.addEventListener('load', () => {
      if (typeof DB !== 'undefined') checkIndicators();
    });
  }
}