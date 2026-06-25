/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM, plain JS, IIFE).
 *
 *  - Desktop (≥768px) : DOCK FLOTTANT ancré bas-gauche (~56px), s'élargit à
 *    212px en overlay au survol / focus / épinglage. Détaché des bords → ne
 *    masque jamais le coin haut-gauche de l'app (top-bar 01deck, header
 *    émargement). Zéro réservation de flux.
 *  - Mobile (<768px) : BOUTON FLOTTANT (FAB) rond bleu, coin bas-droit. Au tap,
 *    ouvre un mini-menu (les 3 apps + thème) au-dessus de lui. Footprint minimal,
 *    AUCUNE barre pleine largeur, AUCUNE réservation d'espace → ne masque pas le
 *    contenu et ne se superpose pas aux bottom-nav natives (ex. 01deck).
 *    Position basse = var(--z01-host-bottom, 16px) + safe-area : une app avec sa
 *    propre bottom-nav (01deck) pose --z01-host-bottom = sa hauteur pour que le
 *    FAB flotte juste au-dessus.
 *
 * Conserve : presets par app (fond/police/rayon, dark+light), accent #0063f9,
 * thème synchronisé (classe dark/light sur <html> + MutationObserver + bouton
 * thème), liens MÊME onglet, a11y (skip-link, aria, focus, reduced-motion).
 *
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var PANEL_W = 212; // largeur capsule dépliée (overlay, desktop)
  var LS_KEY = 'z01-nav-pinned';

  // Icônes lucide (24×24, stroke) — layout-dashboard / signature / layers.
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

  var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  var MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';

  // ── Presets par app : le dock adopte la surface/police/rayon de l'app hôte. ──
  var PRESETS = {
    hub: {
      font: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
      radius: '8px',
      dark: '--bg:hsl(240 6% 6%);--fg:hsl(240 5% 72%);--primary:hsl(217 91% 60%);--primary-fg:#fff;--accent:hsl(240 4% 13%);--accent-fg:hsl(0 0% 98%);--border:hsl(240 4% 14%);--muted:hsl(240 5% 55%)',
      light: '--bg:hsl(240 6% 99%);--fg:hsl(240 5% 35%);--primary:hsl(217 91% 53%);--primary-fg:#fff;--accent:hsl(240 5% 94%);--accent-fg:hsl(240 6% 12%);--border:hsl(240 6% 90%);--muted:hsl(240 4% 50%)',
    },
    deck: {
      font: '"DM Sans","Segoe UI",sans-serif',
      radius: '7px',
      dark: '--bg:#0d1424;--fg:#94a3b8;--primary:#0063f9;--primary-fg:#fff;--accent:#1a2d5a;--accent-fg:#93c5fd;--border:rgba(255,255,255,.08);--muted:#94a3b8',
      light: '--bg:#ffffff;--fg:#64646e;--primary:#0063f9;--primary-fg:#fff;--accent:#edf2ff;--accent-fg:#0052d4;--border:rgba(0,0,0,.09);--muted:#64646e',
    },
    emargement: {
      font: '"Instrument Sans",ui-sans-serif,system-ui,sans-serif',
      radius: '10px',
      dark: '--bg:oklch(0.234 0.005 17);--fg:oklch(0.708 0 0);--primary:#0063f9;--primary-fg:#fff;--accent:oklch(0.269 0 0);--accent-fg:oklch(0.985 0 0);--border:oklch(0.279 0 0);--muted:oklch(0.708 0 0)',
      light: '--bg:oklch(0.985 0 0);--fg:oklch(0.556 0 0);--primary:#0063f9;--primary-fg:#fff;--accent:oklch(0.97 0 0);--accent-fg:oklch(0.205 0 0);--border:oklch(0.922 0 0);--muted:oklch(0.556 0 0)',
    },
  };

  var STYLE =
    'nav{position:fixed;z-index:2147483000;display:flex;font-family:var(--font);' +
    '-webkit-font-smoothing:antialiased;box-sizing:border-box}' +
    'nav *,nav *::before,nav *::after{box-sizing:border-box}' +
    '.skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}' +
    '.skip:focus{left:8px;top:8px;width:auto;height:auto;padding:8px 12px;border-radius:8px;' +
    'background:var(--primary);color:var(--primary-fg);font:600 13px/1 var(--font);z-index:2}' +
    '.brand{display:none}.head-label{display:none}.grp{display:none}.foot{display:none}' +
    '.inner{display:flex}' +
    'a,button.act{position:relative;display:flex;align-items:center;text-decoration:none;color:var(--fg);' +
    'background:none;border:0;cursor:pointer;font:inherit;transition:color .15s,background .15s}' +
    '.pill{display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}' +
    'svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ind{position:absolute;background:var(--primary);opacity:0;transition:opacity .15s}a.active .ind{opacity:1}' +
    '.lbl{display:none}.txt{display:none;font-size:13px;white-space:nowrap;overflow:hidden}' +
    'a:focus-visible,button.act:focus-visible,.brand:focus-visible{outline:2px solid var(--primary);outline-offset:2px}' +

    /* ── Desktop : dock flottant bas-gauche, déplié en overlay ── */
    '@media (min-width:768px){' +
    'nav{left:14px;bottom:18px;width:56px;flex-direction:column;background:var(--bg);' +
    'border:1px solid var(--border);border-radius:calc(var(--r) + 6px);' +
    'box-shadow:0 10px 34px rgba(0,0,0,.20),0 2px 8px rgba(0,0,0,.12);' +
    'max-height:calc(100vh - 36px);transform-origin:left bottom;' +
    'transition:width .22s cubic-bezier(.22,.61,.36,1);overflow:hidden}' +
    '@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    'nav{background:color-mix(in srgb,var(--bg) 86%,transparent);' +
    '-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}}' +
    'nav.expanded,nav:hover,nav:focus-within{width:' + PANEL_W + 'px}' +
    '.brand{display:flex;align-items:center;height:54px;width:100%;border-bottom:1px solid var(--border);' +
    'flex-shrink:0;justify-content:center;cursor:pointer;color:var(--accent-fg);background:none;padding:0}' +
    'nav.expanded .brand,nav:hover .brand,nav:focus-within .brand{justify-content:flex-start;padding:0 14px;gap:10px}' +
    '.brand:hover{background:color-mix(in srgb,var(--accent) 55%,transparent)}' +
    '.brand .box{display:flex;align-items:center;justify-content:center;width:32px;height:32px;' +
    'border-radius:calc(var(--r) + 1px);background:var(--primary);color:var(--primary-fg);flex-shrink:0}' +
    '.brand .box svg{width:18px;height:18px;fill:currentColor;stroke:none}' +
    '.head-label{font-size:14px;font-weight:600;letter-spacing:-.01em;color:var(--accent-fg)}' +
    'nav.expanded .head-label,nav:hover .head-label,nav:focus-within .head-label{display:block}' +
    '.inner{flex:1;flex-direction:column;gap:3px;padding:10px;overflow-y:auto;overflow-x:hidden;align-self:stretch}' +
    '.grp{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:2px 8px 6px}' +
    'nav.expanded .grp,nav:hover .grp,nav:focus-within .grp{display:block}' +
    'a,button.act{height:40px;border-radius:var(--r);width:40px;justify-content:center;margin:0 auto}' +
    'nav.expanded a,nav.expanded button.act,nav:hover a,nav:hover button.act,nav:focus-within a,nav:focus-within button.act{' +
    'width:100%;justify-content:flex-start;gap:12px;padding:0 10px;margin:0}' +
    'a:hover,button.act:hover{background:var(--accent);color:var(--accent-fg)}' +
    'a.active{background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary)}' +
    '.pill{width:40px;height:40px;border-radius:var(--r)}' +
    'nav.expanded .pill,nav:hover .pill,nav:focus-within .pill{width:18px;height:18px}' +
    'nav.expanded .txt,nav:hover .txt,nav:focus-within .txt{display:block}a.active .txt{font-weight:600}' +
    '.ind{left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;border-radius:0 3px 3px 0}' +
    '.foot{display:block;border-top:1px solid var(--border);padding:8px 10px}' +
    '@media (max-height:560px){nav{bottom:10px;max-height:calc(100vh - 20px)}}' +
    '}' +

    /* ── Mobile : FAB + mini-menu ── */
    '@media (max-width:767px){' +
    /* --z01-host-bottom = offset bas COMPLET (inclut la safe-area) ; une app avec
       sa propre bottom-nav le pose = (hauteur mesurée de sa nav + écart). Défaut
       (hub/émargement) : 16px + safe-area. */
    'nav{left:auto;right:16px;bottom:var(--z01-host-bottom, calc(16px + env(safe-area-inset-bottom,0px)));' +
    'flex-direction:column;align-items:flex-end;gap:8px;background:none;border:0;box-shadow:none;padding:0;' +
    'width:auto;max-width:calc(100vw - 32px)}' +
    /* FAB (logo) */
    '.brand{order:3;display:flex;align-items:center;justify-content:center;width:52px;height:52px;' +
    'border-radius:999px;background:var(--primary);color:var(--primary-fg);border:0;cursor:pointer;padding:0;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.32);transition:transform .15s}' +
    '.brand:active{transform:scale(.94)}' +
    '.brand .box{width:auto;height:auto;background:none;color:inherit}' +
    '.brand .box svg{width:24px;height:24px;fill:currentColor;stroke:none}' +
    '.head-label{display:none}.grp{display:none}' +
    /* menu (caché tant que fermé) */
    '.inner{order:1;display:none}.foot{order:2;display:none}' +
    'nav.expanded .inner,nav.expanded .foot{display:flex;flex-direction:column;gap:2px;min-width:200px;' +
    'background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:6px;' +
    'box-shadow:0 16px 40px rgba(0,0,0,.30)}' +
    '@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    'nav.expanded .inner,nav.expanded .foot{background:color-mix(in srgb,var(--bg) 92%,transparent);' +
    '-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}}' +
    'nav.expanded a,nav.expanded button.act{display:flex;flex-direction:row;align-items:center;gap:12px;' +
    'width:100%;justify-content:flex-start;height:auto;margin:0;padding:10px 12px;border-radius:10px}' +
    'nav.expanded a:hover,nav.expanded button.act:hover{background:var(--accent);color:var(--accent-fg)}' +
    'nav.expanded a.active{background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary)}' +
    '.pill{width:auto;height:auto;background:none!important;padding:0;border-radius:0}' +
    'svg{width:20px;height:20px}' +
    '.txt{display:block;font-size:14px;font-weight:500}.lbl{display:none}.ind{display:none}' +
    '@media (prefers-reduced-motion:reduce){.brand:active{transform:none}}' +
    '}' +

    '@media (prefers-reduced-motion:reduce){nav,nav *,.pill,a,button.act{transition:none!important}}';

  var BRAND =
    '<button class="brand" type="button" aria-label="Menu Zone01" aria-expanded="false" aria-haspopup="true">' +
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

  function isDesktop() {
    return !!(window.matchMedia && window.matchMedia('(min-width:768px)').matches);
  }

  function isPinned() {
    try { return window.localStorage.getItem(LS_KEY) === 'true'; } catch (e) { return false; }
  }

  function render(active) {
    var preset = PRESETS[active] || PRESETS.hub;
    var dark = isHostDark();
    var palette = 'nav{--r:' + preset.radius + ';--font:' + preset.font + '}' +
      'nav.dark{' + preset.dark + '}nav.light{' + preset.light + '}';

    var items = APPS.map(function (app) {
      var on = app.key === active;
      return (
        '<a class="' + (on ? 'active' : '') + '" href="' + app.href + '"' + (on ? ' aria-current="page"' : '') +
        ' aria-label="' + app.label + '">' +
        '<span class="ind"></span>' +
        '<span class="pill"><svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg></span>' +
        '<span class="txt">' + app.label + '</span>' +
        '<span class="lbl">' + app.label + '</span></a>'
      );
    }).join('');

    var foot =
      '<div class="foot"><button class="act theme" type="button" aria-label="Changer de thème">' +
      '<span class="pill"><svg viewBox="0 0 24 24" aria-hidden="true">' + (dark ? SUN : MOON) + '</svg></span>' +
      '<span class="txt">' + (dark ? 'Mode clair' : 'Mode sombre') + '</span>' +
      '<span class="lbl">Thème</span></button></div>';

    // Sur mobile : toujours fermé au départ (FAB). Sur desktop : état épinglé.
    var open = isDesktop() && isPinned();
    var cls = (dark ? 'dark' : 'light') + (open ? ' expanded' : '');
    return '<style>' + STYLE + palette + '</style>' +
      '<a class="skip" href="#z01-nav-first">Aller à la navigation Zone01</a>' +
      '<nav class="' + cls + '" aria-label="Navigation Zone01">' + BRAND +
      '<div class="inner"><span class="grp">Zone01</span>' + items + '</div>' + foot + '</nav>';
  }

  // FAB = overlay : aucune réservation d'espace contenu. On garde --z01-nav-h=0
  // (compat anciens consommateurs).
  function ensureBodySpace() {
    var st = document.getElementById('z01-nav-body-pad');
    var css = ':root{--z01-nav-h:0px}';
    if (!st) {
      st = document.createElement('style');
      st.id = 'z01-nav-body-pad';
      document.head.appendChild(st);
    }
    if (st.textContent !== css) st.textContent = css;
  }

  var Z01StudentNav = (function () {
    function Z01StudentNav() { return Reflect.construct(HTMLElement, [], Z01StudentNav); }
    Z01StudentNav.prototype = Object.create(HTMLElement.prototype);
    Z01StudentNav.prototype.constructor = Z01StudentNav;
    Z01StudentNav.observedAttributes = ['active'];

    Z01StudentNav.prototype._paint = function () {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = render(this.getAttribute('active') || '');
      ensureBodySpace();
      var self = this;
      var first = this.shadowRoot.querySelector('.inner a');
      if (first) first.id = 'z01-nav-first';
      var brand = this.shadowRoot.querySelector('.brand');
      if (brand) {
        var nav0 = this.shadowRoot.querySelector('nav');
        brand.setAttribute('aria-expanded', String(!!(nav0 && nav0.classList.contains('expanded'))));
        brand.addEventListener('click', function () { self._toggle(); });
      }
      var theme = this.shadowRoot.querySelector('.theme');
      if (theme) theme.addEventListener('click', function () { self._toggleTheme(); });
    };
    Z01StudentNav.prototype._toggle = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (!nav) return;
      var next = !nav.classList.contains('expanded');
      nav.classList.toggle('expanded', next);
      var brand = this.shadowRoot.querySelector('.brand');
      if (brand) brand.setAttribute('aria-expanded', String(next));
      // Persiste l'épinglage uniquement sur desktop (le FAB mobile repart fermé).
      if (isDesktop()) {
        try { window.localStorage.setItem(LS_KEY, String(next)); } catch (e) { /* ignore */ }
      }
    };
    Z01StudentNav.prototype._close = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (nav && nav.classList.contains('expanded')) {
        nav.classList.remove('expanded');
        var brand = this.shadowRoot.querySelector('.brand');
        if (brand) brand.setAttribute('aria-expanded', 'false');
        if (isDesktop()) {
          try { window.localStorage.setItem(LS_KEY, 'false'); } catch (e) { /* ignore */ }
        }
      }
    };
    Z01StudentNav.prototype._toggleTheme = function () {
      var next = isHostDark() ? 'light' : 'dark';
      var html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(next);
      html.style.colorScheme = next;
      try { window.localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      try { window.localStorage.setItem('appearance', next); } catch (e) { /* ignore */ }
    };
    Z01StudentNav.prototype.connectedCallback = function () {
      var self = this;
      this._paint();
      if (!this._obs) {
        this._obs = new MutationObserver(function () { self._paint(); });
        this._obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
      if (!this._onKey) {
        this._onKey = function (e) { if (e.key === 'Escape') self._close(); };
        document.addEventListener('keydown', this._onKey);
      }
      if (!this._onDoc) {
        // Clic hors du composant → ferme le menu (surtout utile au FAB mobile).
        this._onDoc = function (e) {
          var nav = self.shadowRoot && self.shadowRoot.querySelector('nav');
          if (!nav || !nav.classList.contains('expanded')) return;
          if (isDesktop()) return; // desktop : épinglage explicite, pas d'auto-close
          var path = e.composedPath ? e.composedPath() : [];
          if (path.indexOf(self) === -1) self._close();
        };
        document.addEventListener('click', this._onDoc, true);
      }
    };
    Z01StudentNav.prototype.disconnectedCallback = function () {
      if (this._obs) { this._obs.disconnect(); this._obs = null; }
      if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
      if (this._onDoc) { document.removeEventListener('click', this._onDoc, true); this._onDoc = null; }
    };
    Z01StudentNav.prototype.attributeChangedCallback = function () {
      if (this.shadowRoot) this._paint();
    };
    Object.setPrototypeOf(Z01StudentNav, HTMLElement);
    return Z01StudentNav;
  })();

  customElements.define('z01-student-nav', Z01StudentNav);
})();
