/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM). Style aligné sur la sidebar du hub :
 * étroite (64px), icônes seules, fond très sombre, logo bleu en haut, item actif
 * bleu + barre à gauche, tooltips au survol.
 *
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 *
 * - Desktop (≥768px) : sidebar verticale fixe à gauche (comme le hub).
 * - Mobile (<768px)  : barre fixe en bas (PWA).
 * - Liens en MÊME ONGLET.
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var SIDEBAR_W = 64;
  var BAR_H = 58;

  var APPS = [
    { key: 'hub', label: 'Hub', href: 'https://hub.zone01normandie.org/',
      icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>' },
    { key: 'emargement', label: 'Émargement', href: 'https://emargement.zone01normandie.org/',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v4.5l3 2"/>' },
    { key: 'deck', label: '01 Deck', href: 'https://deck.zone01normandie.org/',
      icon: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>' },
  ];

  var STYLE =
    // Palette alignée sur le hub (mode sombre par défaut, override clair).
    ':host{--bg:hsl(240 6% 6%);--fg:hsl(240 5% 72%);--accent:hsl(240 4% 13%);' +
    '--accent-fg:hsl(0 0% 98%);--primary:hsl(217 91% 60%);--border:hsl(240 4% 13%)}' +
    '@media (prefers-color-scheme: light){:host{--bg:hsl(240 6% 98%);--fg:hsl(240 5% 35%);' +
    '--accent:hsl(240 5% 94%);--accent-fg:hsl(240 6% 12%);--primary:hsl(217 91% 53%);--border:hsl(240 6% 90%)}}' +
    'nav{position:fixed;z-index:2147483000;display:flex;background:var(--bg);' +
    'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.brand{display:none}' +
    'a{position:relative;display:flex;align-items:center;justify-content:center;text-decoration:none;' +
    'color:var(--fg);border-radius:8px;transition:color .15s,background .15s}' +
    'a:hover{background:color-mix(in srgb,var(--accent) 60%,transparent);color:var(--accent-fg)}' +
    'a.active{background:var(--accent);color:var(--primary)}' +
    'svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ind{position:absolute;background:var(--primary);opacity:0}a.active .ind{opacity:1}' +
    '.lbl{display:none}' +
    // Tooltip (desktop)
    '.tip{position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'background:hsl(240 6% 12%);color:#fff;font-size:12px;padding:4px 8px;border-radius:6px;opacity:0;' +
    'pointer-events:none;transition:opacity .12s;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:1}' +
    /* ---- Desktop : sidebar ---- */
    '@media (min-width:768px){' +
    'nav{left:0;top:0;bottom:0;width:' + SIDEBAR_W + 'px;flex-direction:column;align-items:center;' +
    'border-right:1px solid var(--border);padding:10px 0;gap:6px}' +
    '.brand{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;' +
    'background:var(--primary);color:#fff;margin-bottom:10px;flex-shrink:0}' +
    '.brand svg{width:22px;height:22px}' +
    '.inner{display:flex;flex-direction:column;align-items:center;gap:6px}' +
    'a{width:40px;height:40px}' +
    'a:hover .tip{opacity:1}' +
    '.ind{left:-10px;top:50%;transform:translateY(-50%);width:3px;height:20px;border-radius:0 3px 3px 0}' +
    '}' +
    /* ---- Mobile : barre en bas ---- */
    '@media (max-width:767px){' +
    'nav{left:0;right:0;bottom:0;flex-direction:row;justify-content:center;' +
    'border-top:1px solid var(--border);box-shadow:0 -2px 12px rgba(0,0,0,.18);padding-bottom:env(safe-area-inset-bottom,0)}' +
    '.inner{display:flex;flex-direction:row;flex:1;max-width:520px}' +
    'a{flex:1;flex-direction:column;gap:2px;padding:7px 4px 5px;min-height:52px;border-radius:0}' +
    '.tip{display:none}.lbl{display:block;font-size:10px;font-weight:500}' +
    '.ind{top:0;left:50%;transform:translateX(-50%);width:30px;height:2px;border-radius:0 0 3px 3px}' +
    '}';

  function render(active) {
    var brand =
      '<a class="brand" href="https://hub.zone01normandie.org/" aria-label="Zone01">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1.5"/></svg></a>';
    var items = APPS.map(function (app) {
      var on = app.key === active;
      return (
        '<a class="' + (on ? 'active' : '') + '" href="' + app.href + '"' + (on ? ' aria-current="page"' : '') +
        ' aria-label="' + app.label + '">' +
        '<span class="ind"></span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg>' +
        '<span class="lbl">' + app.label + '</span>' +
        '<span class="tip">' + app.label + '</span></a>'
      );
    }).join('');
    return '<style>' + STYLE + '</style><nav>' + brand + '<div class="inner">' + items + '</div></nav>';
  }

  function ensureBodySpace() {
    if (document.getElementById('z01-nav-body-pad')) return;
    var st = document.createElement('style');
    st.id = 'z01-nav-body-pad';
    st.textContent =
      '@media (max-width:767px){body{padding-bottom:calc(' + BAR_H + 'px + env(safe-area-inset-bottom,0px))}}' +
      '@media (min-width:768px){body{padding-left:' + SIDEBAR_W + 'px}}';
    document.head.appendChild(st);
  }

  var Z01StudentNav = (function () {
    function Z01StudentNav() { return Reflect.construct(HTMLElement, [], Z01StudentNav); }
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
