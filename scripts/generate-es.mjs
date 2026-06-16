#!/usr/bin/env node
// Generates a crawlable Spanish (/es/) version of index.html as a static file.
// English source = index.html; Spanish translations = the `es` object inside
// `var TRANSLATIONS = { en:{...}, es:{...} };` in script.js.
//
// data-i18n             -> textContent
// data-i18n-html        -> innerHTML
// data-i18n-aria        -> aria-label
// data-i18n-alt         -> alt
// data-i18n-placeholder -> placeholder

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INDEX_PATH = resolve(ROOT, 'index.html');
const SCRIPT_PATH = resolve(ROOT, 'script.js');
const OUT_DIR = resolve(ROOT, 'es');
const OUT_PATH = resolve(OUT_DIR, 'index.html');

// ── a. Read sources ──────────────────────────────────────────────────────────
const html = readFileSync(INDEX_PATH, 'utf8');
const scriptSrc = readFileSync(SCRIPT_PATH, 'utf8');

// ── b. Extract the es translations ───────────────────────────────────────────
function extractTranslations(src) {
  const marker = 'var TRANSLATIONS =';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('Could not find "var TRANSLATIONS =" in script.js');

  // Find the opening brace of the object literal.
  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) throw new Error('Could not find object literal start after "var TRANSLATIONS ="');

  // Walk forward, tracking brace depth, respecting strings/comments, to find the
  // matching closing brace of the object literal.
  let depth = 0;
  let i = braceStart;
  let inString = null; // quote char when inside a string
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped char
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break; // matching close brace of the object literal
    }
  }

  const literal = src.slice(braceStart, i + 1);
  const TRANSLATIONS = (0, eval)('(' + literal + ')');
  return TRANSLATIONS;
}

const TRANSLATIONS = extractTranslations(scriptSrc);
const es = TRANSLATIONS.es;
if (!es || typeof es !== 'object') {
  throw new Error('TRANSLATIONS.es is missing or not an object');
}

// ── c. Parse index.html ──────────────────────────────────────────────────────
const root = parse(html, { comment: true });

let applied = 0;
const missing = new Set();

function getKeyValue(key) {
  if (Object.prototype.hasOwnProperty.call(es, key)) return es[key];
  console.warn(`[generate-es] Missing Spanish translation for key: "${key}" (skipping)`);
  missing.add(key);
  return undefined;
}

// ── d. Apply translations ────────────────────────────────────────────────────
for (const el of root.querySelectorAll('[data-i18n]')) {
  const key = el.getAttribute('data-i18n');
  const val = getKeyValue(key);
  if (val === undefined) continue;
  el.textContent = val;
  applied++;
}

for (const el of root.querySelectorAll('[data-i18n-html]')) {
  const key = el.getAttribute('data-i18n-html');
  const val = getKeyValue(key);
  if (val === undefined) continue;
  el.innerHTML = val;
  applied++;
}

for (const el of root.querySelectorAll('[data-i18n-aria]')) {
  const key = el.getAttribute('data-i18n-aria');
  const val = getKeyValue(key);
  if (val === undefined) continue;
  el.setAttribute('aria-label', val);
  applied++;
}

for (const el of root.querySelectorAll('[data-i18n-alt]')) {
  const key = el.getAttribute('data-i18n-alt');
  const val = getKeyValue(key);
  if (val === undefined) continue;
  el.setAttribute('alt', val);
  applied++;
}

for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
  const key = el.getAttribute('data-i18n-placeholder');
  const val = getKeyValue(key);
  if (val === undefined) continue;
  el.setAttribute('placeholder', val);
  applied++;
}

// ── e. <html> lang="es" ──────────────────────────────────────────────────────
const htmlEl = root.querySelector('html');
if (htmlEl) htmlEl.setAttribute('lang', 'es');

// ── f. Head updates ──────────────────────────────────────────────────────────
const titleEl = root.querySelector('head title');
if (titleEl) {
  titleEl.set_content('GCS El Salvador — Construcción, Ingeniería y Permisos');
}

const ES_DESCRIPTION =
  'GCS (Grupo Integral De Construcciones y Servicios) — Construcción, ingeniería, ' +
  'permisos y alquiler de maquinaria pesada en El Salvador. Proyectos residenciales ' +
  'y comerciales con más de 10 años de experiencia.';

const descEl = root.querySelector('meta[name="description"]');
if (descEl) descEl.setAttribute('content', ES_DESCRIPTION);

const canonicalEl = root.querySelector('link[rel="canonical"]');
if (canonicalEl) canonicalEl.setAttribute('href', 'https://gcs.sv/es/');

const ogUrlEl = root.querySelector('meta[property="og:url"]');
if (ogUrlEl) ogUrlEl.setAttribute('content', 'https://gcs.sv/es/');

const ogLocaleEl = root.querySelector('meta[property="og:locale"]');
if (ogLocaleEl) ogLocaleEl.setAttribute('content', 'es_SV');

const ogLocaleAltEl = root.querySelector('meta[property="og:locale:alternate"]');
if (ogLocaleAltEl) ogLocaleAltEl.setAttribute('content', 'en_US');

// hreflang alternates are kept exactly as-is (en, es, x-default).

// ── g. Rewrite root-relative asset paths so they resolve from /es/ ────────────
// For every src= and href= value that does NOT start with http, #, /, or mailto:,
// prefix it with "/".
function rewriteRefs(attr) {
  for (const el of root.querySelectorAll(`[${attr}]`)) {
    const val = el.getAttribute(attr);
    if (val == null || val === '') continue;
    if (
      val.startsWith('http') ||
      val.startsWith('#') ||
      val.startsWith('/') ||
      val.startsWith('mailto:')
    ) {
      continue;
    }
    el.setAttribute(attr, '/' + val);
  }
}
rewriteRefs('src');
rewriteRefs('href');

// ── h. Write out, preserving the DOCTYPE ─────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// Preserve the original <!DOCTYPE html> exactly. node-html-parser does not emit
// the doctype, so re-prepend it (match original casing/spacing).
const doctypeMatch = html.match(/^\s*<!doctype[^>]*>/i);
const doctype = doctypeMatch ? doctypeMatch[0].trim() : '<!DOCTYPE html>';

const output = doctype + '\n' + root.toString();
writeFileSync(OUT_PATH, output, 'utf8');

console.log(`[generate-es] Wrote ${OUT_PATH}`);
console.log(`[generate-es] Applied ${applied} translations across all data-i18n* attributes.`);
if (missing.size) {
  console.log(`[generate-es] ${missing.size} missing key(s): ${[...missing].join(', ')}`);
}
