/**
 * script.js — GCSv2.3 Interactions
 * Vanilla JS, module pattern, IntersectionObserver-based.
 */

(function () {
  'use strict';

  // ── Utilities ────────────────────────────────────────────────────────────────
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ── Init Chain ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHeroSlider();
    initScrollReveal();
    initCounters();
    initVideoModals();
    initSelector();
    initLanguage();
  });

  // ── Navigation ───────────────────────────────────────────────────────────────
  function initNav() {
    var nav = qs('.the-nav');
    var topBar = qs('.top-bar');
    var toggle = qs('.nav-toggle');
    var overlay = qs('.nav-overlay');
    var scrollThreshold = 100;
    var lastScroll = 0;

    function onScroll() {
      var y = window.scrollY;

      // Nav background
      if (y > scrollThreshold) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }

      // Top bar hide on scroll down
      if (y > lastScroll && y > 50) {
        topBar.classList.add('is-hidden');
        nav.style.top = '0';
      } else {
        topBar.classList.remove('is-hidden');
        nav.style.top = '';
      }

      lastScroll = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    if (toggle && overlay) {
      toggle.addEventListener('click', function () {
        var isOpen = overlay.classList.contains('is-open');
        if (isOpen) {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
          toggle.classList.remove('is-active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          nav.style.zIndex = '';
        } else {
          overlay.classList.add('is-open');
          overlay.setAttribute('aria-hidden', 'false');
          toggle.classList.add('is-active');
          toggle.setAttribute('aria-expanded', 'true');
          document.body.style.overflow = 'hidden';
          nav.style.zIndex = '201';
        }
      });

      // Close on link click
      qsa('.nav-overlay__menu a').forEach(function (a) {
        a.addEventListener('click', function () {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
          toggle.classList.remove('is-active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          nav.style.zIndex = '';
        });
      });
    }
  }

  // ── Hero Slider ──────────────────────────────────────────────────────────────
  function initHeroSlider() {
    var slides = qsa('.hero-slide');
    var prevBtn = qs('.hero-slider__prev');
    var nextBtn = qs('.hero-slider__next');
    var currentEl = qs('.hero-slider__current');
    var totalEl = qs('.hero-slider__total');

    if (!slides.length) return;

    var current = 0;
    var total = slides.length;
    var autoplayInterval = 6000;
    var timer;

    if (totalEl) totalEl.textContent = total;

    function goTo(index) {
      var prevVideo = slides[current].querySelector('.hero-slide__video');
      if (prevVideo) prevVideo.pause();
      slides[current].classList.remove('hero-slide--active');
      current = ((index % total) + total) % total;
      slides[current].classList.add('hero-slide--active');
      var nextVideo = slides[current].querySelector('.hero-slide__video');
      if (nextVideo) nextVideo.play();
      if (currentEl) currentEl.textContent = current + 1;
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function hasVideo(index) {
      return !!slides[index].querySelector('.hero-slide__video');
    }

    function startAutoplay() {
      stopAutoplay();
      if (!hasVideo(current)) {
        timer = setInterval(next, autoplayInterval);
      }
    }

    function stopAutoplay() {
      if (timer) clearInterval(timer);
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAutoplay(); });

    startAutoplay();

    // Hero video — fade out poster image once video plays, show it on error
    qsa('.hero-slide__video').forEach(function (video) {
      video.addEventListener('playing', function () {
        video.setAttribute('data-status', 'playing');
      });
      video.addEventListener('error', function () {
        video.removeAttribute('data-status');
      });
    });
  }

  // ── Scroll Reveal ────────────────────────────────────────────────────────────
  function initScrollReveal() {
    var modules = qsa('.module[data-animate]');

    if (!modules.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('appear');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    modules.forEach(function (mod) {
      observer.observe(mod);
    });
  }

  // ── Counter Animation ────────────────────────────────────────────────────────
  function initCounters() {
    var values = qsa('.number-card__value');

    if (!values.length) return;

    function formatNumber(num, separator) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator || '.');
    }

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animateCounter(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var separator = el.getAttribute('data-separator') || '.';
      var duration = 2000;
      var start = null;

      el.textContent = '0' + suffix;

      function step(timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var easedProgress = easeOutExpo(progress);
        var currentValue = Math.floor(easedProgress * target);
        el.textContent = formatNumber(currentValue, separator) + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = formatNumber(target, separator) + suffix;
        }
      }

      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var cards = entry.target.querySelectorAll('.number-card__value');
          cards.forEach(function (el) {
            animateCounter(el);
          });
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.3
    });

    var section = qs('.module--numero');
    if (section) observer.observe(section);
  }

  // ── Video Modals ─────────────────────────────────────────────────────────────
  function initVideoModals() {
    var modal = qs('#videoModal');
    var iframe = qs('#videoIframe');
    var closeBtn = qs('.video-modal__close');
    var modalOverlay = qs('.video-modal__overlay');

    if (!modal || !iframe) return;

    var players = qsa('.video-player');

    players.forEach(function (player) {
      player.addEventListener('click', function () {
        var videoUrl = player.getAttribute('data-video');
        if (!videoUrl) return;

        // Add autoplay param
        var sep = videoUrl.includes('?') ? '&' : '?';
        iframe.src = videoUrl + sep + 'autoplay=1';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      iframe.src = '';
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  // ── Business Selector ────────────────────────────────────────────────────────
  function initSelector() {
    var tabs = qsa('.selector__tab');
    var panels = qsa('.selector__panel');

    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetIndex = tab.getAttribute('data-tab');

        // Update tabs
        tabs.forEach(function (t) {
          t.classList.remove('selector__tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('selector__tab--active');
        tab.setAttribute('aria-selected', 'true');

        // Update panels
        panels.forEach(function (p) {
          p.classList.remove('selector__panel--active');
        });

        var targetPanel = panels.filter(function (p) {
          return p.getAttribute('data-panel') === targetIndex;
        })[0];

        if (targetPanel) {
          targetPanel.classList.add('selector__panel--active');
        }
      });
    });
  }

  // ── Language Switcher ────────────────────────────────────────────────────────
  var TRANSLATIONS = {
    en: {
      'skip': 'Skip to main content',
      'tb.cnmv': 'CNMV COMMUNICATIONS', 'tb.contact': 'CONTACT', 'tb.lang': 'ESPAÑOL',
      'tb.companies': 'ACS Group Companies', 'tb.search': 'Search',
      'nav.label': 'Main navigation', 'nav.home': 'Grupo ACS - Home', 'nav.toggle': 'Open menu',
      'nav.0': 'About ACS', 'nav.1': 'Business Areas', 'nav.2': 'Shareholders & Investors',
      'nav.3': 'Corporate Governance', 'nav.4': 'Compliance', 'nav.5': 'Sustainability',
      'nav.6': 'Press Room', 'nav.7': 'Privacy Policy',
      'header.label': 'Featured presentations',
      's0.alt': 'Results H1 2024',
      's0.title': 'Results <em>H1 2024</em>',
      's0.text': 'ACS achieves a net profit of 416 million euros in the first half of 2024, up 8.1%',
      's0.btn': 'READ MORE <span class="btn__arrow">&rarr;</span>',
      's0b.alt': 'Annual General Meeting',
      's0b.text': 'We held our 2024 Annual General Meeting at the IFEMA south auditorium. The replay of the event is available on our website.',
      's0b.btn': 'READ MORE <span class="btn__arrow">&rarr;</span>',
      's0c.title': 'Capital<br><em>Markets Day 2024</em>',
      's0c.text': 'Discover our business strategy, financial performance and growth prospects. We offer a comprehensive view of our ability to create value and the initiatives that will drive our success.',
      's0c.btn': 'Read more <span class="btn__arrow">&rarr;</span>',
      'slider.prev': 'Previous slide', 'slider.next': 'Next slide',
      's1.label': 'Video AGM 2024', 's1.pre': 'VIDEO',
      's1.title': 'Our opening video of the <em>AGM 2024</em>',
      's1.desc': 'This is the video presentation of the cohesive strategy and vision for the present and future of Grupo ACS, explained to our shareholders by some of the most representative executives of our companies.',
      's1.alt': 'AGM 2024 opening video', 'play': 'Play video', 's1.cap': 'AGM 2024 OPENING VIDEO',
      's2.label': 'Latest news', 's2.pre': 'Press Room',
      's2.title': '<em>Latest</em> news',
      's2.link': 'SEE ALL OUR NEWS <span class="btn__arrow">&rarr;</span>',
      'news.tag': 'News', 'news.read': 'READ <span class="btn__arrow">&rarr;</span>',
      'n0.alt': 'ACS achieves a net profit of 416 million euros',
      'n0.title': 'ACS achieves a net profit of 416 million euros in the first half of 2024, up 8.1%',
      'n0.excerpt': 'Sales reach 18,749 million euros, increasing 10.1% compared to the previous year. EBITDA stands at 1,157 million euros, growing 23.8%, after...',
      'n1.alt': 'SR400 Express Lane in Atlanta',
      'n1.title': 'ACS Group, Acciona and Meridiam will build and operate the SR400 Express Lane in Atlanta (Georgia) for 50 years',
      'n2.alt': 'Neoen Western Downs Battery',
      'n2.title': "CIMIC to build the second phase of Neoen's Western Downs Battery",
      'n3.alt': 'Abertis expands presence in Chile',
      'n3.title': 'Abertis expands its presence in Chile after winning the Ruta 5 Santiago - Los Vilos concession',
      'n4.alt': 'HOCHTIEF Scotland contract',
      'n4.title': 'HOCHTIEF awarded a major infrastructure maintenance contract in Scotland',
      'n5.alt': 'ACS zero-emission mobility',
      'n5.title': 'ACS leads and transforms zero-emission mobility',
      'n6.alt': 'Civil Engineering North America',
      'n6.title': 'A leading Civil Engineering company is born in North America',
      's3.label': 'Integrated Report 2023', 's3.pre': 'Shareholders & Investors',
      's3.title': 'Integrated Report 2023',
      's3.desc': 'View the latest report published by Grupo ACS',
      's3.btn': 'Access <span class="btn__arrow">&rarr;</span>',
      's3.alt': 'Integrated Report 2023',
      's4.label': 'Video CMD', 's4.pre': 'VIDEO',
      's4.title': 'This was our <em>CMD</em>;<br>One Group, One Team',
      's4.desc': 'Grupo ACS held its first Capital Markets Day at the C\u00edrculo de Bellas Artes, presenting its 2024-2026 Strategic Plan',
      's5.label': 'Business Areas', 's5.pre': 'Activities',
      's5.title': '<em>Business</em> Areas',
      's5.t0': 'Integrated Solutions', 's5.t1': 'Civil Engineering & Construction',
      's5.t2': 'Infrastructure Investment', 's5.t3': 'Other Businesses',
      's5.more': 'READ MORE <span class="btn__arrow">&rarr;</span>',
      's5.p0.h': 'Integrated Solutions',
      's5.p0.d': 'The Group drives projects linked to high added-value sectors.',
      's5.p0.alt': 'Integrated Solutions',
      's5.p1.h': 'Civil Engineering & Construction',
      's5.p1.d': 'World leader in infrastructure construction and civil engineering.',
      's5.p1.alt': 'Civil Engineering & Construction',
      's5.p2.h': 'Infrastructure Investment',
      's5.p2.d': 'Management and operation of transport infrastructure on a global level.',
      's5.p2.alt': 'Infrastructure Investment',
      's5.p3.h': 'Other Businesses',
      's5.p3.d': 'Complementary activities that bring diversification to the group.',
      's5.p3.alt': 'Other Businesses',
      's6.label': 'Sustainability', 's6.pre': 'Sustainability',
      's6.title': '<em>We contribute to<br>sustainable development</em>',
      's6.desc': 'Grupo ACS is sustainability. The Dow Jones Sustainability World Index highlights our commitment to the environment at an international level.',
      's6.btn': 'READ MORE <span class="btn__arrow">&rarr;</span>',
      's6.alt': 'We contribute to sustainable development',
      's7.label': 'Key figures', 's7.pre': 'Footprint in numbers',
      's7.title': '<em>Key figures</em> of<br>Grupo ACS in 2023',
      's7.link': 'ACCESS FINANCIAL INFORMATION <span class="btn__arrow">&rarr;</span>',
      's7.l0': 'Sales', 's7.l1': 'Backlog', 's7.l2': 'Net profit', 's7.l3': 'Employees',
      's8.label': 'Corporate video', 's8.pre': 'VIDEO',
      's8.title': 'Building the future,<br><em>transforming</em><br>the present',
      's8.desc': 'We build a better future through the development and operation of infrastructure that contributes to the economic and social progress of the countries in which we are present.',
      's8.link': 'WATCH OUR VIDEOS <span class="btn__arrow">&rarr;</span>',
      's8.alt': 'Building the future, transforming the present',
      's9.label': 'Careers', 's9.pre': 'Careers',
      's9.title': '<em>Find your place</em> at Grupo ACS',
      's9.sub': 'Experts in building a better world',
      's9.desc': 'At Grupo ACS, we are more than 135,000 professionals from the most diverse disciplines, working side by side to build a better future for everyone. Join our team.',
      's9.link': 'ACCESS THE CAREERS PORTAL <span class="btn__arrow">&rarr;</span>',
      's9.alt': 'Careers at Grupo ACS',
      's10.pre': 'Up to date',
      's10.title': 'Subscribe to<br>our <em>newsletter</em>',
      's10.desc': 'Receive the latest news about Grupo ACS periodically in your email inbox.',
      's10.btn': 'SUBSCRIBE HERE <span class="btn__arrow">&rarr;</span>',
      's10.alt': 'Subscribe to our newsletter',
      'ft.label': 'Footer', 'ft.home': 'Grupo ACS - Home', 'ft.nav': 'Footer links',
      'ft.0': 'General Information', 'ft.1': 'Cookie Policy', 'ft.2': 'Legal Notice',
      'ft.3': 'ACS Group Companies', 'ft.4': 'Contact',
      'modal.label': 'Video player', 'modal.close': 'Close video'
    },
    es: {
      'skip': 'Saltar al contenido principal',
      'tb.cnmv': 'COMUNICACIONES CNMV', 'tb.contact': 'CONTACTO', 'tb.lang': 'ENGLISH',
      'tb.companies': 'Empresas del Grupo ACS', 'tb.search': 'Buscar',
      'nav.label': 'Navegaci\u00f3n principal', 'nav.home': 'Grupo ACS - Inicio', 'nav.toggle': 'Abrir men\u00fa',
      'nav.0': 'Conozca ACS', 'nav.1': '\u00c1reas de negocio', 'nav.2': 'Accionistas e inversores',
      'nav.3': 'Gobierno corporativo', 'nav.4': 'Compliance', 'nav.5': 'Sostenibilidad',
      'nav.6': 'Sala de prensa', 'nav.7': 'Pol\u00edtica de privacidad',
      'header.label': 'Presentaciones destacadas',
      's0.alt': 'Resultados 1S 2024',
      's0.title': 'Resultados <em>1S 2024</em>',
      's0.text': 'ACS obtiene un beneficio neto de 416 millones de euros en el primer semestre de 2024, un 8,1% m\u00e1s',
      's0.btn': 'VER M\u00c1S <span class="btn__arrow">&rarr;</span>',
      's0b.alt': 'Junta General de Accionistas',
      's0b.text': 'Hemos celebrado en el auditorio sur IFEMA nuestra Junta General de Accionistas 2024. La redifusi\u00f3n del evento se encuentra disponible en nuestra web.',
      's0b.btn': 'VER M\u00c1S <span class="btn__arrow">&rarr;</span>',
      's0c.title': 'Capital<br><em>Markets Day 2024</em>',
      's0c.text': 'Descubre nuestra estrategia empresarial, desempe\u00f1o financiero y perspectivas de crecimiento. Te ofrecemos una visi\u00f3n integral de nuestra capacidad para generar valor y las iniciativas que impulsar\u00e1n nuestro \u00e9xito.',
      's0c.btn': 'Ver m\u00e1s <span class="btn__arrow">&rarr;</span>',
      'slider.prev': 'Diapositiva anterior', 'slider.next': 'Siguiente diapositiva',
      's1.label': 'V\u00eddeo JGA 2024', 's1.pre': 'V\u00cdDEO',
      's1.title': 'Nuestro v\u00eddeo de apertura de la <em>JGA 2024</em>',
      's1.desc': 'Esta es la presentaci\u00f3n en v\u00eddeo de la estrategia cohesionada y visi\u00f3n de presente y futuro del Grupo ACS, explicada a nuestros accionistas por algunos de los directivos m\u00e1s representativos de nuestras empresas.',
      's1.alt': 'V\u00eddeo de apertura JGA 2024', 'play': 'Reproducir v\u00eddeo', 's1.cap': 'V\u00cdDEO DE APERTURA JGA 2024',
      's2.label': '\u00daltimas noticias', 's2.pre': 'Sala de prensa',
      's2.title': '<em>\u00daltimas</em> noticias',
      's2.link': 'CONOCE TODAS NUESTRAS NOTICIAS <span class="btn__arrow">&rarr;</span>',
      'news.tag': 'Noticia', 'news.read': 'LEER <span class="btn__arrow">&rarr;</span>',
      'n0.alt': 'ACS obtiene un beneficio neto de 416 millones de euros',
      'n0.title': 'ACS obtiene un beneficio neto de 416 millones de euros en el primer semestre de 2024, un 8,1% m\u00e1s',
      'n0.excerpt': 'Las ventas alcanzan los 18.749 millones de euros, aumentando un 10,1% respecto al a\u00f1o anterior. El EBITDA se sit\u00faa en los 1.157 millones de euros, creciendo un 23,8%, tras...',
      'n1.alt': 'SR400 Express Lane de Atlanta',
      'n1.title': 'El Grupo ACS, Acciona y Meridiam construir\u00e1n y operar\u00e1n la SR400 Express Lane de Atlanta (Georgia) durante 50 a\u00f1os',
      'n2.alt': 'Bater\u00eda Western Downs de Neoen',
      'n2.title': 'CIMIC construir\u00e1 la segunda fase de la bater\u00eda Western Downs de Neoen',
      'n3.alt': 'Abertis ampl\u00eda presencia en Chile',
      'n3.title': 'Abertis ampl\u00eda su presencia en Chile tras ganar la concesi\u00f3n de la Ruta 5 Santiago - Los Vilos',
      'n4.alt': 'HOCHTIEF contrato Escocia',
      'n4.title': 'HOCHTIEF se adjudica un importante contrato de mantenimiento de infraestructuras en Escocia',
      'n5.alt': 'ACS movilidad cero emisiones',
      'n5.title': 'ACS lidera y transforma la movilidad de cero emisiones',
      'n6.alt': 'Ingenier\u00eda Civil Norteam\u00e9rica',
      'n6.title': 'Nace la empresa de Ingenier\u00eda Civil referente en Norteam\u00e9rica',
      's3.label': 'Informe Integrado 2023', 's3.pre': 'Accionistas e inversores',
      's3.title': 'Informe Integrado 2023',
      's3.desc': 'Consulta el \u00faltimo informe publicado por el Grupo ACS',
      's3.btn': 'Acceder <span class="btn__arrow">&rarr;</span>',
      's3.alt': 'Informe Integrado 2023',
      's4.label': 'V\u00eddeo CMD', 's4.pre': 'V\u00cdDEO',
      's4.title': 'As\u00ed fue nuestro <em>CMD</em>;<br>One Group, One Team',
      's4.desc': 'El Grupo ACS ha celebrado en el C\u00edrculo de Bellas Artes su primer Capital Markets Day presentando su Plan Estrat\u00e9gico 2024-2026',
      's5.label': '\u00c1reas de negocio', 's5.pre': 'Actividades',
      's5.title': '<em>\u00c1reas</em> de negocio',
      's5.t0': 'Soluciones Integrales', 's5.t1': 'Ingenier\u00eda Civil y Construcci\u00f3n',
      's5.t2': 'Inversi\u00f3n en Infraestructuras', 's5.t3': 'Otros Negocios',
      's5.more': 'VER M\u00c1S <span class="btn__arrow">&rarr;</span>',
      's5.p0.h': 'Soluciones Integrales',
      's5.p0.d': 'El Grupo impulsa proyectos ligados a sectores de alto valor a\u00f1adido.',
      's5.p0.alt': 'Soluciones Integrales',
      's5.p1.h': 'Ingenier\u00eda Civil y Construcci\u00f3n',
      's5.p1.d': 'L\u00edder mundial en construcci\u00f3n e ingenier\u00eda civil de infraestructuras.',
      's5.p1.alt': 'Ingenier\u00eda Civil y Construcci\u00f3n',
      's5.p2.h': 'Inversi\u00f3n en Infraestructuras',
      's5.p2.d': 'Gesti\u00f3n y operaci\u00f3n de infraestructuras de transporte a nivel global.',
      's5.p2.alt': 'Inversi\u00f3n en Infraestructuras',
      's5.p3.h': 'Otros Negocios',
      's5.p3.d': 'Actividades complementarias que aportan diversificaci\u00f3n al grupo.',
      's5.p3.alt': 'Otros Negocios',
      's6.label': 'Sostenibilidad', 's6.pre': 'Sostenibilidad',
      's6.title': '<em>Contribuimos al<br>desarrollo sostenible</em>',
      's6.desc': 'El Grupo ACS es sostenibilidad. El Dow Jones Sustainability World Index destaca nuestro compromiso con el medio ambiente a nivel internacional.',
      's6.btn': 'VER M\u00c1S <span class="btn__arrow">&rarr;</span>',
      's6.alt': 'Contribuimos al desarrollo sostenible',
      's7.label': 'Cifras principales', 's7.pre': 'Huella en n\u00fameros',
      's7.title': '<em>Principales cifras</em> del<br>Grupo ACS en 2023',
      's7.link': 'ACCEDE A LA INFORMACI\u00d3N FINANCIERA <span class="btn__arrow">&rarr;</span>',
      's7.l0': 'Ventas', 's7.l1': 'Cartera', 's7.l2': 'Beneficio neto', 's7.l3': 'Empleados',
      's8.label': 'V\u00eddeo corporativo', 's8.pre': 'V\u00cdDEO',
      's8.title': 'Construyendo el futuro,<br><em>transformando</em><br>el presente',
      's8.desc': 'Construimos un futuro mejor a trav\u00e9s del desarrollo y la operaci\u00f3n de infraestructuras que contribuyen al progreso econ\u00f3mico y social de los pa\u00edses en los que estamos presentes.',
      's8.link': 'VER NUESTROS VIDEOS <span class="btn__arrow">&rarr;</span>',
      's8.alt': 'Construyendo el futuro, transformando el presente',
      's9.label': 'Empleo', 's9.pre': 'Empleo',
      's9.title': '<em>Encuentra tu lugar</em> en el Grupo ACS',
      's9.sub': 'Expertos en construir un mundo mejor',
      's9.desc': 'En el Grupo ACS somos m\u00e1s de 135.000 profesionales de las disciplinas m\u00e1s diversas, trabajando codo a codo para construir un futuro mejor para todos. \u00danete a nuestro equipo.',
      's9.link': 'ACCEDER AL PORTAL DE EMPLEO <span class="btn__arrow">&rarr;</span>',
      's9.alt': 'Empleo en el Grupo ACS',
      's10.pre': 'Al d\u00eda',
      's10.title': 'Suscr\u00edbete a<br>nuestra <em>newsletter</em>',
      's10.desc': 'Recibe peri\u00f3dicamente en tu buz\u00f3n de correo electr\u00f3nico la \u00faltima hora sobre el Grupo ACS.',
      's10.btn': 'SUSCR\u00cdBETE AQU\u00cd <span class="btn__arrow">&rarr;</span>',
      's10.alt': 'Suscr\u00edbete a nuestra newsletter',
      'ft.label': 'Pie de p\u00e1gina', 'ft.home': 'Grupo ACS - Inicio', 'ft.nav': 'Enlaces del pie de p\u00e1gina',
      'ft.0': 'Informaci\u00f3n general', 'ft.1': 'Pol\u00edtica de Cookies', 'ft.2': 'Aviso Legal',
      'ft.3': 'Empresas del Grupo ACS', 'ft.4': 'Contacto',
      'modal.label': 'Reproductor de v\u00eddeo', 'modal.close': 'Cerrar v\u00eddeo'
    }
  };

  function initLanguage() {
    var currentLang = localStorage.getItem('acs-lang') || 'en';
    if (currentLang !== 'en') {
      applyLanguage(currentLang);
    }

    var toggle = qs('#lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        currentLang = currentLang === 'en' ? 'es' : 'en';
        localStorage.setItem('acs-lang', currentLang);
        applyLanguage(currentLang);
      });
    }
  }

  function applyLanguage(lang) {
    var t = TRANSLATIONS[lang];
    if (!t) return;

    document.documentElement.lang = lang;

    // textContent
    qsa('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] != null) el.textContent = t[key];
    });

    // innerHTML
    qsa('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] != null) el.innerHTML = t[key];
    });

    // aria-label
    qsa('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (t[key] != null) el.setAttribute('aria-label', t[key]);
    });

    // alt
    qsa('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      if (t[key] != null) el.setAttribute('alt', t[key]);
    });
  }

})();
