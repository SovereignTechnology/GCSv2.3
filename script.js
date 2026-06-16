/**
 * script.js — GCS El Salvador Interactions
 * Vanilla JS, module pattern, IntersectionObserver-based.
 */

(function () {
  'use strict';

  // ── Utilities ────────────────────────────────────────────────────────────────
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ── Init Chain ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNav();
    initHeroSlider();
    initScrollReveal();
    initCounters();
    initVideoModals();
    initSelector();
    initLanguage();
    initSmoothScroll();
  });

  // ── Theme Switcher ──────────────────────────────────────────────────────────
  function initTheme() {
    var toggle = qs('#theme-toggle');
    if (!toggle) return;

    var stored = localStorage.getItem('gcs-theme');
    var currentTheme;

    if (stored) {
      currentTheme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark';
    } else {
      currentTheme = 'light';
    }

    document.documentElement.setAttribute('data-theme', currentTheme);

    requestAnimationFrame(function () {
      document.body.classList.remove('no-transition');
    });

    toggle.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('gcs-theme', currentTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('gcs-theme')) {
        currentTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
      }
    });
  }

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

      if (y > scrollThreshold) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }

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

  // ── Smooth Scroll for Anchor Links ───────────────────────────────────────────
  function initSmoothScroll() {
    var navHeight = 60;
    var topBarHeight = 32;

    qsa('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = link.getAttribute('href');
        if (targetId === '#' || targetId === '#main-content') return;

        var target = qs(targetId);
        if (!target) return;

        e.preventDefault();
        var offset = navHeight + topBarHeight + 20;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  // ── Hero Slider ──────────────────────────────────────────────────────────────
  function initHeroSlider() {
    var slides = qsa('.hero-slide');
    var prevBtn = qs('.hero-slider__prev');
    var nextBtn = qs('.hero-slider__next');
    var currentEl = qs('.hero-slider__current');
    var totalEl = qs('.hero-slider__total');

    if (!slides.length || slides.length <= 1) {
      // Single slide — just ensure video plays
      var singleVideo = slides.length === 1 && slides[0].querySelector('.hero-slide__video');
      if (singleVideo) {
        singleVideo.play();
        singleVideo.addEventListener('playing', function () {
          singleVideo.setAttribute('data-status', 'playing');
        });
      }
      return;
    }

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
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator || ',');
    }

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animateCounter(el) {
      var target = parseFloat(el.getAttribute('data-target'));
      var suffix = el.getAttribute('data-suffix') || '';
      var separator = el.getAttribute('data-separator') || ',';
      var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      var duration = 2000;
      var start = null;

      el.textContent = prefix + '0' + suffix;

      function step(timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var easedProgress = easeOutExpo(progress);
        var currentValue = easedProgress * target;
        var display = decimals > 0
          ? currentValue.toFixed(decimals)
          : formatNumber(Math.floor(currentValue), separator);
        el.textContent = prefix + display + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          var finalDisplay = decimals > 0
            ? target.toFixed(decimals)
            : formatNumber(target, separator);
          el.textContent = prefix + finalDisplay + suffix;
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

        tabs.forEach(function (t) {
          t.classList.remove('selector__tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('selector__tab--active');
        tab.setAttribute('aria-selected', 'true');

        // Scroll the selected tab to center of the tab bar
        var container = tab.parentElement;
        var scrollLeft = tab.offsetLeft - (container.clientWidth / 2) + (tab.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });

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
      'tb.tagline': 'Grupo Integral De Construcciones y Servicios',
      'tb.contact': 'CONTACT', 'tb.lang': 'ESPAÑOL',
      'nav.label': 'Main navigation', 'nav.home': 'GCS - Home', 'nav.toggle': 'Open menu',
      'nav.0': 'Services', 'nav.1': 'Projects', 'nav.2': 'Machinery',
      'nav.3': 'Team', 'nav.4': 'Contact',
      'header.label': 'Company introduction',
      'hero.title': 'Experts in Construction<br><em>and problem solving</em>',
      'hero.cta': 'Explore Our Services <span class="btn__arrow">&rarr;</span>',
      'hero.cert.title': 'Director de Obra',
      'hero.cert.sub': 'CS/3 Accreditation · COAMSS·OPAMSS',
      'hero.cert.aria': 'Director de Obra — view our accredited engineer',

      'svc.label': 'Our Services', 'svc.pre': 'What We Do',
      'svc.title': 'Our <em>Services</em>',
      'svc.t0': 'Permitting & Management', 'svc.t1': 'Engineering & Design',
      'svc.t2': 'Residential Construction', 'svc.t3': 'Commercial Construction',
      'svc.t4': 'Heavy Equipment Rental',
      'svc.more': 'LEARN MORE <span class="btn__arrow">&rarr;</span>',
      'svc.p0.h': 'Permitting & Regulatory Management',
      'svc.p0.d': 'We handle all pre-construction documentation and institutional coordination to secure approvals. From OPAMSS pre-procedures and site qualification to hydrological studies \u2014 we navigate the regulatory landscape so your project moves forward without delays.',
      'svc.p1.h': 'Engineering & Design',
      'svc.p1.d': 'From initial concepts to final blueprints, our engineering team transforms your vision into precise, buildable plans. We specialize in conceptual design, land surveys, topographical studies, structural plans, and BIM-based modeling for complete construction documentation.',
      'svc.p2.h': 'Residential Construction',
      'svc.p2.d': 'We build homes and residential developments that stand the test of time. From custom family houses to multi-unit apartment complexes, our residential projects combine quality craftsmanship, modern design, and efficient project management.',
      'svc.p3.h': 'Commercial Construction',
      'svc.p3.d': 'Our commercial construction division delivers restaurants, retail spaces, office buildings, and wellness complexes. We manage every phase from foundation to finish, ensuring projects meet commercial-grade standards, timelines, and budgets.',
      'svc.p4.h': 'Heavy Equipment Rental',
      'svc.p4.d': 'Access our fleet of professional-grade construction equipment. From excavators and cranes to concrete mixers and dump trucks \u2014 we provide well-maintained heavy machinery with flexible rental terms to keep your project on schedule.',
      'svc.p0.alt': 'Architectural blueprint of a building floor plan',
      'svc.p1.alt': 'Engineer using a total station for land surveying',
      'svc.p2.alt': 'Timber-framed house under construction',
      'svc.p3.alt': 'High-rise commercial building under construction with a tower crane',
      'svc.p4.alt': 'Caterpillar excavator working on a construction site',

      'proj.label': 'Our Projects', 'proj.pre': 'Portfolio',
      'proj.title': 'Our <em>Projects</em>',
      'proj.desc': 'We have been the executors of the following projects across El Salvador and beyond.',
      'proj.tag.res': 'Residential', 'proj.tag.com': 'Commercial',
      'proj.p0.title': 'Rental Units Building', 'proj.p0.loc': 'Santa Tecla, El Salvador',
      'proj.p1.title': 'Apartamentos Kawok', 'proj.p1.loc': 'San Salvador, El Salvador',
      'proj.p2.title': 'Sound Health Wellness Complex', 'proj.p2.loc': 'San Diego, USA',
      'proj.p3.title': 'Mont-Galia Apartments', 'proj.p3.loc': 'Santa Tecla, El Salvador',
      'proj.p4.title': 'Punta Mango House', 'proj.p4.loc': 'Punta Mango, El Salvador',
      'proj.p5.title': 'Luxury Cabins', 'proj.p5.loc': 'La Posada de los P\u00e1jaros',

      'mach.label': 'Our Machinery', 'mach.pre': 'Equipment Fleet',
      'mach.title': 'Our <em>Machinery</em>',
      'mach.m0.title': 'Excavators',
      'mach.m0.spec': 'CAT 320 Series \u2014 Versatile hydraulic excavators for earthmoving, trenching, and demolition. 20-ton operating weight class.',
      'mach.m1.title': 'Concrete Mixers',
      'mach.m1.spec': 'Heavy-duty transit mixers with 8-12 cubic meter drum capacity. Reliable fleet for continuous concrete delivery.',
      'mach.m2.title': 'Cranes',
      'mach.m2.spec': 'Tower and mobile cranes for lifting and placement. Capacity ranges from 5 to 80 tons for any project scale.',
      'mach.m3.title': 'Dump Trucks',
      'mach.m3.spec': 'Articulated dump trucks for hauling earth, gravel, and debris. 25-40 ton payload capacity for high-volume operations.',
      'mach.m4.title': 'Mazda BT-50 — Silver (2024)',
      'mach.m4.spec': '4×4 utility pickup in silver — part of the GCS field fleet for site supervision, crew transport, and logistics.',
      'mach.m4.alt': 'Mazda BT-50 2024 in silver — GCS fleet vehicle',
      'mach.m5.title': 'Mazda BT-50 — Grey (2024)',
      'mach.m5.spec': '4×4 utility pickup in grey — keeps project teams and materials moving across active job sites.',
      'mach.m5.alt': 'Mazda BT-50 2024 in grey — GCS fleet vehicle',
      'mach.m6.title': 'Mitsubishi L200 — Black (2026)',
      'mach.m6.spec': '4×4 double-cab pickup in black — rugged transport for engineers and equipment between job sites.',
      'mach.m6.alt': 'Mitsubishi L200 2026 in black — GCS fleet vehicle',
      'mach.m7.title': 'Toyota Hilux Single Cab — White (2022)',
      'mach.m7.spec': 'Single-cab work pickup in white — reliable hauler for tools and materials in daily site operations.',
      'mach.m7.alt': 'Toyota Hilux single cab 2022 in white — GCS fleet vehicle',

      'team.label': 'Our Team', 'team.pre': 'Our People',
      'team.title': 'Meet the <em>Team</em>',
      'team.max.name': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.role': 'CEO \u00b7 Engineer \u2014 Director de Obra',
      'team.max.bio': 'GCS\u2019s CEO and a licensed engineer, Max holds the COAMSS/OPAMSS Director de Obra accreditation \u2014 the highest credential a civil engineer or architect can earn, requiring nine years of government-verified experience. It authorizes him to take legal responsibility for construction of any kind. Today no project can be built \u2014 and no company can legally call itself a construction firm \u2014 without a Director de Obra.',
      'team.max.alt': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval, CEO of GCS',
      'team.max.cred_authority': 'COAMSS \u00b7 OPAMSS \u2014 Construction & Supervision',
      'team.max.cred_reg_label': 'Reg.',
      'team.max.cred_reg': 'HJ046931663',
      'team.max.cred_valid_label': 'Valid',
      'team.max.cred_valid': '21/04/2026 \u2013 21/04/2029',
      'team.max.carnet_label': 'View accreditation \u2197',
      'team.max.carnet_alt': 'OPAMSS accreditation card for Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.carnet_aria': 'Open the full OPAMSS accreditation card',
      'team.ed.name': 'Eduardo Margerit',
      'team.ed.role': 'COO',
      'team.ed.bio': 'Chief Operating Officer of GCS, Eduardo leads day-to-day operations \u2014 coordinating projects, resources, and teams to deliver every job on time and to standard.',
      'team.ed.alt': 'Eduardo Margerit, COO of GCS',

      'num.label': 'Key figures', 'num.pre': 'GCS By The Numbers',
      'num.title': '<em>Key Figures</em>',
      'num.l0': 'Portfolio Value', 'num.l1': 'Active Projects',
      'num.l2': 'Years Experience', 'num.l3': 'Team Members',

      'cta.label': 'Contact us', 'cta.pre': 'Get In Touch',
      'cta.title': 'Ready to <em>Build?</em>',
      'cta.desc': 'Contact us today to learn more about how we can bring your construction project to life. From permits to completion, we\u2019re with you every step.',
      'cta.btn': 'Contact Us <span class="btn__arrow">&rarr;</span>',

      'form.name': 'Full Name', 'form.name_ph': 'Your full name',
      'form.email': 'Email', 'form.email_ph': 'you@example.com',
      'form.phone': 'Phone', 'form.phone_ph': '+503 0000-0000',
      'form.service': 'Service Interest', 'form.service_ph': 'Select a service...',
      'form.svc_0': 'Permitting & Management', 'form.svc_1': 'Engineering & Design',
      'form.svc_2': 'Residential Construction', 'form.svc_3': 'Commercial Construction',
      'form.svc_4': 'Heavy Equipment Rental', 'form.svc_5': 'Other',
      'form.message': 'Message', 'form.message_ph': 'Tell us about your project...',
      'form.submit': 'Send Message <span class="btn__arrow">&rarr;</span>',
      'form.sending': 'Sending...', 'form.success': 'Message sent! We\u2019ll get back to you soon.',
      'form.err_required': 'Please fill in all required fields.',
      'form.err_server': 'Something went wrong. Please try again.',

      'ft.label': 'Footer', 'ft.home': 'GCS - Home', 'ft.nav': 'Footer links',
      'ft.0': 'Services', 'ft.1': 'Projects', 'ft.2': 'Team',
      'ft.3': 'Contact', 'ft.4': 'Privacy Policy',
      'modal.label': 'Video player', 'modal.close': 'Close video'
    },
    es: {
      'skip': 'Saltar al contenido principal',
      'tb.tagline': 'Grupo Integral De Construcciones y Servicios',
      'tb.contact': 'CONTACTO', 'tb.lang': 'ENGLISH',
      'nav.label': 'Navegaci\u00f3n principal', 'nav.home': 'GCS - Inicio', 'nav.toggle': 'Abrir men\u00fa',
      'nav.0': 'Servicios', 'nav.1': 'Proyectos', 'nav.2': 'Maquinaria',
      'nav.3': 'Equipo', 'nav.4': 'Contacto',
      'header.label': 'Presentaci\u00f3n de la empresa',
      'hero.title': 'Expertos en Construcci\u00f3n<br><em>y soluci\u00f3n de problemas</em>',
      'hero.cta': 'Explorar Servicios <span class="btn__arrow">&rarr;</span>',
      'hero.cert.title': 'Director de Obra',
      'hero.cert.sub': 'Acreditación CS/3 · COAMSS·OPAMSS',
      'hero.cert.aria': 'Director de Obra — ver a nuestro ingeniero acreditado',

      'svc.label': 'Nuestros Servicios', 'svc.pre': 'Lo Que Hacemos',
      'svc.title': 'Nuestros <em>Servicios</em>',
      'svc.t0': 'Permisos y Gesti\u00f3n', 'svc.t1': 'Ingenier\u00eda y Dise\u00f1o',
      'svc.t2': 'Construcci\u00f3n Residencial', 'svc.t3': 'Construcci\u00f3n Comercial',
      'svc.t4': 'Alquiler de Maquinaria',
      'svc.more': 'VER M\u00c1S <span class="btn__arrow">&rarr;</span>',
      'svc.p0.h': 'Permisos y Gesti\u00f3n Regulatoria',
      'svc.p0.d': 'Gestionamos toda la documentaci\u00f3n previa a la construcci\u00f3n y la coordinaci\u00f3n institucional para obtener aprobaciones. Desde pre-tr\u00e1mites de OPAMSS y calificaci\u00f3n de sitios hasta estudios hidrol\u00f3gicos \u2014 navegamos el panorama regulatorio para que su proyecto avance sin demoras.',
      'svc.p1.h': 'Ingenier\u00eda y Dise\u00f1o',
      'svc.p1.d': 'Desde conceptos iniciales hasta planos finales, nuestro equipo de ingenier\u00eda transforma su visi\u00f3n en planes precisos y construibles. Nos especializamos en dise\u00f1o conceptual, levantamientos topogr\u00e1ficos, planos estructurales y modelado BIM.',
      'svc.p2.h': 'Construcci\u00f3n Residencial',
      'svc.p2.d': 'Construimos hogares y desarrollos residenciales que perduran. Desde casas familiares personalizadas hasta complejos de apartamentos, nuestros proyectos residenciales combinan calidad, dise\u00f1o moderno y gesti\u00f3n eficiente.',
      'svc.p3.h': 'Construcci\u00f3n Comercial',
      'svc.p3.d': 'Nuestra divisi\u00f3n de construcci\u00f3n comercial entrega restaurantes, espacios comerciales, edificios de oficinas y complejos de bienestar. Gestionamos cada fase desde la cimentaci\u00f3n hasta el acabado.',
      'svc.p4.h': 'Alquiler de Maquinaria Pesada',
      'svc.p4.d': 'Acceda a nuestra flota de equipos de construcci\u00f3n de grado profesional. Desde excavadoras y gr\u00faas hasta mezcladoras de concreto y camiones volquete \u2014 proporcionamos maquinaria pesada bien mantenida con t\u00e9rminos de alquiler flexibles.',
      'svc.p0.alt': 'Plano arquitect\u00f3nico de la planta de un edificio',
      'svc.p1.alt': 'Ingeniero usando una estaci\u00f3n total para levantamiento topogr\u00e1fico',
      'svc.p2.alt': 'Casa con estructura de madera en construcci\u00f3n',
      'svc.p3.alt': 'Edificio comercial de gran altura en construcci\u00f3n con una gr\u00faa torre',
      'svc.p4.alt': 'Excavadora Caterpillar trabajando en una obra de construcci\u00f3n',

      'proj.label': 'Nuestros Proyectos', 'proj.pre': 'Portafolio',
      'proj.title': 'Nuestros <em>Proyectos</em>',
      'proj.desc': 'Hemos sido los ejecutores de los siguientes proyectos en El Salvador y m\u00e1s all\u00e1.',
      'proj.tag.res': 'Residencial', 'proj.tag.com': 'Comercial',
      'proj.p0.title': 'Edificio de Unidades de Alquiler', 'proj.p0.loc': 'Santa Tecla, El Salvador',
      'proj.p1.title': 'Apartamentos Kawok', 'proj.p1.loc': 'San Salvador, El Salvador',
      'proj.p2.title': 'Complejo de Bienestar Sound Health', 'proj.p2.loc': 'San Diego, EE.UU.',
      'proj.p3.title': 'Apartamentos Mont-Galia', 'proj.p3.loc': 'Santa Tecla, El Salvador',
      'proj.p4.title': 'Casa Punta Mango', 'proj.p4.loc': 'Punta Mango, El Salvador',
      'proj.p5.title': 'Caba\u00f1as de Lujo', 'proj.p5.loc': 'La Posada de los P\u00e1jaros',

      'mach.label': 'Nuestra Maquinaria', 'mach.pre': 'Flota de Equipos',
      'mach.title': 'Nuestra <em>Maquinaria</em>',
      'mach.m0.title': 'Excavadoras',
      'mach.m0.spec': 'Serie CAT 320 \u2014 Excavadoras hidr\u00e1ulicas vers\u00e1tiles para movimiento de tierras, excavaci\u00f3n de zanjas y demolici\u00f3n. Clase de peso operativo de 20 toneladas.',
      'mach.m1.title': 'Mezcladoras de Concreto',
      'mach.m1.spec': 'Mezcladoras de tr\u00e1nsito de servicio pesado con capacidad de tambor de 8-12 metros c\u00fabicos. Flota confiable para entrega continua de concreto.',
      'mach.m2.title': 'Gr\u00faas',
      'mach.m2.spec': 'Gr\u00faas torre y m\u00f3viles para levantamiento y colocaci\u00f3n. Capacidad de 5 a 80 toneladas para cualquier escala de proyecto.',
      'mach.m3.title': 'Camiones Volquete',
      'mach.m3.spec': 'Camiones volquete articulados para transportar tierra, grava y escombros. Capacidad de carga de 25-40 toneladas para operaciones de alto volumen.',
      'mach.m4.title': 'Mazda BT-50 — Plateada (2024)',
      'mach.m4.spec': 'Pickup utilitaria 4×4 plateada — parte de la flota de campo de GCS para supervisión de obra, transporte de personal y logística.',
      'mach.m4.alt': 'Mazda BT-50 2024 plateada — vehículo de la flota GCS',
      'mach.m5.title': 'Mazda BT-50 — Gris (2024)',
      'mach.m5.spec': 'Pickup utilitaria 4×4 gris — mantiene en movimiento a los equipos de proyecto y los materiales en las obras activas.',
      'mach.m5.alt': 'Mazda BT-50 2024 gris — vehículo de la flota GCS',
      'mach.m6.title': 'Mitsubishi L200 — Negra (2026)',
      'mach.m6.spec': 'Pickup doble cabina 4×4 negra — transporte resistente para ingenieros y equipo entre obras.',
      'mach.m6.alt': 'Mitsubishi L200 2026 negra — vehículo de la flota GCS',
      'mach.m7.title': 'Toyota Hilux Cabina Sencilla — Blanca (2022)',
      'mach.m7.spec': 'Pickup de cabina sencilla blanca — confiable para herramientas y materiales en las operaciones diarias.',
      'mach.m7.alt': 'Toyota Hilux cabina sencilla 2022 blanca — vehículo de la flota GCS',

      'team.label': 'Nuestro Equipo', 'team.pre': 'Nuestra Gente',
      'team.title': 'Conoce al <em>Equipo</em>',
      'team.max.name': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.role': 'CEO \u00b7 Ingeniero \u2014 Director de Obra',
      'team.max.bio': 'CEO de GCS e ingeniero, Max posee la acreditaci\u00f3n de Director de Obra de COAMSS/OPAMSS \u2014 la m\u00e1xima credencial que un ingeniero civil o arquitecto puede obtener, que exige nueve a\u00f1os de experiencia verificada por el gobierno. Lo faculta para asumir la responsabilidad legal de construcciones de cualquier tipo. Hoy ninguna obra puede construirse \u2014 ni ninguna empresa puede llamarse legalmente constructora \u2014 sin un Director de Obra.',
      'team.max.alt': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval, CEO de GCS',
      'team.max.cred_authority': 'COAMSS \u00b7 OPAMSS \u2014 Construcci\u00f3n y Supervisi\u00f3n',
      'team.max.cred_reg_label': 'Reg.',
      'team.max.cred_reg': 'HJ046931663',
      'team.max.cred_valid_label': 'Vigencia',
      'team.max.cred_valid': '21/04/2026 \u2013 21/04/2029',
      'team.max.carnet_label': 'Ver acreditaci\u00f3n \u2197',
      'team.max.carnet_alt': 'Carnet de acreditaci\u00f3n OPAMSS de Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.carnet_aria': 'Abrir el carnet de acreditaci\u00f3n completo',
      'team.ed.name': 'Eduardo Margerit',
      'team.ed.role': 'COO \u00b7 Director de Operaciones',
      'team.ed.bio': 'Director de Operaciones (COO) de GCS, Eduardo lidera las operaciones del d\u00eda a d\u00eda \u2014 coordinando proyectos, recursos y equipos para entregar cada obra a tiempo y con la calidad esperada.',
      'team.ed.alt': 'Eduardo Margerit, COO de GCS',

      'num.label': 'Cifras clave', 'num.pre': 'GCS en N\u00fameros',
      'num.title': '<em>Cifras Clave</em>',
      'num.l0': 'Valor del Portafolio', 'num.l1': 'Proyectos Activos',
      'num.l2': 'A\u00f1os de Experiencia', 'num.l3': 'Miembros del Equipo',

      'cta.label': 'Cont\u00e1ctenos', 'cta.pre': 'Ponte en Contacto',
      'cta.title': '\u00bfListo para <em>Construir?</em>',
      'cta.desc': 'Cont\u00e1ctenos hoy para saber m\u00e1s sobre c\u00f3mo podemos dar vida a su proyecto de construcci\u00f3n. Desde permisos hasta la finalizaci\u00f3n, estamos con usted en cada paso.',
      'cta.btn': 'Cont\u00e1ctenos <span class="btn__arrow">&rarr;</span>',

      'form.name': 'Nombre Completo', 'form.name_ph': 'Su nombre completo',
      'form.email': 'Correo Electr\u00f3nico', 'form.email_ph': 'usted@ejemplo.com',
      'form.phone': 'Tel\u00e9fono', 'form.phone_ph': '+503 0000-0000',
      'form.service': 'Servicio de Inter\u00e9s', 'form.service_ph': 'Seleccione un servicio...',
      'form.svc_0': 'Permisos y Gesti\u00f3n', 'form.svc_1': 'Ingenier\u00eda y Dise\u00f1o',
      'form.svc_2': 'Construcci\u00f3n Residencial', 'form.svc_3': 'Construcci\u00f3n Comercial',
      'form.svc_4': 'Alquiler de Maquinaria', 'form.svc_5': 'Otro',
      'form.message': 'Mensaje', 'form.message_ph': 'Cu\u00e9ntenos sobre su proyecto...',
      'form.submit': 'Enviar Mensaje <span class="btn__arrow">&rarr;</span>',
      'form.sending': 'Enviando...', 'form.success': '\u00a1Mensaje enviado! Nos comunicaremos pronto.',
      'form.err_required': 'Por favor complete todos los campos requeridos.',
      'form.err_server': 'Algo sali\u00f3 mal. Int\u00e9ntelo de nuevo.',

      'ft.label': 'Pie de p\u00e1gina', 'ft.home': 'GCS - Inicio', 'ft.nav': 'Enlaces del pie',
      'ft.0': 'Servicios', 'ft.1': 'Proyectos', 'ft.2': 'Equipo',
      'ft.3': 'Contacto', 'ft.4': 'Pol\u00edtica de Privacidad',
      'modal.label': 'Reproductor de v\u00eddeo', 'modal.close': 'Cerrar v\u00eddeo'
    }
  };

  function initLanguage() {
    var currentLang = localStorage.getItem('gcs-lang') || document.documentElement.lang || 'en';
    if (currentLang !== 'en') {
      applyLanguage(currentLang);
    }

    var toggle = qs('#lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        currentLang = currentLang === 'en' ? 'es' : 'en';
        localStorage.setItem('gcs-lang', currentLang);
        applyLanguage(currentLang);
      });
    }
  }

  function applyLanguage(lang) {
    var t = TRANSLATIONS[lang];
    if (!t) return;

    document.documentElement.lang = lang;

    qsa('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] != null) el.textContent = t[key];
    });

    qsa('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] != null) el.innerHTML = t[key];
    });

    qsa('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (t[key] != null) el.setAttribute('aria-label', t[key]);
    });

    qsa('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      if (t[key] != null) el.setAttribute('alt', t[key]);
    });

    qsa('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] != null) el.setAttribute('placeholder', t[key]);
    });

    // Translate select options
    qsa('select [data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] != null) el.textContent = t[key];
    });
  }

  // ── Contact Form ─────────────────────────────────────────────────────────────
  var CONTACT_API = 'https://api.gcs.sv/contact.php';
  var TURNSTILE_SITE_KEY = '0x4AAAAAAC8ojLJSV2BubsL1';

  function initContactForm() {
    var form = qs('#contact-form');
    if (!form) return;

    // Record page load time for timing-based spam check
    form.querySelector('[name="_timer"]').value = Date.now();

    // Render Turnstile widget
    if (window.turnstile) {
      window.turnstile.render('#cf-turnstile', {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: function (token) {
          form.dataset.cfToken = token;
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleContactSubmit(form);
    });
  }

  function handleContactSubmit(form) {
    var status = qs('#cf-status');
    var btn = form.querySelector('.contact-form__submit');
    var lang = localStorage.getItem('gcs-lang') || 'en';
    var t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // Clear previous state
    status.textContent = '';
    status.className = 'contact-form__status';
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });

    // Honeypot check (bot filled the hidden field)
    if (form.querySelector('[name="company_url"]').value) return;

    // Timing check (submitted faster than 3 seconds = bot)
    var elapsed = Date.now() - parseInt(form.querySelector('[name="_timer"]').value, 10);
    if (elapsed < 3000) return;

    // Client-side validation
    var name = form.querySelector('[name="name"]').value.trim();
    var email = form.querySelector('[name="email"]').value.trim();
    var message = form.querySelector('[name="message"]').value.trim();
    var valid = true;

    if (!name) { form.querySelector('#cf-name').classList.add('is-invalid'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.querySelector('#cf-email').classList.add('is-invalid'); valid = false;
    }
    if (!message) { form.querySelector('#cf-message').classList.add('is-invalid'); valid = false; }

    if (!valid) {
      status.textContent = t['form.err_required'] || 'Please fill in all required fields.';
      status.className = 'contact-form__status contact-form__status--error';
      return;
    }

    // Turnstile token
    var cfToken = form.dataset.cfToken || '';

    // Disable button + show sending
    btn.disabled = true;
    status.textContent = t['form.sending'] || 'Sending...';
    status.className = 'contact-form__status contact-form__status--sending';

    var payload = {
      name: name,
      email: email,
      phone: form.querySelector('[name="phone"]').value.trim(),
      service: form.querySelector('[name="service"]').value,
      message: message,
      'cf-turnstile-response': cfToken,
      _timer: form.querySelector('[name="_timer"]').value
    };

    fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.ok) {
        status.textContent = t['form.success'] || 'Message sent! We\'ll get back to you soon.';
        status.className = 'contact-form__status contact-form__status--success';
        form.reset();
        form.querySelector('[name="_timer"]').value = Date.now();
        if (window.turnstile) window.turnstile.reset('#cf-turnstile');
      } else {
        status.textContent = data.error || t['form.err_server'] || 'Something went wrong. Please try again.';
        status.className = 'contact-form__status contact-form__status--error';
      }
    })
    .catch(function () {
      status.textContent = t['form.err_server'] || 'Something went wrong. Please try again.';
      status.className = 'contact-form__status contact-form__status--error';
    })
    .finally(function () {
      btn.disabled = false;
    });
  }

  // Init contact form after DOM ready
  initContactForm();

})();
