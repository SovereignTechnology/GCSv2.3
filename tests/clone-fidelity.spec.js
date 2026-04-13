// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load content data
const textContent = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'content', 'text-content.json'), 'utf-8')
);

// ═══════════════════════════════════════════════════════════════════════════════
// Structure Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Structure', () => {
  test('every section type from content exists on the page', async ({ page }) => {
    await page.goto('/');

    const sectionTypes = textContent.map(s => s.type);
    const uniqueTypes = [...new Set(sectionTypes)];

    for (const type of uniqueTypes) {
      if (type === 'module' || type === 'unknown') continue;
      const count = await page.evaluate((t) => {
        return document.querySelectorAll(`[class*="${t}"]`).length;
      }, type);
      expect(count, `Section type "${type}" should exist`).toBeGreaterThanOrEqual(1);
    }
  });

  test('correct section order', async ({ page }) => {
    await page.goto('/');

    const modules = page.locator('main .module');
    const count = await modules.count();
    expect(count).toBeGreaterThanOrEqual(7);

    const expectedOrder = [
      'module--header',
      'module--selector',
      'module--projects',
      'module--machinery',
      'module--team',
      'module--numero',
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
      'Services',
      'Projects',
      'Machinery',
      'Team',
      'Contact',
    ];

    for (const linkText of navLinks) {
      const link = page.locator('.the-nav__menu a', { hasText: linkText });
      await expect(link.first()).toBeAttached();
    }
  });

  test('footer has all expected links and social icons', async ({ page }) => {
    await page.goto('/');

    const footerLinks = [
      'Services',
      'Projects',
      'Team',
      'Contact',
      'Privacy Policy',
    ];

    for (const linkText of footerLinks) {
      const link = page.locator('.the-footer__links a', { hasText: linkText });
      await expect(link).toBeAttached();
    }

    // Social icons: LinkedIn, Instagram, Facebook
    const socialLinks = page.locator('.the-footer__social a');
    const socialCount = await socialLinks.count();
    expect(socialCount).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Content Completeness Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Content Completeness', () => {
  test('key headings appear on the page', async ({ page }) => {
    await page.goto('/');

    const expectedHeadings = [
      'Construcciones y Servicios',
      'Services',
      'Projects',
      'Machinery',
      'Team',
      'Key Figures',
      'Ready to Build',
    ];

    const pageText = await page.evaluate(() => document.body.innerText.replace(/[\n\r\t]+/g, ' '));

    for (const heading of expectedHeadings) {
      expect(pageText, `"${heading}" should be found on page`).toContain(heading);
    }
  });

  test('all GCS logo images are referenced in HTML', async ({ page }) => {
    await page.goto('/');
    const pageContent = await page.content();

    const imagesDir = path.join(__dirname, '..', 'assets', 'images');
    const imageFiles = fs.readdirSync(imagesDir);

    for (const file of imageFiles) {
      expect(pageContent, `Image "${file}" should be referenced`).toContain(file);
    }
  });

  test('key figures display correct values', async ({ page }) => {
    await page.goto('/');

    // Scroll to numbers to trigger animation
    const numbersSection = page.locator('.module--numero');
    await numbersSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const values = page.locator('.number-card__value');
    const count = await values.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      expect(text, `Counter ${i} should not be "0"`).not.toBe('0');
      expect(text, `Counter ${i} should not be empty`).not.toBe('');
    }
  });

  test('6 project cards are displayed', async ({ page }) => {
    await page.goto('/');

    const projectCards = page.locator('.project-card');
    const count = await projectCards.count();
    expect(count).toBe(6);
  });

  test('6 team members are displayed', async ({ page }) => {
    await page.goto('/');

    const teamCards = page.locator('.team-card');
    const count = await teamCards.count();
    expect(count).toBe(6);
  });

  test('4 machinery cards are displayed', async ({ page }) => {
    await page.goto('/');

    const machineryCards = page.locator('.machinery-card');
    const count = await machineryCards.count();
    expect(count).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Visual Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual', () => {
  test('full-page screenshot at current viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await page.evaluate(() => {
      document.querySelectorAll('.module[data-animate]').forEach(el => el.classList.add('appear'));
    });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: `tests/screenshots/full-page-${page.viewportSize().width}px.png`,
      fullPage: true,
    });
  });

  test('hero section renders with video background', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.module--header');
    await expect(hero).toBeVisible();

    const heroVideo = page.locator('.hero-slide--active .hero-slide__video');
    await expect(heroVideo).toBeAttached();
  });

  test('footer has correct dark background', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('.the-footer');
    const bgColor = await footer.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should be rgb(17, 24, 39) — the new primary color
    expect(bgColor).toMatch(/rgb\(17,\s*24,\s*39\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Interaction Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Interactions', () => {
  test('nav transparent at top, solid after scroll', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('.the-nav');
    await expect(nav).not.toHaveClass(/is-scrolled/);

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

    await expect(toggle).toBeVisible();

    await toggle.click();
    await page.waitForTimeout(300);
    await expect(overlay).toHaveClass(/is-open/);

    await toggle.click();
    await page.waitForTimeout(300);
    await expect(overlay).not.toHaveClass(/is-open/);
  });

  test('scroll to numbers section triggers counter animation', async ({ page }) => {
    await page.goto('/');

    const numbersSection = page.locator('.module--numero');
    await numbersSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const values = page.locator('.number-card__value');
    const count = await values.count();

    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      expect(text, `Counter ${i} should not be "0"`).not.toBe('0');
    }
  });

  test('project cards are visible and properly laid out', async ({ page }) => {
    await page.goto('/');

    const projectSection = page.locator('.module--projects');
    await projectSection.scrollIntoViewIfNeeded();

    const cards = page.locator('.project-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    await expect(cards.first()).toBeVisible();
  });

  test('services selector tabs switch content', async ({ page }) => {
    await page.goto('/');

    const selector = page.locator('.module--selector');
    await selector.scrollIntoViewIfNeeded();

    // Click third tab (Residential Construction)
    const thirdTab = page.locator('.selector__tab').nth(2);
    await thirdTab.click();
    await page.waitForTimeout(300);

    await expect(thirdTab).toHaveClass(/selector__tab--active/);

    const thirdPanel = page.locator('.selector__panel[data-panel="2"]');
    await expect(thirdPanel).toHaveClass(/selector__panel--active/);
  });

  test('smooth scroll navigates to correct section', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop') {
      test.skip();
      return;
    }

    await page.goto('/');

    await page.locator('.the-nav__menu a[href="#team"]').click();
    await page.waitForTimeout(800);

    const teamSection = page.locator('#team');
    const box = await teamSection.boundingBox();
    expect(box.y).toBeLessThan(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Responsive Tests
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

    const firstCard = page.locator('.project-card').first();
    const cardBox = await firstCard.boundingBox();
    if (cardBox) {
      const viewport = page.viewportSize();
      expect(cardBox.width).toBeGreaterThan(viewport.width * 0.4);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility Tests
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

    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('fonts.googleapis') &&
      !e.includes('Failed to load resource')
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
