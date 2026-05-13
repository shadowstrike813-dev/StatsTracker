function initNav(activePage) {
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
    </div>

    <div class="nav-drawer-footer">
      <a href="profile.html" class="nav-link ${activePage === 'profile' ? 'active' : ''}">
        <i class="ti ti-user"></i> Profil
      </a>
    </div>
  `;

  // ─── Insert into DOM ───────────────────────────────────────────────────────
  document.body.prepend(drawer);
  document.body.prepend(overlay);
  document.body.prepend(topbar);

  // ─── Logic ────────────────────────────────────────────────────────────────
  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('nav-open').addEventListener('click', openDrawer);
  document.getElementById('nav-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);



  // Inchide cu Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}