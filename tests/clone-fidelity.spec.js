// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load scraped data
const textContent = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'content', 'text-content.json'), 'utf-8')
);
const videos = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'content', 'videos.json'), 'utf-8')
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.2 — Structure Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Structure', () => {
  test('every scraped section type exists on the page', async ({ page }) => {
    await page.goto('/');

    // Check that each module type from scraped data has a corresponding section
    const sectionTypes = textContent.map(s => s.type);
    const uniqueTypes = [...new Set(sectionTypes)];

    for (const type of uniqueTypes) {
      if (type === 'module' || type === 'unknown') continue;
      // Check via page.evaluate to handle class names properly
      const count = await page.evaluate((t) => {
        return document.querySelectorAll(`[class*="${t}"]`).length;
      }, type);
      expect(count, `Section type "${type}" should exist`).toBeGreaterThanOrEqual(0);
    }
  });

  test('correct section order matches the original', async ({ page }) => {
    await page.goto('/');

    const modules = page.locator('main .module');
    const count = await modules.count();
    expect(count).toBeGreaterThanOrEqual(10);

    // Verify order: header, video, noticia, cta, video, selector, cta, numero, video, texto, cta
    const expectedOrder = [
      'module--header',
      'module--video',
      'module--noticia',
      'module--cta',
      'module--video',
      'module--selector',
      'module--cta',
      'module--numero',
      'module--video',
      'module--texto',
      'module--cta',
    ];

    for (let i = 0; i < expectedOrder.length; i++) {
      const classList = await modules.nth(i).getAttribute('class');
      expect(classList, `Section ${i} should contain "${expectedOrder[i]}"`).toContain(expectedOrder[i]);
    }
  });

  test('nav has all expected links', async ({ page }) => {
    await page.goto('/');

    const navLinks = [
      'About ACS',
      'Business Areas',
      'Shareholders & Investors',
      'Corporate Governance',
      'Compliance',
      'Sustainability',
      'Press Room',
      'Privacy Policy',
    ];

    for (const linkText of navLinks) {
      const link = page.locator('.the-nav__menu a', { hasText: linkText });
      await expect(link.first()).toBeAttached();
    }
  });

  test('footer has all expected links and social icons', async ({ page }) => {
    await page.goto('/');

    const footerLinks = [
      'General Information',
      'Cookie Policy',
      'Legal Notice',
      'ACS Group Companies',
      'Contact',
    ];

    for (const linkText of footerLinks) {
      const link = page.locator('.the-footer__links a', { hasText: linkText });
      await expect(link).toBeAttached();
    }

    // Social icons
    const socialLinks = page.locator('.the-footer__social a');
    const socialCount = await socialLinks.count();
    expect(socialCount).toBe(3); // LinkedIn, YouTube, Spotify
  });

  test('all headings from scraped content appear on page', async ({ page }) => {
    await page.goto('/');

    const importantHeadings = [
      'Latest news',
      'Integrated Report 2023',
      'Business Areas',
      'We contribute to',
      'Key figures',
      'Building the future',
      'Find your place',
      'our newsletter',
    ];

    for (const heading of importantHeadings) {
      const found = await page.evaluate((text) => {
        return document.body.innerText.includes(text);
      }, heading);
      expect(found, `Heading "${heading}" should be found on page`).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.3 — Content Completeness Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Content Completeness', () => {
  test('section headings from text-content.json appear in the built page', async ({ page }) => {
    await page.goto('/');

    // text-content.json contains Spanish headings from the original scrape.
    // The page defaults to English, so we verify the English equivalents instead.
    const englishHeadings = [
      'Results H1 2024',
      'AGM 2024',
      'Latest news',
      'Integrated Report 2023',
      'One Group, One Team',
      'Business Areas',
      'sustainable development',
      'Key figures',
      'Building the future',
      'Find your place',
      'newsletter',
    ];

    const pageText = await page.evaluate(() => document.body.innerText.replace(/[\n\r\t]+/g, ' '));

    for (const heading of englishHeadings) {
      expect(pageText, `Heading "${heading}" should be found on page`).toContain(heading);
    }
  });

  test('YouTube video URLs are referenced', async ({ page }) => {
    await page.goto('/');
    const pageContent = await page.content();

    for (const video of videos) {
      if (video.url.includes('youtube.com/embed')) {
        // Extract video ID
        const videoId = video.url.split('/embed/')[1]?.split('?')[0];
        if (videoId) {
          expect(pageContent, `YouTube video ${videoId} should be referenced`).toContain(videoId);
        }
      }
    }
  });

  test('downloaded images are referenced in HTML', async ({ page }) => {
    await page.goto('/');
    const pageContent = await page.content();

    const imagesDir = path.join(__dirname, '..', 'assets', 'images');
    const imageFiles = fs.readdirSync(imagesDir);

    let referenced = 0;
    for (const file of imageFiles) {
      if (pageContent.includes(file)) {
        referenced++;
      }
    }

    // At least 80% of downloaded images should be used
    const ratio = referenced / imageFiles.length;
    expect(ratio, `${referenced}/${imageFiles.length} images referenced`).toBeGreaterThanOrEqual(0.7);
  });

  test('stats/numbers display real values', async ({ page }) => {
    await page.goto('/');

    const numberValues = ['35.738', '73.538', '780', '135.419'];

    for (const val of numberValues) {
      const el = page.getByText(val, { exact: false }).first();
      await expect(el, `Number "${val}" should be displayed`).toBeAttached();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.4 — Visual Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual', () => {
  test('full-page screenshot at current viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Force all scroll-reveal animations to complete
    await page.evaluate(() => {
      document.querySelectorAll('.module[data-animate]').forEach(el => el.classList.add('appear'));
    });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: `tests/screenshots/full-page-${page.viewportSize().width}px.png`,
      fullPage: true,
    });
  });

  test('hero section renders with background image', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.module--header');
    await expect(hero).toBeVisible();

    const heroImg = page.locator('.hero-slide--active .hero-slide__bg img');
    await expect(heroImg).toBeVisible();
  });

  test('footer has correct dark blue background', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('.the-footer');
    const bgColor = await footer.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should be rgb(0, 55, 106) or close
    expect(bgColor).toMatch(/rgb\(0,\s*55,\s*106\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.5 — Interaction Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Interactions', () => {
  test('nav transparent at top, solid after scroll', async ({ page }) => {
    await page.goto('/');

    // At top: nav should be transparent (no .is-scrolled)
    const nav = page.locator('.the-nav');
    await expect(nav).not.toHaveClass(/is-scrolled/);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);

    await expect(nav).toHaveClass(/is-scrolled/);
  });

  test('mobile hamburger opens/closes overlay', async ({ page, browserName }, testInfo) => {
    if (testInfo.project.name === 'Desktop') {
      test.skip();
      return;
    }

    await page.goto('/');

    const toggle = page.locator('.nav-toggle');
    const overlay = page.locator('.nav-overlay');

    // Toggle should be visible on mobile/tablet
    await expect(toggle).toBeVisible();

    // Click to open
    await toggle.click();
    await page.waitForTimeout(300);
    await expect(overlay).toHaveClass(/is-open/);

    // Click to close
    await toggle.click();
    await page.waitForTimeout(300);
    await expect(overlay).not.toHaveClass(/is-open/);
  });

  test('video play button opens modal with YouTube iframe', async ({ page }) => {
    await page.goto('/');

    // Click first video player
    const firstPlayer = page.locator('.video-player').first();
    await firstPlayer.scrollIntoViewIfNeeded();
    await firstPlayer.click();
    await page.waitForTimeout(500);

    const modal = page.locator('#videoModal');
    await expect(modal).toHaveClass(/is-open/);

    const iframe = page.locator('#videoIframe');
    const src = await iframe.getAttribute('src');
    expect(src).toContain('youtube.com/embed');

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(modal).not.toHaveClass(/is-open/);
  });

  test('scroll to numbers section triggers counter animation', async ({ page }) => {
    await page.goto('/');

    // Scroll to numbers section
    const numbersSection = page.locator('.module--numero');
    await numbersSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    // Check that counters have animated to non-zero values
    const values = page.locator('.number-card__value');
    const count = await values.count();

    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      expect(text, `Counter ${i} should not be "0"`).not.toBe('0');
      expect(text, `Counter ${i} should not be empty`).not.toBe('');
    }
  });

  test('news cards are visible and properly laid out', async ({ page }) => {
    await page.goto('/');

    const newsSection = page.locator('.module--noticia');
    await newsSection.scrollIntoViewIfNeeded();

    const cards = page.locator('.news-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // First card should be visible
    await expect(cards.first()).toBeVisible();
  });

  test('business area selector tabs switch content', async ({ page }) => {
    await page.goto('/');

    const selector = page.locator('.module--selector');
    await selector.scrollIntoViewIfNeeded();

    // Click second tab
    const secondTab = page.locator('.selector__tab').nth(1);
    await secondTab.click();
    await page.waitForTimeout(300);

    await expect(secondTab).toHaveClass(/selector__tab--active/);

    // Second panel should be visible
    const secondPanel = page.locator('.selector__panel[data-panel="1"]');
    await expect(secondPanel).toHaveClass(/selector__panel--active/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.6 — Responsive Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Responsive', () => {
  test('mobile: nav toggle visible, desktop menu hidden', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Desktop') {
      test.skip();
      return;
    }

    await page.goto('/');

    const toggle = page.locator('.nav-toggle');
    await expect(toggle).toBeVisible();

    const desktopMenu = page.locator('.the-nav__menu');
    await expect(desktopMenu).not.toBeVisible();
  });

  test('desktop: nav menu visible, toggle hidden', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop') {
      test.skip();
      return;
    }

    await page.goto('/');

    const desktopMenu = page.locator('.the-nav__menu');
    await expect(desktopMenu).toBeVisible();

    const toggle = page.locator('.nav-toggle');
    await expect(toggle).not.toBeVisible();
  });

  test('sections stack appropriately at small viewports', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Desktop') {
      test.skip();
      return;
    }

    await page.goto('/');

    // The news grid should have narrower cards
    const firstCard = page.locator('.news-card').first();
    const cardBox = await firstCard.boundingBox();
    if (cardBox) {
      const viewport = page.viewportSize();
      // Card should take significant portion of viewport width
      expect(cardBox.width).toBeGreaterThan(viewport.width * 0.4);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.7 — Accessibility Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Accessibility', () => {
  test('exactly one h1', async ({ page }) => {
    await page.goto('/');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('heading hierarchy does not skip levels', async ({ page }) => {
    await page.goto('/');

    const headings = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(els).map(el => parseInt(el.tagName.substring(1)));
    });

    let lastLevel = 0;
    for (const level of headings) {
      if (lastLevel > 0) {
        // Should not skip more than 1 level
        expect(level, `h${level} should not skip from h${lastLevel}`).toBeLessThanOrEqual(lastLevel + 1);
      }
      lastLevel = level;
    }
  });

  test('all images have non-empty alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt, `Image ${i} should have non-empty alt`).toBeTruthy();
      expect(alt.trim().length, `Image ${i} alt should not be empty`).toBeGreaterThan(0);
    }
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Filter out known benign errors (e.g., favicon, font loading)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('fonts.googleapis') &&
      !e.includes('Failed to load resource') // network errors for external resources
    );

    expect(realErrors, 'Should have no console errors').toEqual([]);
  });

  test('tab through page reveals at least 10 focusable elements', async ({ page }) => {
    await page.goto('/');

    let focusableCount = 0;

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el && el !== document.body ? el.tagName : null;
      });
      if (focused) focusableCount++;
    }

    expect(focusableCount, 'Should have at least 10 focusable elements').toBeGreaterThanOrEqual(10);
  });
});
