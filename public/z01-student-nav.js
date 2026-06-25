/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM, plain JS, IIFE).
 *
 * Direction « Float-Dock » (corrigée) : la nav n'est plus un rail collé au bord
 * sur toute la hauteur. C'est un DOCK FLOTTANT détaché de tous les bords, qui se
 * POSE sur l'app au lieu de la DÉCOUPER. Géométrie anti-occlusion :
 *  - Desktop : capsule verticale ancrée en BAS-GAUCHE (left:14px, bottom:18px,
 *    width ~56px). Comme elle part du bas et ne touche jamais le coin haut-gauche,
 *    la top-bar native de 01deck / le header d'émargement restent 100% libres —
 *    garanti par la GÉOMÉTRIE, sans jamais mesurer le DOM hôte. Au survol/focus,
 *    le dock s'élargit vers la DROITE en OVERLAY (le contenu ne bouge jamais).
 *  - Mobile : pilule flottante CENTRÉE en bas (width = contenu), au-dessus de la
 *    safe-area ; les coins bas restent libres (FAB 01deck visibles).
 *  - ZÉRO réservation de flux desktop (pas de body{padding-left}) : aucun fixed
 *    host n'est recouvré, aucune désynchro espace-réservé / espace-réel.
 *  - Surface OPAQUE par défaut (lisible sur tout fond), blur seulement si le
 *    navigateur le supporte ET sans coût (gated @supports), jamais d'auto-hide
 *    (fragile cross-app), jamais de push du layout hôte.
 *
 * Conserve : presets par app (fond/police/rayon hub/deck/émargement, dark+light),
 * accent BLEU commun #0063f9, thème synchronisé (classe dark/light sur <html> +
 * MutationObserver + bouton thème), liens MÊME onglet, --z01-nav-h exposé (pilule
 * mobile, pour coexistence avec la bottom-nav 01deck), a11y (skip-link, aria,
 * focus visible, aria-current, prefers-reduced-motion).
 *
 *   <script src=\"https://hub.zone01normandie.org/z01-student-nav.js\" defer></script>
 *   <z01-student-nav active=\"hub\"></z01-student-nav>   // ou \"emargement\" / \"deck\"
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var RAIL_W = 56;   // largeur capsule repliée (desktop)
  var PANEL_W = 212; // largeur capsule dépliée (overlay, desktop)
  var BAR_H = 56;    // hauteur pilule mobile
  var LS_KEY = 'z01-nav-pinned'; // épinglage déplié (power-user), overlay permanent

  // Icônes lucide (24×24, stroke) — layout-dashboard / signature / layers.
  var APPS = [
    { key: 'hub', label: 'Hub', href: 'https://hub.zone01normandie.org/',
      icon: '<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/>' +
            '<rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>' },
    { key: 'emargement', label: 'Émargement', href: 'https://emargement.zone01normandie.org/',
      icon: '<path d=\"M14.218 7.183a2.5 2.5 0 1 0-3.712-2.354c-.349 2.295-.853 12.217-5.006 12.217a1 1 0 0 1 0-5.091c4.509.03 8.516 1.676 8.516 4.221a1 1 0 0 0 .781.803l2.429.015a1 1 0 0 0 1.006-1v-.4a.5.5 0 0 1 .838-.368L21 17\"/><path d=\"M3 21h18\"/>' },
    { key: 'deck', label: '01 Deck', href: 'https://deck.zone01normandie.org/',
      icon: '<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\"/>' +
            '<path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\"/><path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\"/>' },
  ];

  var SUN = '<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41\"/>';
  var MOON = '<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>';

  // ── Presets par app : le dock adopte la surface/police/rayon de l'app hôte ──
  // (style « intégré »), accent bleu commun #0063f9. tip = fond infobulle.
  var PRESETS = {
    hub: {
      font: 'ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif',
      radius: '8px',
      dark: '--bg:hsl(240 6% 6%);--fg:hsl(240 5% 72%);--primary:hsl(217 91% 60%);--primary-fg:#fff;--accent:hsl(240 4% 13%);--accent-fg:hsl(0 0% 98%);--border:hsl(240 4% 14%);--tip:hsl(240 5% 16%);--muted:hsl(240 5% 55%)',
      light: '--bg:hsl(240 6% 99%);--fg:hsl(240 5% 35%);--primary:hsl(217 91% 53%);--primary-fg:#fff;--accent:hsl(240 5% 94%);--accent-fg:hsl(240 6% 12%);--border:hsl(240 6% 90%);--tip:hsl(240 6% 20%);--muted:hsl(240 4% 50%)',
    },
    deck: {
      font: '\"DM Sans\",\"Segoe UI\",sans-serif',
      radius: '7px',
      dark: '--bg:#0d1424;--fg:#94a3b8;--primary:#0063f9;--primary-fg:#fff;--accent:#1a2d5a;--accent-fg:#93c5fd;--border:rgba(255,255,255,.08);--tip:#1e2a45;--muted:#94a3b8',
      light: '--bg:#ffffff;--fg:#64646e;--primary:#0063f9;--primary-fg:#fff;--accent:#edf2ff;--accent-fg:#0052d4;--border:rgba(0,0,0,.09);--tip:#0c0c12;--muted:#64646e',
    },
    emargement: {
      font: '\"Instrument Sans\",ui-sans-serif,system-ui,sans-serif',
      radius: '10px',
      dark: '--bg:oklch(0.234 0.005 17);--fg:oklch(0.708 0 0);--primary:#0063f9;--primary-fg:#fff;--accent:oklch(0.269 0 0);--accent-fg:oklch(0.985 0 0);--border:oklch(0.279 0 0);--tip:oklch(0.32 0 0);--muted:oklch(0.708 0 0)',
      light: '--bg:oklch(0.985 0 0);--fg:oklch(0.556 0 0);--primary:#0063f9;--primary-fg:#fff;--accent:oklch(0.97 0 0);--accent-fg:oklch(0.205 0 0);--border:oklch(0.922 0 0);--tip:oklch(0.27 0 0);--muted:oklch(0.556 0 0)',
    },
  };

  // Layout (indépendant du preset) — couleurs via var(--*), rayon via var(--r).
  var STYLE =
    /* Réinitialisations & base communes */
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
    '.tip{position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'background:var(--tip);color:#fff;font-size:12px;font-weight:500;padding:5px 9px;border-radius:7px;opacity:0;' +
    'pointer-events:none;transition:opacity .12s;box-shadow:0 6px 16px rgba(0,0,0,.35);z-index:1}' +
    'a:focus-visible,button.act:focus-visible,.brand:focus-visible{outline:2px solid var(--primary);outline-offset:2px}' +

    /* ── Desktop : dock flottant ancré en bas-gauche, déplié en overlay ── */
    '@media (min-width:768px){' +
    'nav{left:14px;bottom:18px;width:' + RAIL_W + 'px;flex-direction:column;' +
    'background:var(--bg);border:1px solid var(--border);border-radius:calc(var(--r) + 6px);' +
    'box-shadow:0 10px 34px rgba(0,0,0,.20),0 2px 8px rgba(0,0,0,.12);' +
    'max-height:calc(100vh - 36px);transform-origin:left bottom;' +
    'transition:width .22s cubic-bezier(.22,.61,.36,1);overflow:hidden}' +
    '@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    'nav{background:color-mix(in srgb,var(--bg) 86%,transparent);' +
    '-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}}' +
    'nav.expanded{width:' + PANEL_W + 'px}' +
    '.brand{display:flex;align-items:center;height:54px;width:100%;border-bottom:1px solid var(--border);' +
    'flex-shrink:0;justify-content:center;cursor:pointer;color:var(--accent-fg);background:none;padding:0}' +
    'nav.expanded .brand{justify-content:flex-start;padding:0 14px;gap:10px}' +
    '.brand:hover{background:color-mix(in srgb,var(--accent) 55%,transparent)}' +
    '.brand .box{display:flex;align-items:center;justify-content:center;width:32px;height:32px;' +
    'border-radius:calc(var(--r) + 1px);background:var(--primary);color:var(--primary-fg);flex-shrink:0}' +
    '.brand .box svg{width:18px;height:18px;fill:currentColor;stroke:none}' +
    '.head-label{font-size:14px;font-weight:600;letter-spacing:-.01em;color:var(--accent-fg)}' +
    'nav.expanded .head-label{display:block}' +
    '.inner{flex:1;flex-direction:column;gap:3px;padding:10px;overflow-y:auto;overflow-x:hidden;align-self:stretch}' +
    '.grp{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:2px 8px 6px}' +
    'nav.expanded .grp{display:block}' +
    'a,button.act{height:40px;border-radius:var(--r);width:40px;justify-content:center;margin:0 auto}' +
    'nav.expanded a,nav.expanded button.act{width:100%;justify-content:flex-start;gap:12px;padding:0 10px;margin:0}' +
    'a:hover,button.act:hover{background:var(--accent);color:var(--accent-fg)}' +
    'a.active{background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary)}' +
    'nav:not(.expanded) a:hover .tip,nav:not(.expanded) a:focus-visible .tip,' +
    'nav:not(.expanded) button.act:hover .tip,nav:not(.expanded) button.act:focus-visible .tip{opacity:1}' +
    '.pill{width:40px;height:40px;border-radius:var(--r)}' +
    'nav.expanded .pill{width:18px;height:18px}' +
    'nav.expanded .txt{display:block}a.active .txt{font-weight:600}' +
    '.ind{left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;border-radius:0 3px 3px 0}' +
    '.foot{display:block;border-top:1px solid var(--border);padding:8px 10px}' +
    /* Déplié au survol/focus du dock (overlay pur, jamais de reflow) */
    'nav:hover,nav:focus-within{width:' + PANEL_W + 'px}' +
    'nav:hover .head-label,nav:focus-within .head-label,nav:hover .grp,nav:focus-within .grp,' +
    'nav:hover .txt,nav:focus-within .txt{display:block}' +
    'nav:hover .brand,nav:focus-within .brand{justify-content:flex-start;padding:0 14px;gap:10px}' +
    'nav:hover a,nav:focus-within a,nav:hover button.act,nav:focus-within button.act{' +
    'width:100%;justify-content:flex-start;gap:12px;padding:0 10px;margin:0}' +
    'nav:hover .pill,nav:focus-within .pill{width:18px;height:18px}' +
    'nav:hover .tip,nav:focus-within .tip{opacity:0!important}' +
    /* Petites hauteurs (paysage desktop, fenêtre réduite) : items scrollables, dock collé en bas */
    '@media (max-height:560px){nav{bottom:10px;max-height:calc(100vh - 20px)}}' +
    '}' +

    /* ── Mobile : pilule flottante centrée en bas (PWA, safe-area) ── */
    '@media (max-width:767px){' +
    'nav{left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom,0px));' +
    'flex-direction:row;justify-content:center;width:max-content;max-width:calc(100vw - 24px);' +
    'background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:6px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.12)}' +
    '@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    'nav{background:color-mix(in srgb,var(--bg) 90%,transparent);' +
    '-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}}' +
    '.inner{flex-direction:row;align-items:center;gap:2px}' +
    'a{flex-direction:column;justify-content:center;gap:3px;padding:6px 12px 5px;min-width:56px;border-radius:999px}' +
    'a:active{opacity:.7}a.active{color:var(--primary)}' +
    'svg{width:22px;height:22px}' +
    '.pill{padding:3px 12px;border-radius:999px}' +
    'a.active .pill{background:color-mix(in srgb,var(--primary) 16%,transparent)}' +
    '.lbl{display:block;font-size:10px;font-weight:600;letter-spacing:.01em}' +
    '.tip,.ind,.brand,.head-label,.grp{display:none}' +
    /* Bouton thème = 4e item compact, séparé par un fin trait (corrige la régression : thème accessible sur mobile) */
    '.foot{display:flex;align-items:center;padding:0 0 0 4px;margin-left:2px;border-left:1px solid var(--border)}' +
    '.foot .act{flex-direction:column;justify-content:center;gap:3px;padding:6px 12px 5px;min-width:48px;border-radius:999px;color:var(--muted)}' +
    '.foot .txt{display:none}' +
    /* Paysage / très petite hauteur : icônes seules (gagne du vertical) */
    '@media (max-height:430px){.lbl{display:none}a{padding:8px 12px;min-width:48px}}' +
    '}' +

    /* ── Accessibilité : neutralise les animations (largeur/transform/opacité) ── */
    '@media (prefers-reduced-motion:reduce){' +
    'nav,nav *,.pill,.tip,.ind,a,button.act{transition:none!important}}';

  var BRAND =
    '<button class=\"brand\" type=\"button\" aria-label=\"Épingler / réduire le menu\" aria-expanded=\"false\">' +
    '<span class=\"box\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"8\" height=\"8\" rx=\"1.6\"/>' +
    '<rect x=\"13\" y=\"3\" width=\"8\" height=\"8\" rx=\"1.6\"/><rect x=\"3\" y=\"13\" width=\"8\" height=\"8\" rx=\"1.6\"/>' +
    '<rect x=\"13\" y=\"13\" width=\"8\" height=\"8\" rx=\"1.6\"/></svg></span>' +
    '<span class=\"head-label\">Zone01</span></button>';

  function isHostDark() {
    var c = document.documentElement.classList;
    if (c.contains('dark')) return true;
    if (c.contains('light')) return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
        '<a class=\"' + (on ? 'active' : '') + '\" href=\"' + app.href + '\"' + (on ? ' aria-current=\"page\"' : '') +
        ' aria-label=\"' + app.label + '\">' +
        '<span class=\"ind\"></span>' +
        '<span class=\"pill\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">' + app.icon + '</svg></span>' +
        '<span class=\"txt\">' + app.label + '</span>' +
        '<span class=\"lbl\">' + app.label + '</span>' +
        '<span class=\"tip\">' + app.label + '</span></a>'
      );
    }).join('');

    var foot =
      '<div class=\"foot\"><button class=\"act theme\" type=\"button\" aria-label=\"Changer de thème\">' +
      '<span class=\"pill\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">' + (dark ? SUN : MOON) + '</svg></span>' +
      '<span class=\"txt\">' + (dark ? 'Mode clair' : 'Mode sombre') + '</span>' +
      '<span class=\"lbl\">Thème</span>' +
      '<span class=\"tip\">Thème</span></button></div>';

    var cls = (dark ? 'dark' : 'light') + (isPinned() ? ' expanded' : '');
    return '<style>' + STYLE + palette + '</style>' +
      '<a class=\"skip\" href=\"#z01-nav-first\">Aller à la navigation Zone01</a>' +
      '<nav class=\"' + cls + '\" aria-label=\"Navigation Zone01\">' + BRAND +
      '<div class=\"inner\"><span class=\"grp\">Zone01</span>' + items + '</div>' + foot + '</nav>';
  }

  function ensureBodySpace() {
    if (document.getElementById('z01-nav-body-pad')) return;
    var st = document.createElement('style');
    st.id = 'z01-nav-body-pad';
    // Desktop : ZÉRO réservation de flux (dock flottant en overlay) — aucun fixed
    // host n'est recouvré. Mobile : --z01-nav-h = hauteur pilule + détachement +
    // safe-area, valeur STABLE (jamais d'auto-hide) consommée par 01deck pour
    // remonter sa bottom-nav. Valeur constante => pas de reflow au scroll.
    st.textContent =
      ':root{--z01-nav-h:0px}' +
      '@media (max-width:767px){:root{--z01-nav-h:calc(' + (BAR_H + 22) +
      'px + env(safe-area-inset-bottom,0px))}body{padding-bottom:var(--z01-nav-h)}}';
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
      var first = this.shadowRoot.querySelector('.inner a');
      if (first) first.id = 'z01-nav-first';
      var brand = this.shadowRoot.querySelector('.brand');
      if (brand) {
        brand.setAttribute('aria-expanded', String(isPinned()));
        brand.addEventListener('click', function () { self._togglePin(); });
      }
      var theme = this.shadowRoot.querySelector('.theme');
      if (theme) theme.addEventListener('click', function () { self._toggleTheme(); });
    };
    // Épingle / désépingle l'état déplié (overlay permanent, JAMAIS de push du flux).
    Z01StudentNav.prototype._togglePin = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (!nav) return;
      var next = !nav.classList.contains('expanded');
      nav.classList.toggle('expanded', next);
      var brand = this.shadowRoot.querySelector('.brand');
      if (brand) brand.setAttribute('aria-expanded', String(next));
      try { window.localStorage.setItem(LS_KEY, String(next)); } catch (e) { /* ignore */ }
    };
    Z01StudentNav.prototype._unpin = function () {
      var nav = this.shadowRoot && this.shadowRoot.querySelector('nav');
      if (nav && nav.classList.contains('expanded')) {
        nav.classList.remove('expanded');
        var brand = this.shadowRoot.querySelector('.brand');
        if (brand) brand.setAttribute('aria-expanded', 'false');
        try { window.localStorage.setItem(LS_KEY, 'false'); } catch (e) { /* ignore */ }
      }
    };
    Z01StudentNav.prototype._toggleTheme = function () {
      var next = isHostDark() ? 'light' : 'dark';
      var html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(next);
      html.style.colorScheme = next;
      // Persistance « best effort » selon les conventions des apps Zone01.
      try { window.localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      try { window.localStorage.setItem('appearance', next); } catch (e) { /* ignore */ }
      // Le MutationObserver (classe de <html>) déclenche le repaint du nav.
    };
    Z01StudentNav.prototype.connectedCallback = function () {
      var self = this;
      this._paint();
      ensureBodySpace();
      if (!this._obs) {
        this._obs = new MutationObserver(function () { self._paint(); });
        this._obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
      if (!this._onKey) {
        this._onKey = function (e) { if (e.key === 'Escape') self._unpin(); };
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
