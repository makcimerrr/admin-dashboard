/**
 * Navbar étudiant PARTAGÉE entre les apps Zone01 (hub, émargement, 01deck).
 * Web component autonome (Shadow DOM → aucun conflit de style avec l'app hôte).
 *
 * Intégration dans n'importe quelle app (Next.js, Laravel, etc.) :
 *   <script src="https://hub.zone01normandie.org/z01-student-nav.js" defer></script>
 *   <z01-student-nav active="hub"></z01-student-nav>   // ou "emargement" / "deck"
 *
 * - Barre fixe en bas (style PWA / tab-bar), identique partout, responsive.
 * - Liens en MÊME ONGLET (pas de target=_blank) → avec le SSO Authentik, on
 *   arrive déjà connecté : impression de rester dans la même app.
 */
(function () {
  if (window.customElements && customElements.get('z01-student-nav')) return;

  var APPS = [
    {
      key: 'hub',
      label: 'Hub',
      href: 'https://hub.zone01normandie.org/',
      // grid / dashboard
      icon: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
    },
    {
      key: 'emargement',
      label: 'Émargement',
      href: 'https://emargement.zone01normandie.org/',
      // clock
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    },
    {
      key: 'deck',
      label: '01 Deck',
      href: 'https://deck.zone01normandie.org/',
      // layers / cards
      icon: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    },
  ];

  var STYLE = [
    ':host{--z01-bg:#0b0b0f;--z01-fg:#e6e6ea;--z01-muted:#8a8a96;--z01-accent:#2f6df6;--z01-border:rgba(255,255,255,.08)}',
    '@media (prefers-color-scheme: light){:host{--z01-bg:#ffffff;--z01-fg:#10121a;--z01-muted:#6b7280;--z01-border:rgba(0,0,0,.10)}}',
    'nav{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;',
    'background:var(--z01-bg);border-top:1px solid var(--z01-border);',
    'padding-bottom:env(safe-area-inset-bottom,0);box-shadow:0 -2px 12px rgba(0,0,0,.15);',
    'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.inner{display:flex;width:100%;max-width:560px}',
    'a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;',
    'padding:8px 4px 6px;min-height:54px;text-decoration:none;color:var(--z01-muted);',
    'font-size:11px;font-weight:500;transition:color .15s,background .15s;-webkit-tap-highlight-color:transparent}',
    'a:hover{color:var(--z01-fg)}',
    'a.active{color:var(--z01-accent)}',
    'a.active .ind{opacity:1;transform:scaleX(1)}',
    'svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.ind{position:absolute;top:0;height:2px;width:34px;background:var(--z01-accent);border-radius:0 0 3px 3px;opacity:0;transform:scaleX(.4);transition:opacity .15s,transform .15s}',
    '.item{position:relative;flex:1;display:flex}',
  ].join('');

  function render(active) {
    var items = APPS.map(function (app) {
      var isActive = app.key === active;
      return (
        '<span class="item">' +
        '<a class="' + (isActive ? 'active' : '') + '" href="' + app.href + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' +
        '<span class="ind"></span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + app.icon + '</svg>' +
        '<span>' + app.label + '</span>' +
        '</a></span>'
      );
    }).join('');
    return '<style>' + STYLE + '</style><nav><div class="inner">' + items + '</div></nav>';
  }

  var SPACER_ID = 'z01-student-nav-spacer';
  function ensureBottomSpace() {
    // Réserve de l'espace en bas pour que le contenu ne soit pas masqué par la barre fixe.
    try {
      var prev = document.body.getAttribute('data-z01-nav-pad');
      if (!prev) {
        document.body.setAttribute('data-z01-nav-pad', '1');
        document.body.style.paddingBottom = 'calc(56px + env(safe-area-inset-bottom,0px))';
      }
    } catch (e) {}
  }

  var Z01StudentNav = (function () {
    function Z01StudentNav() {
      var self = Reflect.construct(HTMLElement, [], Z01StudentNav);
      return self;
    }
    Z01StudentNav.prototype = Object.create(HTMLElement.prototype);
    Z01StudentNav.prototype.constructor = Z01StudentNav;
    Z01StudentNav.prototype.connectedCallback = function () {
      var active = this.getAttribute('active') || '';
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = render(active);
      ensureBottomSpace();
    };
    Z01StudentNav.observedAttributes = ['active'];
    Z01StudentNav.prototype.attributeChangedCallback = function () {
      if (this.shadowRoot) this.shadowRoot.innerHTML = render(this.getAttribute('active') || '');
    };
    Object.setPrototypeOf(Z01StudentNav, HTMLElement);
    return Z01StudentNav;
  })();

  customElements.define('z01-student-nav', Z01StudentNav);
})();
