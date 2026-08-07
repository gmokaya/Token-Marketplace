/**
 * Exports the TokenHarvest API docs site as a single combined PDF.
 * Uses Playwright to print each page to PDF, then concatenates with pdf-lib.
 *
 * Usage: node scripts/export-api-docs-pdf.mjs
 */

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:80/api-docs';
const OUT_DIR = resolve(__dirname, '../docs-exports');
const OUT_FILE = resolve(OUT_DIR, 'tokenharvest-api-docs.pdf');

const PAGES = [
  { path: '/', title: 'Overview' },
  { path: '/coffee/lots', title: 'Coffee Lots' },
  { path: '/coffee/auctions', title: 'Coffee Auctions' },
  { path: '/tea/lots', title: 'Tea Lots' },
  { path: '/tea/auctions', title: 'Tea Auctions' },
  { path: '/publishing', title: 'Publishing' },
];

async function getFullHeight(page) {
  return page.evaluate(() => document.body.scrollHeight);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const pagePdfs = [];

  for (const { path, title } of PAGES) {
    console.log(`Rendering: ${title} (${path})`);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });

    // Wait for content to paint
    await page.waitForTimeout(800);

    // Expand viewport to full content height so nothing is clipped
    const fullHeight = await getFullHeight(page);
    await page.setViewportSize({ width: 1280, height: Math.min(fullHeight + 80, 30000) });
    await page.waitForTimeout(200);

    const pdfBytes = await page.pdf({
      width: '1280px',
      height: `${Math.min(fullHeight + 80, 30000)}px`,
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });

    pagePdfs.push({ title, bytes: pdfBytes });
    await page.close();
  }

  await browser.close();

  // Merge all page PDFs into one document
  console.log('Merging pages...');
  const merged = await PDFDocument.create();

  for (const { title, bytes } of pagePdfs) {
    console.log(`  Adding: ${title}`);
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const finalBytes = await merged.save();
  writeFileSync(OUT_FILE, finalBytes);
  console.log(`\nSaved to: ${OUT_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
