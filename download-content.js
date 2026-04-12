#!/usr/bin/env node
/**
 * download-content.js — Playwright scraper for grupoacs.com
 * Handles Cloudflare WAF with stealth techniques, falls back to Wayback Machine.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Paths ──────────────────────────────────────────────────────────────────────
const ASSETS_DIR = path.join(__dirname, 'assets', 'images');
const CONTENT_DIR = path.join(__dirname, 'content');
const REF_DIR = path.join(__dirname, 'reference');

for (const dir of [ASSETS_DIR, CONTENT_DIR, REF_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').substring(0, 80);
}

function downloadFile(url, dest, referer = 'https://www.grupoacs.com/') {
  return new Promise((resolve, reject) => {
    if (!url || url.startsWith('data:')) return resolve(null);

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      }
    };

    client.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest, referer).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(dest); });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadWithRetry(url, dest, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await downloadFile(url, dest);
      if (result) return result;
    } catch (e) {
      console.log(`  Retry ${i + 1}/${retries} for ${path.basename(dest)}: ${e.message}`);
    }
    if (i < retries - 1) await sleep(1000 * Math.pow(2, i));
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log('=== GCSv2.3 Content Scraper ===\n');

  // ── 1.2 Stealth Browser Launch ─────────────────────────────────────────────
  const hasDisplay = !!process.env.DISPLAY || !!process.env.WAYLAND_DISPLAY;
  console.log(`Display available: ${hasDisplay}`);

  const browser = await chromium.launch({
    headless: hasDisplay ? false : 'new',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Europe/Madrid',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    },
  });

  const page = await context.newPage();

  // Delete navigator.webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Also patch chrome runtime
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    // Patch permissions
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }
    // Patch plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'es'],
    });
  });

  // ── 1.3 Navigate + Handle Cloudflare ───────────────────────────────────────
  let source = 'live';
  let targetUrl = 'https://www.grupoacs.com/';

  console.log('Navigating to grupoacs.com...');
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Detect Cloudflare challenge
    const title = await page.title();
    if (title.includes('Just a moment') || title.includes('Checking your browser') || title.includes('Attention Required')) {
      console.log('Cloudflare challenge detected, waiting for auto-resolve...');
      let resolved = false;
      for (let i = 0; i < 10; i++) {
        await sleep(2000);
        const newTitle = await page.title();
        if (!newTitle.includes('Just a moment') && !newTitle.includes('Checking your browser') && !newTitle.includes('Attention Required')) {
          resolved = true;
          console.log('Cloudflare challenge resolved!');
          break;
        }
      }
      if (!resolved) {
        throw new Error('Cloudflare challenge not resolved after 20s');
      }
    }

    // Check for 403
    const bodyText = await page.textContent('body');
    if (bodyText && (bodyText.includes('Access denied') || bodyText.includes('Error 1005'))) {
      throw new Error('Access denied by Cloudflare');
    }

    console.log(`Successfully loaded: ${await page.title()}`);
  } catch (e) {
    console.log(`Live site failed: ${e.message}`);
    console.log('Falling back to Wayback Machine...');
    source = 'wayback';
    targetUrl = 'https://web.archive.org/web/2024/https://www.grupoacs.com/';
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });
      console.log(`Loaded from Wayback Machine: ${await page.title()}`);
    } catch (e2) {
      // Try a specific snapshot
      targetUrl = 'https://web.archive.org/web/20241201000000*/https://www.grupoacs.com/';
      await page.goto('https://web.archive.org/web/20240901120000/https://www.grupoacs.com/', {
        waitUntil: 'networkidle',
        timeout: 45000,
      });
      console.log(`Loaded from Wayback snapshot: ${await page.title()}`);
    }
  }

  console.log(`Source: ${source}\n`);

  // ── 1.4 Dismiss Cookie Banner ──────────────────────────────────────────────
  console.log('Checking for cookie banner...');
  const cookieSelectors = [
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    'button[data-cookiebot-action="accept"]',
    '#CybotCookiebotDialogBodyButtonAccept',
    'button:has-text("Accept")',
    'button:has-text("Aceptar")',
    'button:has-text("Accept all")',
    'button:has-text("Aceptar todas")',
    '.cookie-accept',
    '#onetrust-accept-btn-handler',
  ];

  for (const sel of cookieSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`  Dismissed cookie banner with: ${sel}`);
        await sleep(1000);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  // Also dismiss Wayback Machine toolbar if present
  if (source === 'wayback') {
    try {
      await page.evaluate(() => {
        const wb = document.getElementById('wm-ipp-base');
        if (wb) wb.remove();
        const wbInner = document.getElementById('wm-ipp');
        if (wbInner) wbInner.remove();
        // Remove wayback toolbar styles
        document.querySelectorAll('style').forEach(s => {
          if (s.textContent.includes('wm-ipp')) s.remove();
        });
      });
    } catch (e) {}
  }

  // ── 1.5 Human-Like Full Page Scroll ────────────────────────────────────────
  console.log('Scrolling page (loading lazy content)...');
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  let scrollPos = 0;

  while (scrollPos < scrollHeight) {
    const increment = rand(200, 500);
    scrollPos = Math.min(scrollPos + increment, scrollHeight);
    await page.evaluate((y) => window.scrollTo(0, y), scrollPos);
    await sleep(rand(300, 800));

    // Occasional mouse move
    if (Math.random() > 0.6) {
      await page.mouse.move(rand(100, 1300), rand(100, 800), { steps: rand(5, 15) });
    }
  }

  // Force appear class on all modules
  await page.evaluate(() => {
    document.querySelectorAll('.module').forEach(el => {
      el.classList.add('appear');
      el.classList.add('is-visible');
      el.classList.add('animated');
    });
  });

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(2000);
  console.log('  Scroll complete\n');

  // ── 1.6 Extract Content ────────────────────────────────────────────────────
  console.log('Extracting content...');

  const textContent = await page.evaluate(() => {
    const sections = [];
    const modules = document.querySelectorAll('section.module, header.module, div.module, section[class*="module"], .module');
    const seen = new Set();

    modules.forEach((mod, index) => {
      if (seen.has(mod)) return;
      seen.add(mod);

      // Determine module type from classes
      const classes = Array.from(mod.classList);
      const moduleType = classes.find(c => c.startsWith('module--')) || classes.find(c => c.includes('module')) || 'unknown';

      const section = {
        index,
        type: moduleType,
        classes: classes.join(' '),
        tagName: mod.tagName.toLowerCase(),
        id: mod.id || null,
        headings: [],
        text: [],
        links: [],
        stats: [],
        newsCards: [],
        slides: [],
        backgroundImage: null,
      };

      // Headings
      mod.querySelectorAll('.the-header__pretitle, .the-header__title, h1, h2, h3, h4, .title, .heading').forEach(h => {
        const text = h.textContent?.trim();
        if (text) section.headings.push({ tag: h.tagName?.toLowerCase() || 'span', class: h.className, text });
      });

      // Body text
      mod.querySelectorAll('.the-wysiwyg, p, .col-header--content, .description, .text, .subtitle').forEach(p => {
        const text = p.textContent?.trim();
        if (text && text.length > 5) section.text.push(text);
      });

      // Links
      mod.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        const label = a.textContent?.trim() || a.getAttribute('aria-label') || '';
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          section.links.push({ href, label: label.substring(0, 200) });
        }
      });

      // Stats / numbers
      mod.querySelectorAll('.number, .stat, .counter, .cifra, [data-number], [data-count]').forEach(stat => {
        const value = stat.getAttribute('data-number') || stat.getAttribute('data-count') || stat.textContent?.trim();
        const labelEl = stat.closest('.stat-item, .number-item, .cifra-item')?.querySelector('.label, .text, p, span:not(.number)');
        const label = labelEl?.textContent?.trim() || '';
        if (value) section.stats.push({ value, label });
      });

      // Number modules - broader search
      if (moduleType.includes('numero') || moduleType.includes('number')) {
        mod.querySelectorAll('[class*="numero"], [class*="number"], [class*="cifra"]').forEach(item => {
          const numEl = item.querySelector('.numero, .number, .cifra, .value, strong, b');
          const labelEl = item.querySelector('.label, .text, .concepto, p, span');
          if (numEl) {
            section.stats.push({
              value: numEl.textContent?.trim(),
              label: labelEl?.textContent?.trim() || '',
            });
          }
        });
      }

      // News cards
      mod.querySelectorAll('.news-card, .noticia, article, .card, [class*="news"], [class*="noticia"]').forEach(card => {
        const title = card.querySelector('h3, h4, .title, .heading')?.textContent?.trim();
        const date = card.querySelector('.date, time, .fecha')?.textContent?.trim();
        const img = card.querySelector('img')?.getAttribute('src');
        const link = card.querySelector('a[href]')?.getAttribute('href');
        if (title) section.newsCards.push({ title, date, image: img, link });
      });

      // Slider slides
      mod.querySelectorAll('.slide, .swiper-slide, [class*="slide"]').forEach(slide => {
        const heading = slide.querySelector('h1, h2, h3, .title, .heading')?.textContent?.trim();
        const desc = slide.querySelector('p, .description, .text')?.textContent?.trim();
        const bgImg = slide.style.backgroundImage?.match(/url\(['"]?(.+?)['"]?\)/)?.[1]
          || slide.querySelector('img')?.getAttribute('src')
          || null;
        const link = slide.querySelector('a[href]')?.getAttribute('href');
        if (heading || bgImg) section.slides.push({ heading, description: desc, backgroundImage: bgImg, link });
      });

      // Background image
      const computed = window.getComputedStyle(mod);
      const bgMatch = computed.backgroundImage?.match(/url\(['"]?(.+?)['"]?\)/);
      if (bgMatch) section.backgroundImage = bgMatch[1];

      sections.push(section);
    });

    return sections;
  });

  fs.writeFileSync(
    path.join(CONTENT_DIR, 'text-content.json'),
    JSON.stringify(textContent, null, 2)
  );
  console.log(`  Extracted ${textContent.length} sections`);

  // YouTube URLs
  const videos = await page.evaluate(() => {
    const vids = [];
    const seen = new Set();
    // iframes
    document.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"]').forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src && !seen.has(src)) {
        seen.add(src);
        const title = iframe.closest('.module, section')?.querySelector('h2, h3, .title')?.textContent?.trim() || '';
        vids.push({ url: src, title });
      }
    });
    // Links
    document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !seen.has(href)) {
        seen.add(href);
        vids.push({ url: href, title: a.textContent?.trim() || '' });
      }
    });
    // Data attributes
    document.querySelectorAll('[data-video], [data-youtube], [data-src*="youtube"]').forEach(el => {
      const url = el.getAttribute('data-video') || el.getAttribute('data-youtube') || el.getAttribute('data-src');
      if (url && !seen.has(url)) {
        seen.add(url);
        vids.push({ url, title: el.closest('.module, section')?.querySelector('h2, h3')?.textContent?.trim() || '' });
      }
    });
    return vids;
  });

  fs.writeFileSync(
    path.join(CONTENT_DIR, 'videos.json'),
    JSON.stringify(videos, null, 2)
  );
  console.log(`  Found ${videos.length} YouTube videos`);

  // ── 1.9 Extract Computed Styles ────────────────────────────────────────────
  console.log('Extracting computed styles...');

  const siteStructure = await page.evaluate(() => {
    const styles = {
      fonts: new Set(),
      fontSizes: new Set(),
      fontWeights: new Set(),
      lineHeights: new Set(),
      letterSpacings: new Set(),
      colors: new Set(),
      bgColors: new Set(),
      borderColors: new Set(),
      paddings: new Set(),
      margins: new Set(),
      gaps: new Set(),
      borderRadii: new Set(),
      boxShadows: new Set(),
      transitions: new Set(),
      breakpoints: [],
      sections: [],
    };

    const elements = document.querySelectorAll('*');
    const sampled = Array.from(elements).filter((_, i) => i % 3 === 0); // Sample every 3rd element

    sampled.forEach(el => {
      const cs = window.getComputedStyle(el);
      styles.fonts.add(cs.fontFamily);
      styles.fontSizes.add(cs.fontSize);
      styles.fontWeights.add(cs.fontWeight);
      styles.lineHeights.add(cs.lineHeight);
      if (cs.letterSpacing !== 'normal') styles.letterSpacings.add(cs.letterSpacing);
      styles.colors.add(cs.color);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') styles.bgColors.add(cs.backgroundColor);
      if (cs.borderColor && cs.borderColor !== cs.color) styles.borderColors.add(cs.borderColor);
      if (cs.borderRadius !== '0px') styles.borderRadii.add(cs.borderRadius);
      if (cs.boxShadow !== 'none') styles.boxShadows.add(cs.boxShadow);
      if (cs.transition !== 'all 0s ease 0s') styles.transitions.add(cs.transition);
    });

    // Section-specific styles
    document.querySelectorAll('section.module, header.module, .module').forEach((mod, i) => {
      const cs = window.getComputedStyle(mod);
      styles.sections.push({
        index: i,
        classes: mod.className,
        padding: cs.padding,
        margin: cs.margin,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        display: cs.display,
        width: cs.width,
        maxWidth: cs.maxWidth,
        position: cs.position,
        overflow: cs.overflow,
      });
    });

    // Extract media queries from stylesheets
    try {
      const breakpoints = new Set();
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.type === CSSRule.MEDIA_RULE) {
              const match = rule.conditionText?.match(/(\d+)px/g);
              if (match) match.forEach(bp => breakpoints.add(bp));
            }
          }
        } catch (e) {} // Cross-origin stylesheets
      }
      styles.breakpoints = Array.from(breakpoints).sort((a, b) => parseInt(a) - parseInt(b));
    } catch (e) {}

    // Convert Sets to Arrays for JSON
    return {
      fonts: [...styles.fonts].slice(0, 20),
      fontSizes: [...styles.fontSizes].slice(0, 40),
      fontWeights: [...styles.fontWeights],
      lineHeights: [...styles.lineHeights].slice(0, 20),
      letterSpacings: [...styles.letterSpacings].slice(0, 10),
      colors: [...styles.colors].slice(0, 30),
      bgColors: [...styles.bgColors].slice(0, 20),
      borderColors: [...styles.borderColors].slice(0, 10),
      borderRadii: [...styles.borderRadii].slice(0, 10),
      boxShadows: [...styles.boxShadows].slice(0, 10),
      transitions: [...styles.transitions].slice(0, 15),
      breakpoints: styles.breakpoints,
      sections: styles.sections,
    };
  });

  fs.writeFileSync(
    path.join(CONTENT_DIR, 'site-structure.json'),
    JSON.stringify(siteStructure, null, 2)
  );
  console.log(`  Extracted styles: ${siteStructure.fonts.length} fonts, ${siteStructure.colors.length} colors, ${siteStructure.breakpoints.length} breakpoints`);

  // ── 1.7 Download Images ────────────────────────────────────────────────────
  console.log('\nDownloading images...');

  const imageUrls = await page.evaluate(() => {
    const images = [];
    const seen = new Set();

    const addImage = (url, context) => {
      if (!url || seen.has(url)) return;
      if (url.startsWith('data:')) return;
      if (url.includes('cookiebot') || url.includes('google-analytics') || url.includes('gtm') || url.includes('pixel') || url.includes('1x1')) return;
      if (url.includes('translate.google')) return;

      // Resolve relative URLs
      try {
        const resolved = new URL(url, window.location.href).href;
        seen.add(url);
        seen.add(resolved);
        images.push({ url: resolved, context });
      } catch (e) {}
    };

    // img elements
    document.querySelectorAll('img[src]').forEach(img => {
      const context = img.closest('.module, section, header, footer')?.className || 'general';
      addImage(img.src, context);
      // Also grab srcset largest
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const parts = srcset.split(',').map(s => s.trim());
        const largest = parts.sort((a, b) => {
          const aW = parseInt(a.match(/(\d+)w/)?.[1] || '0');
          const bW = parseInt(b.match(/(\d+)w/)?.[1] || '0');
          return bW - aW;
        })[0];
        if (largest) addImage(largest.split(/\s+/)[0], context + '-srcset');
      }
    });

    // picture source elements
    document.querySelectorAll('picture source[srcset]').forEach(source => {
      const context = source.closest('.module, section, header, footer')?.className || 'general';
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const parts = srcset.split(',').map(s => s.trim());
        const largest = parts.sort((a, b) => {
          const aW = parseInt(a.match(/(\d+)w/)?.[1] || '0');
          const bW = parseInt(b.match(/(\d+)w/)?.[1] || '0');
          return bW - aW;
        })[0];
        if (largest) addImage(largest.split(/\s+/)[0], context + '-picture');
      }
    });

    // CSS background images
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const matches = bg.matchAll(/url\(['"]?(.+?)['"]?\)/g);
        for (const m of matches) {
          const context = el.closest('.module, section, header, footer')?.className || 'general';
          addImage(m[1], context + '-bg');
        }
      }
    });

    // Logo specifically
    document.querySelectorAll('.the-logo img, .logo img, [class*="logo"] img').forEach(img => {
      addImage(img.src, 'logo');
    });

    return images;
  });

  console.log(`  Found ${imageUrls.length} images to download`);

  const imageMap = {};
  let imgCount = 0;

  for (const { url, context } of imageUrls) {
    try {
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const validExt = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif'].includes(ext.toLowerCase()) ? ext : '.jpg';

      // Generate descriptive name
      let name;
      if (context.includes('logo')) {
        name = `logo${imgCount > 0 ? '-' + imgCount : ''}`;
      } else if (context.includes('header') || context.includes('hero') || context.includes('slider')) {
        name = `hero-bg-${imgCount}`;
      } else if (context.includes('noticia') || context.includes('news')) {
        name = `news-card-${imgCount}`;
      } else if (context.includes('cta')) {
        name = `cta-bg-${imgCount}`;
      } else if (context.includes('mapa') || context.includes('map')) {
        name = `map-${imgCount}`;
      } else {
        name = `img-${imgCount}`;
      }

      const filename = sanitizeFilename(name) + validExt;
      const dest = path.join(ASSETS_DIR, filename);
      const result = await downloadWithRetry(url, dest);

      if (result) {
        imageMap[url] = `assets/images/${filename}`;
        imgCount++;
        if (imgCount % 10 === 0) console.log(`  Downloaded ${imgCount} images...`);
      }
    } catch (e) {
      // Skip failed images
    }
  }

  console.log(`  Total: ${imgCount} images downloaded`);

  // Save image map for reference during build
  fs.writeFileSync(
    path.join(CONTENT_DIR, 'image-map.json'),
    JSON.stringify(imageMap, null, 2)
  );

  // ── 1.8 Reference Screenshots ──────────────────────────────────────────────
  console.log('\nTaking reference screenshots...');

  // Scroll to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // Full page at 1440px
  await page.screenshot({ path: path.join(REF_DIR, 'full-page.png'), fullPage: true });
  console.log('  full-page.png (1440px)');

  // Section screenshots
  const moduleElements = await page.$$('section.module, header.module, .module');
  for (let i = 0; i < moduleElements.length; i++) {
    try {
      await moduleElements[i].scrollIntoViewIfNeeded();
      await sleep(500);
      const moduleType = await moduleElements[i].evaluate(el => {
        const cls = Array.from(el.classList).find(c => c.startsWith('module--')) || 'unknown';
        return cls.replace('module--', '');
      });
      await moduleElements[i].screenshot({
        path: path.join(REF_DIR, `section-${i}-${sanitizeFilename(moduleType)}.png`),
      });
      console.log(`  section-${i}-${moduleType}.png`);
    } catch (e) {
      // Some elements may not be screenshottable
    }
  }

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(REF_DIR, 'mobile.png'), fullPage: true });
  console.log('  mobile.png (375px)');

  // Tablet screenshot
  await page.setViewportSize({ width: 768, height: 1024 });
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(REF_DIR, 'tablet.png'), fullPage: true });
  console.log('  tablet.png (768px)');

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n=== Scraping complete ===');
  console.log(`Source: ${source}`);
  console.log(`Sections: ${textContent.length}`);
  console.log(`Videos: ${videos.length}`);
  console.log(`Images: ${imgCount}`);
  console.log(`Styles extracted: ${siteStructure.fonts.length} fonts, ${siteStructure.colors.length} colors`);

  await browser.close();
})();
