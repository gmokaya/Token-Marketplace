import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, '../docs/tea-factory-api-integration.md');
const outPath = path.join(__dirname, '../docs/tea-factory-api-integration.pdf');

const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split('\n');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 65, left: 55, right: 55 },
  info: {
    Title: 'Tea Factory → Tea Marketplace API Integration',
    Author: 'TokenHarvest',
  },
  autoFirstPage: true,
  bufferPages: true,
});

const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const C = {
  h1: '#1a2e44', h2: '#1a5276', h3: '#1f618d',
  body: '#1c1c1c', code: '#2d4052', codeBg: '#f0f4f8',
  border: '#c0cfe0', rule: '#d0dae6',
  tblHead: '#1a5276', tblAlt: '#eef3fa',
};

const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const L = doc.page.margins.left;

function safeY(y) {
  if (typeof y !== 'number' || isNaN(y) || y < 0) return doc.page.margins.top;
  return y;
}

function ensureSpace(needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function rule() {
  doc.moveDown(0.3);
  doc.save().moveTo(L, doc.y).lineTo(L + W, doc.y)
    .strokeColor(C.rule).lineWidth(0.5).stroke().restore();
  doc.moveDown(0.6);
}

// strip all markdown formatting to plain text
function plain(s) {
  if (!s) return '';
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\\([|*_`])/g, '$1')
    .trim();
}

// ── code block ────────────────────────────────────────────────────────────────
function renderCode(codeLines) {
  const text = codeLines.join('\n');
  const padX = 8, padY = 6;
  doc.font('Courier').fontSize(7.8);
  const textH = doc.heightOfString(text, { width: W - padX * 2 });
  const blockH = Math.max(textH + padY * 2, 20);
  ensureSpace(blockH + 10);
  const y = safeY(doc.y);
  doc.save()
    .rect(L, y, W, blockH).fillColor(C.codeBg).fill()
    .rect(L, y, 3, blockH).fillColor(C.h2).fill()
    .rect(L, y, W, blockH).strokeColor(C.border).lineWidth(0.3).stroke()
    .restore();
  doc.font('Courier').fontSize(7.8).fillColor(C.code)
    .text(text, L + padX, y + padY, { width: W - padX * 2, lineBreak: true });
  const after = y + blockH + 6;
  if (!isNaN(after)) doc.y = after;
}

// ── blockquote ────────────────────────────────────────────────────────────────
function renderBlockquote(text) {
  const t = plain(text.replace(/^>\s*/, ''));
  const padX = 10, padY = 5;
  doc.font('Helvetica-Oblique').fontSize(9.5);
  const textH = doc.heightOfString(t, { width: W - padX - 4 });
  const blockH = Math.max(textH + padY * 2, 18);
  ensureSpace(blockH + 8);
  const y = safeY(doc.y);
  doc.save().rect(L, y, 3, blockH).fillColor(C.h3).fill().restore();
  doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#444')
    .text(t, L + padX, y + padY, { width: W - padX - 4, lineBreak: true });
  const after = y + blockH + 4;
  if (!isNaN(after)) doc.y = after;
}

// ── table ─────────────────────────────────────────────────────────────────────
function renderTable(header, rows) {
  if (!header || header.length === 0) return;
  const cols = header.length;
  const fontSize = 8.5;
  const padX = 5, padY = 4;
  const minW = 40;

  // column width heuristics
  let colWidths;
  if (cols === 2)      colWidths = [W * 0.28, W * 0.72];
  else if (cols === 3) colWidths = [W * 0.22, W * 0.17, W * 0.61];
  else if (cols === 4) colWidths = [W * 0.20, W * 0.12, W * 0.12, W * 0.56];
  else                 colWidths = Array(cols).fill(Math.max(W / cols, minW));

  // ensure widths are valid numbers
  colWidths = colWidths.map(w => (typeof w === 'number' && !isNaN(w) && w > padX * 2) ? w : minW);

  function cellHeight(cells) {
    let max = 16;
    for (let ci = 0; ci < cells.length && ci < cols; ci++) {
      const t = plain(cells[ci]);
      const cw = colWidths[ci] - padX * 2;
      if (cw < 1 || !t) continue;
      doc.font('Helvetica').fontSize(fontSize);
      const h = doc.heightOfString(t, { width: cw });
      if (typeof h === 'number' && !isNaN(h) && h + padY * 2 > max) {
        max = h + padY * 2;
      }
    }
    return max;
  }

  // draw a single row at absolute y; returns row height
  function drawRow(cells, startY, isHeader, isAlt) {
    const rh = cellHeight(cells);
    if (isNaN(startY) || isNaN(rh)) return 18;

    // background
    doc.save();
    if (isHeader) doc.rect(L, startY, W, rh).fillColor(C.tblHead).fill();
    else if (isAlt) doc.rect(L, startY, W, rh).fillColor(C.tblAlt).fill();
    doc.rect(L, startY, W, rh).strokeColor(C.border).lineWidth(0.3).stroke();
    doc.restore();

    // text per cell — always use explicit x, y
    let cx = L;
    for (let ci = 0; ci < cells.length && ci < cols; ci++) {
      const t = plain(cells[ci]);
      const cw = colWidths[ci] - padX * 2;
      if (t && cw > 0) {
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(fontSize)
           .fillColor(isHeader ? '#ffffff' : C.body)
           .text(t, cx + padX, startY + padY, { width: cw, lineBreak: true });
      }
      cx += colWidths[ci];
    }
    return rh;
  }

  ensureSpace(cellHeight(header) + 4);
  let y = safeY(doc.y);
  y += drawRow(header, y, true, false);

  for (let ri = 0; ri < rows.length; ri++) {
    const rh = cellHeight(rows[ri]);
    if (y + rh > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = safeY(doc.y);
    }
    y += drawRow(rows[ri], y, false, ri % 2 === 1);
  }
  doc.y = y + 8;
}

// ── cover page ────────────────────────────────────────────────────────────────
doc.rect(0, 0, doc.page.width, 175).fillColor(C.h1).fill();
doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff')
   .text('Tea Factory → Tea Marketplace', L, 58, { width: W });
doc.font('Helvetica').fontSize(14).fillColor('#a8c4e0')
   .text('API Integration Reference', L, 95, { width: W });
doc.font('Helvetica').fontSize(9.5).fillColor('#7fa8cc')
   .text('TokenHarvest  ·  East African eWR Trading Platform  ·  v1.0', L, 120, { width: W });
doc.y = 195;

// ── parse & render ────────────────────────────────────────────────────────────
let i = 0, inCode = false, codeLines = [];
let tblHeader = null, tblRows = [], inTable = false;

function flushTable() {
  if (inTable && tblHeader) renderTable(tblHeader, tblRows);
  tblHeader = null; tblRows = []; inTable = false;
}

while (i < lines.length) {
  const line = lines[i];

  if (line.startsWith('```')) {
    if (inCode) { renderCode(codeLines); codeLines = []; inCode = false; }
    else { flushTable(); inCode = true; }
    i++; continue;
  }
  if (inCode) { codeLines.push(line); i++; continue; }
  if (/^---+\s*$/.test(line)) { flushTable(); rule(); i++; continue; }

  if (line.trimStart().startsWith('|')) {
    const raw = line.split('|');
    const cells = raw.slice(1, raw.length - 1);   // drop first/last empty strings from leading/trailing |
    if (cells.every(c => /^[\s:|-]+$/.test(c))) { i++; continue; } // separator row
    if (!inTable) { tblHeader = cells; inTable = true; }
    else { tblRows.push(cells); }
    i++; continue;
  }
  if (inTable) flushTable();

  if (line.startsWith('> ')) { renderBlockquote(line); i++; continue; }

  // headings
  const h1 = line.match(/^# (.+)/);
  if (h1) { ensureSpace(50); doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(18).fillColor(C.h1).text(plain(h1[1]), { paragraphGap: 3 }); doc.moveDown(0.2); i++; continue; }
  const h2 = line.match(/^## (.+)/);
  if (h2) { ensureSpace(40); doc.moveDown(0.6); doc.font('Helvetica-Bold').fontSize(14).fillColor(C.h2).text(plain(h2[1]), { paragraphGap: 2 }); doc.moveDown(0.2); i++; continue; }
  const h3 = line.match(/^### (.+)/);
  if (h3) { ensureSpace(30); doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.h3).text(plain(h3[1]), { paragraphGap: 2 }); doc.moveDown(0.1); i++; continue; }
  const h4 = line.match(/^#### (.+)/);
  if (h4) { ensureSpace(24); doc.moveDown(0.3); doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.h3).text(plain(h4[1]), { paragraphGap: 1 }); i++; continue; }

  // list item
  const li = line.match(/^(\s*)([-*]|\d+\.) (.+)/);
  if (li) {
    const indent = Math.floor(li[1].length / 2);
    const bullet = /^\d/.test(li[2]) ? li[2] + ' ' : '• ';
    const x = L + indent * 12 + 8;
    doc.font('Helvetica').fontSize(9.5).fillColor(C.body)
       .text(bullet + plain(li[3]), x, doc.y, { width: W - indent * 12 - 8, lineBreak: true, paragraphGap: 1 });
    i++; continue;
  }

  if (line.trim() === '') { doc.moveDown(0.25); i++; continue; }

  // paragraph
  doc.font('Helvetica').fontSize(10).fillColor(C.body)
     .text(plain(line), L, doc.y, { width: W, lineBreak: true, paragraphGap: 2 });
  i++;
}
flushTable();

// ── page footers ──────────────────────────────────────────────────────────────
const range = doc.bufferedPageRange();
for (let p = range.start; p < range.start + range.count; p++) {
  doc.switchToPage(p);
  const pageNum = p - range.start + 1;
  doc.font('Helvetica').fontSize(8).fillColor('#999')
     .text(
       `TokenHarvest — Tea Factory API Integration Reference   ·   Page ${pageNum}`,
       L, doc.page.height - doc.page.margins.bottom + 14,
       { width: W, align: 'center' }
     );
}

doc.end();
stream.on('finish', () => console.log('PDF written → ' + outPath));
stream.on('error', e => { console.error(e); process.exit(1); });
