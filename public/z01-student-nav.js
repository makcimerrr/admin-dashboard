/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM → aucun conflit de style avec l'app hôte).
 *
 * Intégration :
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 *
 * - **Desktop (≥768px)** : sidebar verticale fixe à gauche (comme le hub).
 * - **Mobile (<768px)** : barre fixe en bas (style PWA / tab-bar).
 * - Liens en MÊME ONGLET (pas de target=_blank) → avec le SSO Authentik, on
 *   arrive déjà connecté : impression de rester dans la même app.
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var SIDEBAR_W = 76; // px (desktop)
  var BAR_H = 60; // px (mobile)

  var APPS = [
    { key: 'hub', label: 'Hub', href: 'https://hub.zone01normandie.org/',
      icon: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>' },
    { key: 'emargement', label: 'Émargement', href: 'https://emargement.zone01normandie.org/',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { key: 'deck', label: '01 Deck', href: 'https://deck.zone01normandie.org/',
      icon: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>' },
  ];

  var STYLE =
    ':host{--z01-bg:#0b0b0f;--z01-fg:#e6e6ea;--z01-muted:#8a8a96;--z01-accent:#2f6df6;--z01-border:rgba(255,255,255,.08)}' +
    '@media (prefers-color-scheme: light){:host{--z01-bg:#ffffff;--z01-fg:#10121a;--z01-muted:#5f6470;--z01-border:rgba(0,0,0,.10)}}' +
    'nav{position:fixed;z-index:2147483000;display:flex;background:var(--z01-bg);' +
    'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.inner{display:flex;flex:1}' +
    'a{display:flex;align-items:center;justify-content:center;gap:3px;text-decoration:none;' +
    'color:var(--z01-muted);font-size:11px;font-weight:500;position:relative;' +
    'transition:color .15s,background .15s;-webkit-tap-highlight-color:transparent}' +
    'a:hover{color:var(--z01-fg)}a.active{color:var(--z01-accent)}' +
    'svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ind{position:absolute;background:var(--z01-accent);opacity:0;transition:opacity .15s}' +
    'a.active .ind{opacity:1}' +
    /* ---- Mobile : barre en bas ---- */
    '@media (max-width:767px){' +
    'nav{left:0;right:0;bottom:0;flex-direction:row;justify-content:center;' +
    'border-top:1px solid var(--z01-border);box-shadow:0 -2px 12px rgba(0,0,0,.15);padding-bottom:env(safe-area-inset-bottom,0)}' +
    '.inner{flex-direction:row;max-width:560px}' +
    'a{flex:1;flex-direction:column;padding:8px 4px 6px;min-height:54px}' +
    '.ind{top:0;left:50%;transform:translateX(-50%);height:2px;width:34px;border-radius:0 0 3px 3px}' +
    '}' +
    /* ---- Desktop : sidebar à gauche ---- */
    '@media (min-width:768px){' +
    'nav{left:0;top:0;bottom:0;width:' + SIDEBAR_W + 'px;flex-direction:column;' +
    'border-right:1px solid var(--z01-border);box-shadow:2px 0 12px rgba(0,0,0,.12);padding-top:14px}' +
    '.inner{flex-direction:column;gap:4px}' +
    'a{flex-direction:column;width:100%;padding:12px 4px;gap:5px}' +
    'a:hover{background:color-mix(in srgb,var(--z01-fg) 6%,transparent)}' +
    'a.active{background:color-mix(in srgb,var(--z01-accent) 12%,transparent)}' +
    '.ind{left:0;top:50%;transform:translateY(-50%);width:3px;height:26px;border-radius:0 3px 3px 0}' +
    '}';

  function render(active) {
    var items = APPS.map(function (app) {
      var on = app.key === active;
      return (
        '<a class="' + (on ? 'active' : '') + '" href="' + app.href + '"' + (on ? ' aria-current="page"' : '') + '>' +
        '<span class="ind"></span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg>' +
        '<span>' + app.label + '</span></a>'
      );
    }).join('');
    return '<style>' + STYLE + '</style><nav><div class="inner">' + items + '</div></nav>';
  }

  function ensureBodySpace() {
    // Réserve l'espace pour la barre fixe (ignoré sur layouts en position:fixed
    // comme le hub, qui gèrent leur propre padding ; utile pour émargement/01deck).
    if (document.getElementById('z01-nav-body-pad')) return;
    var st = document.createElement('style');
    st.id = 'z01-nav-body-pad';
    st.textContent =
      '@media (max-width:767px){body{padding-bottom:calc(' + BAR_H + 'px + env(safe-area-inset-bottom,0px))}}' +
      '@media (min-width:768px){body{padding-left:' + SIDEBAR_W + 'px}}';
    document.head.appendChild(st);
  }

  var Z01StudentNav = (function () {
    function Z01StudentNav() {
      return Reflect.construct(HTMLElement, [], Z01StudentNav);
    }
    Z01StudentNav.prototype = Object.create(HTMLElement.prototype);
    Z01StudentNav.prototype.constructor = Z01StudentNav;
    Z01StudentNav.observedAttributes = ['active'];
    Z01StudentNav.prototype.connectedCallback = function () {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = render(this.getAttribute('active') || '');
      ensureBodySpace();
    };
    Z01StudentNav.prototype.attributeChangedCallback = function () {
      if (this.shadowRoot) this.shadowRoot.innerHTML = render(this.getAttribute('active') || '');
    };
    Object.setPrototypeOf(Z01StudentNav, HTMLElement);
    return Z01StudentNav;
  })();

  customElements.define('z01-student-nav', Z01StudentNav);
})();
