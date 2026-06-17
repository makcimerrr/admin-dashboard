/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM). Style calqué 1:1 sur la sidebar du hub :
 * rail étroit (64px), logo bleu carré en haut (header bordé), icônes seules,
 * item actif bleu + barre à gauche, tooltips au survol. Thème (clair/sombre)
 * synchronisé avec l'app hôte (classe `dark`/`light` sur <html>).
 *
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 *
 * - Desktop (≥768px) : sidebar verticale fixe à gauche (comme le hub).
 * - Mobile (<768px)  : barre fixe en bas (PWA), pilule active, safe-area.
 * - Liens en MÊME ONGLET (navigation inter-apps sans nouvel onglet).
 *
 * Coexistence : expose la hauteur de la barre mobile via la CSS var globale
 * `--z01-nav-h` (sur <html>) pour que les apps ayant déjà une bottom-bar
 * (ex. 01deck) puissent se décaler au-dessus au lieu d'être masquées.
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var SIDEBAR_W = 64;
  var BAR_H = 56;

  var APPS = [
    { key: 'hub', label: 'Hub', href: 'https://hub.zone01normandie.org/',
      // maison (distincte du logo grille de la marque)
      icon: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>' },
    { key: 'emargement', label: 'Émargement', href: 'https://emargement.zone01normandie.org/',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v4.5l3 2"/>' },
    { key: 'deck', label: '01 Deck', href: 'https://deck.zone01normandie.org/',
      icon: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>' },
  ];

  // Tokens repris à l'identique des variables --sidebar-* du hub (globals.css).
  var DARK =
    '--bg:hsl(240 6% 6%);--fg:hsl(240 5% 72%);--primary:hsl(217 91% 60%);' +
    '--primary-fg:hsl(0 0% 100%);--accent:hsl(240 4% 13%);--accent-fg:hsl(0 0% 98%);' +
    '--border:hsl(240 4% 13%);--tip-bg:hsl(240 5% 16%)';
  var LIGHT =
    '--bg:hsl(240 6% 98%);--fg:hsl(240 5% 35%);--primary:hsl(217 91% 53%);' +
    '--primary-fg:hsl(0 0% 100%);--accent:hsl(240 5% 94%);--accent-fg:hsl(240 6% 12%);' +
    '--border:hsl(240 6% 90%);--tip-bg:hsl(240 6% 20%)';

  var STYLE =
    'nav.dark{' + DARK + '}nav.light{' + LIGHT + '}' +
    'nav{position:fixed;z-index:2147483000;display:flex;background:var(--bg);' +
    'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
    '-webkit-font-smoothing:antialiased}' +
    '.brand{display:none}' +
    '.inner{display:flex}' +
    'a{position:relative;display:flex;align-items:center;justify-content:center;text-decoration:none;' +
    'color:var(--fg);transition:color .15s,background .15s}' +
    '.pill{display:flex;align-items:center;justify-content:center;transition:background .15s}' +
    'svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ind{position:absolute;background:var(--primary);opacity:0}a.active .ind{opacity:1}' +
    '.lbl{display:none}' +
    '.tip{position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'background:var(--tip-bg);color:#fff;font-size:12px;font-weight:500;padding:5px 9px;border-radius:7px;opacity:0;' +
    'pointer-events:none;transition:opacity .12s;box-shadow:0 6px 16px rgba(0,0,0,.35);z-index:1}' +
    /* ---- Desktop : sidebar ---- */
    '@media (min-width:768px){' +
    'nav{left:0;top:0;bottom:0;width:' + SIDEBAR_W + 'px;flex-direction:column;align-items:center;' +
    'border-right:1px solid var(--border)}' +
    '.brand{display:flex;align-items:center;justify-content:center;width:100%;height:56px;' +
    'border-bottom:1px solid var(--border);flex-shrink:0}' +
    '.brand .box{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;' +
    'background:var(--primary);color:var(--primary-fg)}' +
    '.brand .box svg{width:18px;height:18px;fill:currentColor;stroke:none}' +
    '.inner{flex-direction:column;align-items:center;gap:4px;padding:12px 0}' +
    'a{width:36px;height:36px;border-radius:8px}' +
    'a:hover{background:color-mix(in srgb,var(--accent) 55%,transparent);color:var(--accent-fg)}' +
    'a.active{background:var(--accent);color:var(--primary)}' +
    'a:hover .tip{opacity:1}' +
    '.pill{width:100%;height:100%;border-radius:8px}' +
    '.ind{left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;border-radius:0 3px 3px 0}' +
    '}' +
    /* ---- Mobile : barre en bas (PWA) ---- */
    '@media (max-width:767px){' +
    'nav{left:0;right:0;bottom:0;flex-direction:row;justify-content:center;' +
    'background:color-mix(in srgb,var(--bg) 88%,transparent);' +
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
    'border-top:1px solid var(--border);box-shadow:0 -2px 16px rgba(0,0,0,.18);' +
    'padding-bottom:env(safe-area-inset-bottom,0)}' +
    '.inner{flex-direction:row;flex:1;max-width:560px}' +
    'a{flex:1;flex-direction:column;gap:3px;padding:7px 4px 5px;min-height:' + BAR_H + 'px}' +
    'a:active{opacity:.7}' +
    'a.active{color:var(--primary)}' +
    'svg{width:22px;height:22px}' +
    '.pill{padding:3px 16px;border-radius:999px}' +
    'a.active .pill{background:color-mix(in srgb,var(--primary) 16%,transparent)}' +
    '.lbl{display:block;font-size:10px;font-weight:600;letter-spacing:.01em}' +
    '.tip,.ind{display:none}' +
    '}';

  var BRAND =
    '<div class="brand"><span class="box">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.6"/>' +
    '<rect x="13" y="3" width="8" height="8" rx="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.6"/>' +
    '<rect x="13" y="13" width="8" height="8" rx="1.6"/></svg></span></div>';

  function isHostDark() {
    var c = document.documentElement.classList;
    if (c.contains('dark')) return true;
    if (c.contains('light')) return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function render(active) {
    var items = APPS.map(function (app) {
      var on = app.key === active;
      return (
        '<a class="' + (on ? 'active' : '') + '" href="' + app.href + '"' + (on ? ' aria-current="page"' : '') +
        ' aria-label="' + app.label + '">' +
        '<span class="ind"></span>' +
        '<span class="pill"><svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg></span>' +
        '<span class="lbl">' + app.label + '</span>' +
        '<span class="tip">' + app.label + '</span></a>'
      );
    }).join('');
    var cls = isHostDark() ? 'dark' : 'light';
    return '<style>' + STYLE + '</style><nav class="' + cls + '">' + BRAND +
      '<div class="inner">' + items + '</div></nav>';
  }

  function ensureBodySpace() {
    if (document.getElementById('z01-nav-body-pad')) return;
    var st = document.createElement('style');
    st.id = 'z01-nav-body-pad';
    // Expose la hauteur de la barre mobile aux apps hôtes (décalage éventuel).
    st.textContent =
      ':root{--z01-nav-h:0px}' +
      '@media (max-width:767px){:root{--z01-nav-h:calc(' + BAR_H + 'px + env(safe-area-inset-bottom,0px))}' +
      'body{padding-bottom:var(--z01-nav-h)}}' +
      '@media (min-width:768px){body{padding-left:' + SIDEBAR_W + 'px}}';
    document.head.appendChild(st);
  }

  var Z01StudentNav = (function () {
    function Z01StudentNav() { return Reflect.construct(HTMLElement, [], Z01StudentNav); }
    Z01StudentNav.prototype = Object.create(HTMLElement.prototype);
    Z01StudentNav.prototype.constructor = Z01StudentNav;
    Z01StudentNav.observedAttributes = ['active'];
    Z01StudentNav.prototype._paint = function () {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = render(this.getAttribute('active') || '');
    };
    Z01StudentNav.prototype.connectedCallback = function () {
      var self = this;
      this._paint();
      ensureBodySpace();
      // Resynchronise le thème quand l'app hôte bascule clair/sombre.
      if (!this._obs) {
        this._obs = new MutationObserver(function () { self._paint(); });
        this._obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
    };
    Z01StudentNav.prototype.disconnectedCallback = function () {
      if (this._obs) { this._obs.disconnect(); this._obs = null; }
    };
    Z01StudentNav.prototype.attributeChangedCallback = function () {
      if (this.shadowRoot) this._paint();
    };
    Object.setPrototypeOf(Z01StudentNav, HTMLElement);
    return Z01StudentNav;
  })();

  customElements.define('z01-student-nav', Z01StudentNav);
})();
