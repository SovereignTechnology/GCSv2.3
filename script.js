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
    initProjectShowcase();
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
      document.dispatchEvent(new CustomEvent('gcs:themechange'));
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('gcs-theme')) {
        currentTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.dispatchEvent(new CustomEvent('gcs:themechange'));
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
        if (targetId === '#') { e.preventDefault(); return; }
        if (targetId === '#main-content') return;

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

  // ── Project Showcase ─────────────────────────────────────────────────────────
  // One large project card at a time: each project visit shows up to 3 random
  // photos/videos from its pool, then advances to the next project. Projects
  // with an empty pool get the "photo coming soon" placeholder for one beat.
  var PROJECT_SHOWCASE_SLIDE_MS = 4500;

  var PROJECT_SHOWCASE = [
    { tag: 'proj.tag.res', title: 'proj.p0.title', loc: 'proj.p0.loc', media: [] },
    { tag: 'proj.tag.res', title: 'proj.p1.title', loc: 'proj.p1.loc', media: [] },
    { tag: 'proj.tag.com', title: 'proj.p2.title', loc: 'proj.p2.loc', media: [] },
    { tag: 'proj.tag.res', title: 'proj.p3.title', loc: 'proj.p3.loc', media: [] },
    { tag: 'proj.tag.res', title: 'proj.p4.title', loc: 'proj.p4.loc', media: [] },
    { tag: 'proj.tag.com', title: 'proj.p5.title', loc: 'proj.p5.loc', alt: 'proj.p5.alt', media: [
      { src: '/assets/images/projects/cabanas-planes-de-renderos/01.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/02.jpg', w: 720, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/03.jpg', w: 720, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/04.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/05.jpg', w: 717, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/06.jpg', w: 1280, h: 963 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/07.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/08.jpg', w: 963, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/09.jpg', w: 1280, h: 963 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/10.jpg', w: 1280, h: 717 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/11.jpg', w: 717, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/12.jpg', w: 717, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/13.jpg', w: 963, h: 1280 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/14.jpg', w: 1280, h: 963 },
      { src: '/assets/images/projects/cabanas-planes-de-renderos/15.jpg', w: 1280, h: 717 }
    ]},
    { tag: 'proj.tag.com', title: 'proj.p6.title', loc: 'proj.p6.loc', alt: 'proj.p6.alt', media: [
      { src: '/assets/images/projects/bac-santa-elena-t3/01.jpg', w: 1200, h: 1600 },
      { src: '/assets/images/projects/bac-santa-elena-t3/02.jpg', w: 1200, h: 1600 },
      { src: '/assets/images/projects/bac-santa-elena-t3/03.jpg', w: 1200, h: 1600 },
      { src: '/assets/images/projects/bac-santa-elena-t3/04.jpg', w: 972, h: 1296 },
      { src: '/assets/images/projects/bac-santa-elena-t3/05.jpg', w: 1200, h: 1600 }
    ]},
    { tag: 'proj.tag.com', title: 'proj.p7.title', loc: 'proj.p7.loc', alt: 'proj.p7.alt', media: [
      { src: '/assets/images/projects/coscafe/01.jpg', w: 1600, h: 1200 },
      { src: '/assets/images/projects/coscafe/02.jpg', w: 1200, h: 1600 },
      { src: '/assets/images/projects/coscafe/03.jpg', w: 1200, h: 1600 }
    ]},
    { tag: 'proj.tag.res', title: 'proj.p8.title', loc: 'proj.p8.loc', alt: 'proj.p8.alt', media: [
      { src: '/assets/images/projects/san-diego-house/01.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/02.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/03.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/04.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/05.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/06.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/07.jpg', w: 1280, h: 720 },
      { src: '/assets/images/projects/san-diego-house/08.jpg', w: 1280, h: 720 }
    ]},
    { tag: 'proj.tag.res', title: 'proj.p9.title', loc: 'proj.p9.loc', alt: 'proj.p9.alt', media: [
      { src: '/assets/images/projects/itzel/01.jpg', w: 1280, h: 960 },
      { src: '/assets/images/projects/itzel/02.jpg', w: 1280, h: 960 },
      { type: 'video', src: '/assets/videos/itzel-road.mp4' }
    ]},
    { tag: 'proj.tag.com', title: 'proj.p10.title', loc: 'proj.p10.loc', media: [] }
  ];

  var SHOWCASE_PLACEHOLDER_SVG =
    '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect width="400" height="250" rx="8" fill="#1f2937"/>' +
    '<rect x="100" y="30" width="200" height="150" rx="4" fill="none" stroke="#FACC15" stroke-width="1.5"/>' +
    '<rect x="100" y="30" width="200" height="30" fill="#FACC15" opacity="0.1"/>' +
    '<rect x="115" y="75" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<rect x="180" y="75" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<rect x="245" y="75" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<rect x="115" y="130" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<rect x="180" y="130" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<rect x="245" y="130" width="40" height="40" fill="#FACC15" opacity="0.1" rx="2"/>' +
    '<text x="200" y="220" text-anchor="middle" fill="#6B7280" font-family="Poppins, sans-serif" font-size="11"></text></svg>';

  var SHOWCASE_ICON_PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var SHOWCASE_ICON_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function initProjectShowcase() {
    var root = qs('[data-project-showcase]');
    if (!root) return;

    var mediaEl = qs('[data-showcase-media]', root);
    var tagEl = qs('[data-showcase-tag]', root);
    var titleEl = qs('[data-showcase-title]', root);
    var locEl = qs('[data-showcase-loc]', root);
    var currentEl = qs('[data-showcase-current]', root);
    var dotsEl = qs('[data-showcase-dots]', root);
    var prevBtn = qs('[data-showcase-prev]', root);
    var nextBtn = qs('[data-showcase-next]', root);
    var toggleBtn = qs('[data-showcase-toggle]', root);

    var t = TRANSLATIONS[pageLang()] || TRANSLATIONS.en;
    var total = PROJECT_SHOWCASE.length;
    var current = parseInt(root.getAttribute('data-start-index') || '0', 10) || 0;
    var slides = [];
    var slideIndex = 0;
    var timer = null;
    var playing = false;

    // One dot per project; clicking jumps straight to that project.
    var dots = PROJECT_SHOWCASE.map(function (p, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'project-showcase__dot';
      dot.setAttribute('aria-label', t[p.title] || '');
      dot.addEventListener('click', function () { goTo(i); });
      dotsEl.appendChild(dot);
      return dot;
    });

    function shuffleSample(pool, n) {
      var a = pool.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a.slice(0, n);
    }

    function setToggleUI() {
      toggleBtn.innerHTML = playing ? SHOWCASE_ICON_PAUSE : SHOWCASE_ICON_PLAY;
      toggleBtn.setAttribute('aria-label', playing ? (t['proj.pause'] || 'Pause slideshow') : (t['proj.play'] || 'Play slideshow'));
    }

    function stopTimer() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function scheduleNext(ms) {
      stopTimer();
      if (!playing) return;
      timer = setTimeout(advance, ms);
    }

    function activeVideo() {
      return mediaEl.querySelector('video');
    }

    function playVideo(v) {
      var promise = v.play();
      if (promise && promise.catch) promise.catch(function () {});
    }

    function advance() {
      if (slideIndex + 1 < slides.length) {
        slideIndex++;
        showSlide();
      } else {
        goTo(current + 1);
      }
    }

    function goTo(index) {
      current = ((index % total) + total) % total;
      var p = PROJECT_SHOWCASE[current];
      tagEl.textContent = t[p.tag] || '';
      titleEl.textContent = t[p.title] || '';
      locEl.textContent = t[p.loc] || '';
      currentEl.textContent = current + 1;
      dots.forEach(function (d, i) {
        d.classList.toggle('project-showcase__dot--active', i === current);
      });
      slides = p.media.length ? shuffleSample(p.media, 3) : [null];
      slideIndex = 0;
      showSlide();
    }

    function showSlide() {
      var m = slides[slideIndex];
      var p = PROJECT_SHOWCASE[current];
      var node;

      if (!m) {
        node = document.createElement('div');
        node.className = 'project-showcase__slide project-showcase__slide--placeholder';
        node.innerHTML = SHOWCASE_PLACEHOLDER_SVG;
        var txt = node.querySelector('text');
        if (txt) txt.textContent = t['misc.photo_soon'] || 'Photo Coming Soon';
      } else if (m.type === 'video') {
        node = document.createElement('video');
        node.className = 'project-showcase__slide';
        node.src = m.src;
        node.muted = true;
        node.playsInline = true;
        node.setAttribute('playsinline', '');
        node.preload = 'auto';
        node.setAttribute('aria-label', (p.alt && t[p.alt]) || t[p.title] || '');
        node.addEventListener('ended', advance);
        node.addEventListener('error', function () { scheduleNext(1500); });
      } else {
        node = new Image();
        node.className = 'project-showcase__slide';
        node.src = m.src;
        node.alt = (p.alt && t[p.alt]) || '';
        if (m.w) node.width = m.w;
        if (m.h) node.height = m.h;
      }

      var old = mediaEl.firstElementChild;
      mediaEl.appendChild(node);
      // Force a style flush so the opacity transition actually runs.
      void node.offsetWidth;
      node.classList.add('project-showcase__slide--active');

      if (old && old !== node) {
        old.classList.remove('project-showcase__slide--active');
        if (old.tagName === 'VIDEO') old.pause();
        setTimeout(function () {
          if (old.parentNode) old.parentNode.removeChild(old);
        }, 700);
      }

      // Videos drive their own timing via 'ended'; stills use the timer.
      if (node.tagName === 'VIDEO') {
        if (playing) playVideo(node);
      } else {
        scheduleNext(PROJECT_SHOWCASE_SLIDE_MS);
      }

      // Preload the next still so the crossfade never shows an empty frame.
      var nxt = slides[slideIndex + 1];
      if (nxt && nxt.type !== 'video') { var pre = new Image(); pre.src = nxt.src; }
    }

    function play() {
      playing = true;
      setToggleUI();
      var v = activeVideo();
      if (v) playVideo(v);
      else scheduleNext(PROJECT_SHOWCASE_SLIDE_MS);
    }

    function pause() {
      playing = false;
      setToggleUI();
      stopTimer();
      var v = activeVideo();
      if (v) v.pause();
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });
    toggleBtn.addEventListener('click', function () { if (playing) pause(); else play(); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopTimer();
        var v = activeVideo();
        if (v) v.pause();
      } else if (playing) {
        var v2 = activeVideo();
        if (v2) playVideo(v2);
        else scheduleNext(PROJECT_SHOWCASE_SLIDE_MS);
      }
    });

    dots[current].classList.add('project-showcase__dot--active');

    // Reduced motion: no autoplay — the user steps through manually.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pause();
      return;
    }

    // The static markup already shows the start project's first photo; build
    // this visit's random sample around it and start the timer.
    var start = PROJECT_SHOWCASE[current];
    slides = start.media.length ? shuffleSample(start.media, 3) : [null];
    slideIndex = 0;
    playing = true;
    setToggleUI();
    showSlide();
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
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('selector__tab--active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');

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

      // Keyboard support per WAI-ARIA tabs pattern (roving tabindex)
      tab.addEventListener('keydown', function (e) {
        var index = tabs.indexOf(tab);
        var newIndex = null;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          newIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          newIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          newIndex = 0;
        } else if (e.key === 'End') {
          newIndex = tabs.length - 1;
        }

        if (newIndex !== null) {
          e.preventDefault();
          tabs[newIndex].click();
          tabs[newIndex].focus();
        }
      });
    });

    // "Next service" links advance to the next tab (wrapping after the last)
    qsa('.selector__next').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var activeTab = tabs.filter(function (t) { return t.classList.contains('selector__tab--active'); })[0] || tabs[0];
        var nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
        if (nextTab) nextTab.click();
      });
    });
  }

  // ── Language Switcher ────────────────────────────────────────────────────────
  var TRANSLATIONS = {
    en: {
      'skip': 'Skip to main content',
      'tb.tagline': 'Grupo Integral De Construcciones y Servicios',
      'tb.contact': 'CONTACT', 'tb.lang': 'ESPAÑOL', 'tb.theme': 'Toggle dark mode',
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
      'svc.next': 'Next service <span class="btn__arrow">&rarr;</span>',
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
      'proj.prev': 'Previous project', 'proj.next': 'Next project',
      'proj.pause': 'Pause slideshow', 'proj.play': 'Play slideshow',
      'proj.p0.title': 'Rental Units Building', 'proj.p0.loc': 'Santa Tecla, El Salvador',
      'proj.p1.title': 'Apartamentos Kawok', 'proj.p1.loc': 'San Salvador, El Salvador',
      'proj.p2.title': 'Sound Health Wellness Complex', 'proj.p2.loc': 'San Diego, USA',
      'proj.p3.title': 'Mont-Galia Apartments', 'proj.p3.loc': 'Santa Tecla, El Salvador',
      'proj.p4.title': 'Punta Mango House', 'proj.p4.loc': 'Punta Mango, El Salvador',
      'proj.p5.title': 'Caba\u00f1as Planes de Renderos', 'proj.p5.loc': 'Planes de Renderos, El Salvador',
      'proj.p5.alt': 'A-frame cabin under construction at Planes de Renderos',
      'proj.p6.title': 'BAC Santa Elena T3', 'proj.p6.loc': 'Santa Elena, El Salvador',
      'proj.p6.alt': 'Post-tensioned slab and rebar work at the BAC Santa Elena T3 building',
      'proj.p7.title': 'Coscafe', 'proj.p7.loc': 'El Salvador',
      'proj.p7.alt': 'Construction equipment on site at the Coscafe project',
      'proj.p8.title': 'San Diego House', 'proj.p8.loc': 'San Diego, USA',
      'proj.p8.alt': 'House project under construction in San Diego',
      'proj.p9.title': 'Itzel', 'proj.p9.loc': 'Lake Ilopango, El Salvador',
      'proj.p9.alt': 'Itzel project site at Lake Ilopango',
      'proj.p10.title': 'Happiness Bay', 'proj.p10.loc': 'El Salvador',

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
      'team.max.bio': 'GCS\u2019s CEO and a licensed engineer, Max holds the COAMSS/OPAMSS Director de Obra accreditation \u2014 the highest credential a civil engineer or architect can earn, requiring nine years of government-verified experience. It authorizes him to take legal responsibility for construction of any kind. His track record spans El Chaparral, the Airport expansion, Bitcoin mining facilities in Berl\u00edn, and apartment towers. Today no project can be built \u2014 and no company can legally call itself a construction firm \u2014 without a Director de Obra.',
      'team.max.alt': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval, CEO of GCS',
      'team.max.cred_authority': 'COAMSS \u00b7 OPAMSS \u2014 Construction & Supervision',
      'team.max.cred_reg_label': 'Reg.',
      'team.max.cred_reg': 'HJ046931663',
      'team.max.cred_valid_label': 'Valid',
      'team.max.cred_valid': '21/04/2026 \u2013 21/04/2029',
      'team.max.carnet_label': 'View accreditation \u2197',
      'team.max.carnet_alt': 'OPAMSS accreditation card for Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.carnet_aria': 'Open the full OPAMSS accreditation card',
      'team.max.doc_dot': 'Registro DOT (PDF) \u2197',
      'team.max.doc_pt3': 'Acreditaci\u00f3n PT \u2014 T3 (PDF) \u2197',
      'team.ed.name': 'Eduardo M',
      'team.ed.role': 'COO',
      'team.ed.bio': 'Chief Operating Officer of GCS, Eduardo leads day-to-day operations \u2014 coordinating projects, resources, and teams to deliver every job on time and to standard.',
      'team.ed.alt': 'Eduardo M, COO of GCS',
      'team.ric.name': 'Ricardo Cummings',
      'team.ric.role': 'Director of Architecture',
      'team.ric.bio': 'Director of Architecture at GCS, Ricardo leads architectural design across the company\u2019s residential and commercial portfolio.',
      'team.ric.alt': 'Ricardo Cummings, Director of Architecture at GCS',

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
      'ft.3': 'Contact', 'ft.4': 'Credentials',
      'misc.photo_soon': 'Photo Coming Soon',
      'modal.label': 'Video player', 'modal.close': 'Close video'
    },
    es: {
      'skip': 'Saltar al contenido principal',
      'tb.tagline': 'Grupo Integral De Construcciones y Servicios',
      'tb.contact': 'CONTACTO', 'tb.lang': 'ENGLISH', 'tb.theme': 'Cambiar modo oscuro',
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
      'svc.next': 'Siguiente servicio <span class="btn__arrow">&rarr;</span>',
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
      'proj.prev': 'Proyecto anterior', 'proj.next': 'Proyecto siguiente',
      'proj.pause': 'Pausar presentación', 'proj.play': 'Reproducir presentación',
      'proj.p0.title': 'Edificio de Unidades de Alquiler', 'proj.p0.loc': 'Santa Tecla, El Salvador',
      'proj.p1.title': 'Apartamentos Kawok', 'proj.p1.loc': 'San Salvador, El Salvador',
      'proj.p2.title': 'Complejo de Bienestar Sound Health', 'proj.p2.loc': 'San Diego, EE.UU.',
      'proj.p3.title': 'Apartamentos Mont-Galia', 'proj.p3.loc': 'Santa Tecla, El Salvador',
      'proj.p4.title': 'Casa Punta Mango', 'proj.p4.loc': 'Punta Mango, El Salvador',
      'proj.p5.title': 'Caba\u00f1as Planes de Renderos', 'proj.p5.loc': 'Planes de Renderos, El Salvador',
      'proj.p5.alt': 'Caba\u00f1a tipo A-frame en construcci\u00f3n en Planes de Renderos',
      'proj.p6.title': 'BAC Santa Elena T3', 'proj.p6.loc': 'Santa Elena, El Salvador',
      'proj.p6.alt': 'Losa postensada y trabajo de armadura en el edificio BAC Santa Elena T3',
      'proj.p7.title': 'Coscafe', 'proj.p7.loc': 'El Salvador',
      'proj.p7.alt': 'Maquinaria de construcci\u00f3n en el sitio del proyecto Coscafe',
      'proj.p8.title': 'Casa San Diego', 'proj.p8.loc': 'San Diego, EE.UU.',
      'proj.p8.alt': 'Proyecto de casa en construcci\u00f3n en San Diego',
      'proj.p9.title': 'Itzel', 'proj.p9.loc': 'Lago de Ilopango, El Salvador',
      'proj.p9.alt': 'Sitio del proyecto Itzel en el Lago de Ilopango',
      'proj.p10.title': 'Happiness Bay', 'proj.p10.loc': 'El Salvador',

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
      'team.max.bio': 'CEO de GCS e ingeniero, Max posee la acreditaci\u00f3n de Director de Obra de COAMSS/OPAMSS \u2014 la m\u00e1xima credencial que un ingeniero civil o arquitecto puede obtener, que exige nueve a\u00f1os de experiencia verificada por el gobierno. Lo faculta para asumir la responsabilidad legal de construcciones de cualquier tipo. Su trayectoria incluye El Chaparral, la ampliaci\u00f3n del Aeropuerto, instalaciones de miner\u00eda de Bitcoin en Berl\u00edn y torres de apartamentos. Hoy ninguna obra puede construirse \u2014 ni ninguna empresa puede llamarse legalmente constructora \u2014 sin un Director de Obra.',
      'team.max.alt': 'Jos\u00e9 Max Hern\u00e1ndez Sandoval, CEO de GCS',
      'team.max.cred_authority': 'COAMSS \u00b7 OPAMSS \u2014 Construcci\u00f3n y Supervisi\u00f3n',
      'team.max.cred_reg_label': 'Reg.',
      'team.max.cred_reg': 'HJ046931663',
      'team.max.cred_valid_label': 'Vigencia',
      'team.max.cred_valid': '21/04/2026 \u2013 21/04/2029',
      'team.max.carnet_label': 'Ver acreditaci\u00f3n \u2197',
      'team.max.carnet_alt': 'Carnet de acreditaci\u00f3n OPAMSS de Jos\u00e9 Max Hern\u00e1ndez Sandoval',
      'team.max.carnet_aria': 'Abrir el carnet de acreditaci\u00f3n completo',
      'team.max.doc_dot': 'Registro DOT (PDF) \u2197',
      'team.max.doc_pt3': 'Acreditaci\u00f3n PT \u2014 T3 (PDF) \u2197',
      'team.ed.name': 'Eduardo M',
      'team.ed.role': 'COO \u00b7 Director de Operaciones',
      'team.ed.bio': 'Director de Operaciones (COO) de GCS, Eduardo lidera las operaciones del d\u00eda a d\u00eda \u2014 coordinando proyectos, recursos y equipos para entregar cada obra a tiempo y con la calidad esperada.',
      'team.ed.alt': 'Eduardo M, COO de GCS',
      'team.ric.name': 'Ricardo Cummings',
      'team.ric.role': 'Director de Arquitectura',
      'team.ric.bio': 'Director de Arquitectura de GCS, Ricardo lidera el dise\u00f1o arquitect\u00f3nico en el portafolio residencial y comercial de la empresa.',
      'team.ric.alt': 'Ricardo Cummings, Director de Arquitectura de GCS',

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
      'ft.3': 'Contacto', 'ft.4': 'Credenciales',
      'misc.photo_soon': 'Foto pr\u00f3ximamente',
      'modal.label': 'Reproductor de v\u00eddeo', 'modal.close': 'Cerrar v\u00eddeo'
    }
  };

  // Each language lives at its own URL (/ = English, /es/ = Spanish; the
  // static /es/ page is generated by scripts/generate-es.mjs from TRANSLATIONS
  // below). The toggle is a real link — we only remember the preference so
  // returning visitors land on their language (see inline redirect in <head>).
  function initLanguage() {
    var toggle = qs('#lang-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var target = pageLang() === 'es' ? 'en' : 'es';
      try { localStorage.setItem('gcs-lang', target); } catch (err) { /* no-op */ }
      // No preventDefault — let the browser follow the link.
    });
  }

  function pageLang() {
    return document.documentElement.lang === 'es' ? 'es' : 'en';
  }

  // ── Contact Form ─────────────────────────────────────────────────────────────
  var CONTACT_API = 'https://api.gcs.sv/contact.php';
  var TURNSTILE_SITE_KEY = '0x4AAAAAAC8ojLJSV2BubsL1';
  var turnstileWidgetId = null;

  // The Turnstile API is loaded with ?render=explicit, so it only renders when
  // its onload callback fires — script.js runs before the deferred api.js, which
  // is why this global must exist here (a bare render=explicit call at parse
  // time would never run).
  window.gcsTurnstileOnload = function () {
    renderTurnstile();
  };

  function renderTurnstile() {
    var form = qs('#contact-form');
    var mount = qs('#cf-turnstile');
    if (!form || !mount || !window.turnstile) return;

    if (turnstileWidgetId !== null) {
      window.turnstile.remove(turnstileWidgetId);
      turnstileWidgetId = null;
    }

    form.dataset.cfToken = '';
    turnstileWidgetId = window.turnstile.render('#cf-turnstile', {
      sitekey: TURNSTILE_SITE_KEY,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      language: pageLang(),
      callback: function (token) {
        form.dataset.cfToken = token;
      },
      'expired-callback': function () {
        form.dataset.cfToken = '';
      }
    });
  }

  function initContactForm() {
    var form = qs('#contact-form');
    if (!form) return;

    // Record page load time for timing-based spam check
    form.querySelector('[name="_timer"]').value = Date.now();

    // Re-render the widget when the site theme changes so it matches
    document.addEventListener('gcs:themechange', renderTurnstile);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleContactSubmit(form);
    });
  }

  function handleContactSubmit(form) {
    var status = qs('#cf-status');
    var btn = form.querySelector('.contact-form__submit');
    var t = TRANSLATIONS[pageLang()] || TRANSLATIONS.en;

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
        if (window.turnstile && turnstileWidgetId !== null) {
          window.turnstile.reset(turnstileWidgetId);
          form.dataset.cfToken = '';
        }
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
