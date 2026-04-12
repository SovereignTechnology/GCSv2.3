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
      slides[current].classList.remove('hero-slide--active');
      current = ((index % total) + total) % total;
      slides[current].classList.add('hero-slide--active');
      if (currentEl) currentEl.textContent = current + 1;
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startAutoplay() {
      stopAutoplay();
      timer = setInterval(next, autoplayInterval);
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

})();
