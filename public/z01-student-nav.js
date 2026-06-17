/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM). Réplique fidèle de la sidebar du hub
 * (components/app-sidebar.tsx) : rail 64px DÉPLIABLE (clic sur le logo → 208px
 * avec libellés), mêmes icônes lucide (LayoutDashboard / Signature / Layers),
 * item actif bleu + barre à gauche, tooltips au survol (replié), thème
 * synchronisé avec l'app hôte (classe `dark`/`light` sur <html>).
 *
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 *
 * - Desktop (≥768px) : sidebar verticale fixe à gauche, dépliable (overlay).
 * - Mobile (<768px)  : barre fixe en bas (PWA), pilule active, safe-area.
 * - Liens en MÊME ONGLET (navigation inter-apps sans nouvel onglet).
 *
 * Coexistence : expose la CSS var globale `--z01-nav-h` (hauteur barre mobile)
 * pour que les apps avec une bottom-bar (01deck) se décalent au-dessus.
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var RAIL_W = 64;     // replié (w-16)
  var PANEL_W = 208;   // déplié (w-52)
  var BAR_H = 56;
  var LS_KEY = 'z01-nav-expanded';

  // Icônes lucide (24×24, stroke) — identiques à celles rendues par le hub.
  var APPS = [
    { key: 'hub', label: 'Hub', href: 'https://hub.zone01normandie.org/',
      icon: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>' +
            '<rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>' },
    { key: 'emargement', label: 'Émargement', href: 'https://emargement.zone01normandie.org/',
      icon: '<path d="M14.218 7.183a2.5 2.5 0 1 0-3.712-2.354c-.349 2.295-.853 12.217-5.006 12.217a1 1 0 0 1 0-5.091c4.509.03 8.516 1.676 8.516 4.221a1 1 0 0 0 .781.803l2.429.015a1 1 0 0 0 1.006-1v-.4a.5.5 0 0 1 .838-.368L21 17"/><path d="M3 21h18"/>' },
    { key: 'deck', label: '01 Deck', href: 'https://deck.zone01normandie.org/',
      icon: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>' +
            '<path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>' },
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
    '-webkit-font-smoothing:antialiased;box-sizing:border-box}' +
    'nav *,nav *::before,nav *::after{box-sizing:border-box}' +
    '.brand{display:none}.head-label{display:none}.grp{display:none}' +
    '.inner{display:flex}' +
    'a{position:relative;display:flex;align-items:center;text-decoration:none;color:var(--fg);' +
    'transition:color .15s,background .15s}' +
    '.pill{display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}' +
    'svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.txt{display:none;font-size:13px;white-space:nowrap;overflow:hidden}' +
    '.ind{position:absolute;background:var(--primary);opacity:0}a.active .ind{opacity:1}' +
    '.lbl{display:none}' +
    '.tip{position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'background:var(--tip-bg);color:#fff;font-size:12px;font-weight:500;padding:5px 9px;border-radius:7px;opacity:0;' +
    'pointer-events:none;transition:opacity .12s;box-shadow:0 6px 16px rgba(0,0,0,.35);z-index:1}' +
    /* ---- Desktop : sidebar dépliable ---- */
    '@media (min-width:768px){' +
    'nav{left:0;top:0;bottom:0;width:' + RAIL_W + 'px;flex-direction:column;' +
    'border-right:1px solid var(--border);transition:width .2s ease-out;overflow:hidden}' +
    'nav.expanded{width:' + PANEL_W + 'px;box-shadow:8px 0 28px rgba(0,0,0,.28)}' +
    '.brand{display:flex;align-items:center;height:56px;width:100%;border-bottom:1px solid var(--border);' +
    'flex-shrink:0;background:none;border-left:0;border-right:0;border-top:0;cursor:pointer;padding:0;' +
    'color:var(--accent-fg);justify-content:center}' +
    'nav.expanded .brand{justify-content:flex-start;padding:0 14px;gap:10px}' +
    '.brand:hover{background:color-mix(in srgb,var(--accent) 50%,transparent)}' +
    '.brand .box{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;' +
    'background:var(--primary);color:var(--primary-fg);flex-shrink:0}' +
    '.brand .box svg{width:18px;height:18px;fill:currentColor;stroke:none}' +
    '.head-label{font-size:14px;font-weight:600;letter-spacing:-.01em}' +
    'nav.expanded .head-label{display:block}' +
    '.inner{flex-direction:column;gap:2px;padding:12px 10px;align-self:stretch}' +
    '.grp{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;' +
    'color:color-mix(in srgb,var(--fg) 70%,transparent);padding:4px 8px 6px}' +
    'nav.expanded .grp{display:block}' +
    'a{height:36px;border-radius:8px;width:36px;justify-content:center;margin:0 auto}' +
    'nav.expanded a{width:100%;justify-content:flex-start;gap:12px;padding:0 9px;margin:0}' +
    'a:hover{background:color-mix(in srgb,var(--accent) 55%,transparent);color:var(--accent-fg)}' +
    'a.active{background:var(--accent);color:var(--primary)}' +
    'nav:not(.expanded) a:hover .tip{opacity:1}' +
    '.pill{width:36px;height:36px;border-radius:8px}' +
    'nav.expanded .pill{width:18px;height:18px}' +
    'nav.expanded .txt{display:block}a.active .txt{font-weight:500}' +
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
    'a{flex:1;flex-direction:column;justify-content:center;gap:3px;padding:7px 4px 5px;min-height:' + BAR_H + 'px}' +
    'a:active{opacity:.7}a.active{color:var(--primary)}' +
    'svg{width:22px;height:22px}' +
    '.pill{padding:3px 16px;border-radius:999px}' +
    'a.active .pill{background:color-mix(in srgb,var(--primary) 16%,transparent)}' +
    '.lbl{display:block;font-size:10px;font-weight:600;letter-spacing:.01em}' +
    '.tip,.ind{display:none}' +
    '}';

  var BRAND =
    '<button class="brand" type="button" aria-label="Déplier / replier le menu">' +
    '<span class="box"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.6"/>' +
    '<rect x="13" y="3" width="8" height="8" rx="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.6"/>' +
    '<rect x="13" y="13" width="8" height="8" rx="1.6"/></svg></span>' +
    '<span class="head-label">Zone01</span></button>';

  function isHostDark() {
    var c = document.documentElement.classList;
    if (c.contains('dark')) return true;
    if (c.contains('light')) return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function isExpanded() {
    try { return window.localStorage.getItem(LS_KEY) === 'true'; } catch (e) { return false; }
  }

  function render(active) {
    var items = APPS.map(function (app) {
      var on = app.key === active;
      return (
        '<a class="' + (on ? 'active' : '') + '" href="' + app.href + '"' + (on ? ' aria-current="page"' : '') +
        ' aria-label="' + app.label + '">' +
        '<span class="ind"></span>' +
        '<span class="pill"><svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg></span>' +
        '<span class="txt">' + app.label + '</span>' +
        '<span class="lbl">' + app.label + '</span>' +
        '<span class="tip">' + app.label + '</span></a>'
      );
    }).join('');
    var cls = (isHostDark() ? 'dark' : 'light') + (isExpanded() ? ' expanded' : '');
    return '<style>' + STYLE + '</style><nav class="' + cls + '">' + BRAND +
      '<div class="inner"><span class="grp">Zone01</span>' + items + '</div></nav>';
  }

  function ensureBodySpace() {
    if (document.getElementById('z01-nav-body-pad')) return;
    var st = document.createElement('style');
    st.id = 'z01-nav-body-pad';
    // L'espace réservé = rail replié (64px) ; le déplié est un OVERLAY (ne
    // pousse pas le contenu) pour rester robuste quel que soit le layout hôte.
    st.textContent =
      ':root{--z01-nav-h:0px}' +
      '@media (max-width:767px){:root{--z01-nav-h:calc(' + BAR_H + 'px + env(safe-area-inset-bottom,0px))}' +
      'body{padding-bottom:var(--z01-nav-h)}}' +
      '@media (min-width:768px){body{padding-left:' + RAIL_W + 'px}}';
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
      var self = this;
      var brand = this.shadowRoot.querySelector('.brand');
      if (brand) brand.addEventListener('click', function () { self._toggle(); });
    };
    Z01StudentNav.prototype._toggle = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (!nav) return;
      var next = !nav.classList.contains('expanded');
      nav.classList.toggle('expanded', next);
      try { window.localStorage.setItem(LS_KEY, String(next)); } catch (e) { /* ignore */ }
    };
    Z01StudentNav.prototype._collapse = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (nav && nav.classList.contains('expanded')) {
        nav.classList.remove('expanded');
        try { window.localStorage.setItem(LS_KEY, 'false'); } catch (e) { /* ignore */ }
      }
    };
    Z01StudentNav.prototype.connectedCallback = function () {
      var self = this;
      this._paint();
      ensureBodySpace();
      if (!this._obs) {
        // Resync du thème quand l'app hôte bascule clair/sombre.
        this._obs = new MutationObserver(function () { self._paint(); });
        this._obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
      if (!this._onKey) {
        this._onKey = function (e) { if (e.key === 'Escape') self._collapse(); };
        document.addEventListener('keydown', this._onKey);
      }
    };
    Z01StudentNav.prototype.disconnectedCallback = function () {
      if (this._obs) { this._obs.disconnect(); this._obs = null; }
      if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    };
    Z01StudentNav.prototype.attributeChangedCallback = function () {
      if (this.shadowRoot) this._paint();
    };
    Object.setPrototypeOf(Z01StudentNav, HTMLElement);
    return Z01StudentNav;
  })();

  customElements.define('z01-student-nav', Z01StudentNav);
})();
