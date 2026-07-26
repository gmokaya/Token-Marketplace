/**
 * TokenHarvest Tea Marketplace — API Integration Guide PDF Generator
 * Uses pdfkit (globally installed) for programmatic PDF creation.
 */

import { createWriteStream } from "fs";
import { createRequire } from "module";
import { resolve } from "path";

const require = createRequire(import.meta.url);
const PDFKIT_PATH = "/home/runner/workspace/.config/npm/node_global/lib/node_modules/pdfkit";
const PDFDocument = require(PDFKIT_PATH);

const OUT = resolve("docs/TokenHarvest-API-Integration-Guide.pdf");

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  greenDark:  "#0a2a1e",
  greenMid:   "#14532d",
  greenLight: "#166534",
  greenPale:  "#dcfce7",
  teal:       "#0d9488",
  tealPale:   "#ccfbf1",
  amber:      "#d97706",
  amberPale:  "#fef3c7",
  red:        "#dc2626",
  redPale:    "#fee2e2",
  blue:       "#1d4ed8",
  bluePale:   "#dbeafe",
  purple:     "#7c3aed",
  purplePale: "#ede9fe",
  gray50:     "#f9fafb",
  gray100:    "#f3f4f6",
  gray200:    "#e5e7eb",
  gray300:    "#d1d5db",
  gray400:    "#9ca3af",
  gray500:    "#6b7280",
  gray600:    "#4b5563",
  gray700:    "#374151",
  gray900:    "#111827",
  white:      "#ffffff",
};

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 65, left: 52, right: 52 },
  info: {
    Title:    "TokenHarvest Tea Marketplace — API Integration Guide",
    Author:   "TokenHarvest Exchange",
    Subject:  "API Reference",
    Keywords: "API, eWR, tea, marketplace, integration",
  },
});

doc.pipe(createWriteStream(OUT));

// ── Helpers ───────────────────────────────────────────────────────────────────
const PW = 595.28;  // A4 width
const PH = 841.89;  // A4 height
const ML = 52;      // margin left
const MR = 52;      // margin right
const CW = PW - ML - MR;  // content width

let pageNum = 0;

function newPage() {
  if (pageNum > 0) doc.addPage();
  pageNum++;
}

function x() { return ML; }
function y() { return doc.y; }
function availW() { return CW; }

function gap(n = 8) { doc.moveDown(n / 12); }

function sectionRule(color = C.greenPale) {
  const cy = doc.y;
  doc.moveTo(ML, cy).lineTo(PW - MR, cy).strokeColor(color).lineWidth(1).stroke();
  doc.y = cy + 6;
}

function heading1(text) {
  gap(12);
  sectionRule(C.greenPale);
  doc.fontSize(18).fillColor(C.greenDark).font("Helvetica-Bold").text(text, ML, doc.y + 4);
  gap(6);
}

function heading2(text) {
  gap(10);
  doc.fontSize(12).fillColor(C.greenMid).font("Helvetica-Bold").text(text);
  gap(3);
}

function heading3(text) {
  gap(7);
  doc.fontSize(10).fillColor(C.gray700).font("Helvetica-Bold").text(text);
  gap(2);
}

function body(text, opts = {}) {
  doc.fontSize(9).fillColor(C.gray700).font("Helvetica").text(text, { ...opts, lineGap: 1.5 });
}

function code(text) {
  doc.fontSize(8).fillColor(C.teal).font("Courier").text(text, { continued: false });
  doc.font("Helvetica");
}

// Inline code within a paragraph
function inlineCode(text, opts = {}) {
  return { text, options: { ...opts } };
}

// Callout box
function callout(text, type = "info") {
  const colors = {
    info:   { bg: C.bluePale,   border: C.blue,   text: "#1e3a8a" },
    warn:   { bg: C.amberPale,  border: C.amber,  text: "#78350f" },
    green:  { bg: C.greenPale,  border: C.greenLight, text: C.greenDark },
    danger: { bg: C.redPale,    border: C.red,    text: "#7f1d1d" },
  };
  const s = colors[type] || colors.info;
  const cy = doc.y;
  const textX = ML + 12;
  const textW = CW - 16;

  // Measure text height first
  const th = doc.heightOfString(text, { width: textW, fontSize: 8.5, lineGap: 1.5 });
  const boxH = th + 14;

  doc.roundedRect(ML, cy, CW, boxH, 3)
     .fillColor(s.bg).fill()
     .moveTo(ML, cy).lineTo(ML, cy + boxH).strokeColor(s.border).lineWidth(2).stroke();

  doc.fontSize(8.5).fillColor(s.text).font("Helvetica").text(text, textX, cy + 7, { width: textW, lineGap: 1.5 });

  doc.y = cy + boxH + 8;
}

// Method badge + path line
function endpointHeader(method, path, authType) {
  const methodColors = {
    GET:    { bg: C.bluePale,   text: C.blue    },
    POST:   { bg: C.greenPale,  text: C.greenMid },
    PATCH:  { bg: C.amberPale,  text: C.amber   },
    DELETE: { bg: C.redPale,    text: C.red     },
    PUT:    { bg: C.tealPale,   text: C.teal    },
  };
  const authColors = {
    "Clerk JWT":  { bg: C.purplePale, text: C.purple },
    "X-Api-Key":  { bg: C.amberPale,  text: C.amber  },
    "eWRS JWT":   { bg: C.tealPale,   text: C.teal   },
    "Public":     { bg: C.gray100,    text: C.gray500 },
  };

  const mc = methodColors[method] || { bg: C.gray100, text: C.gray700 };
  const ac = authColors[authType] || { bg: C.gray100, text: C.gray500 };

  const cy = doc.y;
  const headerH = 24;

  // Background
  doc.rect(ML, cy, CW, headerH).fillColor(C.gray50).fill();
  doc.rect(ML, cy, CW, headerH).strokeColor(C.gray200).lineWidth(0.5).stroke();

  // Method badge
  const mw = 42;
  doc.roundedRect(ML + 7, cy + 5, mw, 14, 2).fillColor(mc.bg).fill();
  doc.fontSize(7.5).fillColor(mc.text).font("Helvetica-Bold")
     .text(method, ML + 7, cy + 8, { width: mw, align: "center" });

  // Path
  doc.fontSize(9.5).fillColor(C.gray900).font("Courier-Bold")
     .text(path, ML + mw + 14, cy + 7, { width: CW - mw - 90 });

  // Auth badge
  const aw = 64;
  doc.roundedRect(PW - MR - aw - 2, cy + 5, aw, 14, 2).fillColor(ac.bg).fill();
  doc.fontSize(7).fillColor(ac.text).font("Helvetica-Bold")
     .text(authType, PW - MR - aw - 2, cy + 8, { width: aw, align: "center" });

  doc.y = cy + headerH + 1;
}

// Simple table
function table(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const cx = ML;
  let cy = doc.y;

  // Header row
  doc.rect(cx, cy, totalW, 16).fillColor(C.greenDark).fill();
  let hx = cx;
  headers.forEach((h, i) => {
    doc.fontSize(7.5).fillColor(C.white).font("Helvetica-Bold")
       .text(h, hx + 4, cy + 4, { width: colWidths[i] - 6, lineBreak: false });
    hx += colWidths[i];
  });
  cy += 16;

  // Data rows
  rows.forEach((row, ri) => {
    // Measure max row height
    const cellHeights = row.map((cell, ci) => {
      const measured = doc.heightOfString(String(cell), {
        width: colWidths[ci] - 8,
        fontSize: 8,
        lineGap: 1,
      });
      return Math.max(measured + 6, 16);
    });
    const rowH = Math.max(...cellHeights);

    // Check for page overflow
    if (cy + rowH > PH - 80) {
      doc.addPage();
      cy = doc.y;
      // Re-draw header
      doc.rect(cx, cy, totalW, 16).fillColor(C.greenDark).fill();
      let rhx = cx;
      headers.forEach((h, i) => {
        doc.fontSize(7.5).fillColor(C.white).font("Helvetica-Bold")
           .text(h, rhx + 4, cy + 4, { width: colWidths[i] - 6, lineBreak: false });
        rhx += colWidths[i];
      });
      cy += 16;
    }

    const rowBg = ri % 2 === 0 ? C.white : C.gray50;
    doc.rect(cx, cy, totalW, rowH).fillColor(rowBg).fill();
    doc.rect(cx, cy, totalW, rowH).strokeColor(C.gray200).lineWidth(0.3).stroke();

    let rx = cx;
    row.forEach((cell, ci) => {
      const cellText = String(cell);
      // Required/Optional tags
      if (cellText === "REQUIRED") {
        doc.fontSize(7).fillColor(C.red).font("Helvetica-Bold")
           .text("REQUIRED", rx + 4, cy + 4, { width: colWidths[ci] - 6, lineBreak: false });
      } else if (cellText === "OPTIONAL") {
        doc.fontSize(7).fillColor(C.gray400).font("Helvetica")
           .text("optional", rx + 4, cy + 4, { width: colWidths[ci] - 6, lineBreak: false });
      } else if (ci === 0) {
        // First column — monospace
        doc.fontSize(8).fillColor(C.teal).font("Courier")
           .text(cellText, rx + 4, cy + 3, { width: colWidths[ci] - 6, lineGap: 1 });
      } else {
        doc.fontSize(8).fillColor(C.gray700).font("Helvetica")
           .text(cellText, rx + 4, cy + 3, { width: colWidths[ci] - 6, lineGap: 1 });
      }
      rx += colWidths[ci];
    });
    cy += rowH;
  });

  doc.y = cy + 8;
}

// Role badge (inline within running text using rect)
function roleBadges(roles) {
  const colors = {
    ADMIN:      { bg: "#fce7f3", text: "#9d174d" },
    FINANCIER:  { bg: C.purplePale, text: C.purple },
    "Any authenticated": { bg: C.gray100, text: C.gray600 },
    default:    { bg: C.greenPale, text: C.greenMid },
  };
  const cy = doc.y;
  let bx = ML;
  roles.forEach(role => {
    const rc = colors[role] || colors.default;
    const w = doc.widthOfString(role, { fontSize: 7.5 }) + 12;
    doc.roundedRect(bx, cy + 1, w, 14, 2).fillColor(rc.bg).fill();
    doc.fontSize(7.5).fillColor(rc.text).font("Helvetica-Bold").text(role, bx + 4, cy + 4, { lineBreak: false });
    bx += w + 5;
  });
  doc.y = cy + 18;
}

// Code block
function codeBlock(text) {
  const lines = text.split("\n");
  const lineH = 11;
  const boxH = lines.length * lineH + 12;
  const cy = doc.y;

  doc.rect(ML, cy, CW, boxH).fillColor("#0f172a").fill();

  lines.forEach((line, i) => {
    doc.fontSize(7.5).fillColor("#e2e8f0").font("Courier")
       .text(line, ML + 8, cy + 6 + i * lineH, { width: CW - 16, lineBreak: false });
  });

  doc.y = cy + boxH + 8;
}

// Section header with number circle
function sectionHeader(num, title) {
  if (doc.y > PH - 150) { doc.addPage(); }
  const cy = doc.y;

  // Number circle
  doc.roundedRect(ML, cy, 32, 32, 4).fillColor(C.greenDark).fill();
  doc.fontSize(14).fillColor(C.white).font("Helvetica-Bold")
     .text(String(num), ML, cy + 7, { width: 32, align: "center" });

  // Title
  doc.fontSize(17).fillColor(C.greenDark).font("Helvetica-Bold")
     .text(title, ML + 40, cy + 6);

  doc.y = cy + 38;
  doc.moveTo(ML, doc.y).lineTo(PW - MR, doc.y).strokeColor(C.greenPale).lineWidth(1.5).stroke();
  doc.y += 10;
}

// ═══════════════════════════════════════════════════════════════════ COVER PAGE
newPage();
// Deep green background
doc.rect(0, 0, PW, PH).fillColor(C.greenDark).fill();

// Decorative circles
doc.circle(PW - 60, 80, 180).fillColor("rgba(255,255,255,0.03)").fill();
doc.circle(80, PH - 80, 150).fillColor("rgba(255,255,255,0.025)").fill();

// Teal accent bar
doc.rect(ML, 210, 55, 3).fillColor(C.teal).fill();

// Logo area
doc.fontSize(10).fillColor("rgba(255,255,255,0.5)").font("Helvetica-Bold")
   .text("TOKENHARVEST", ML, 80, { letterSpacing: 3 });
doc.fontSize(22).fillColor(C.white).font("Helvetica-Bold")
   .text("Tea Marketplace", ML, 96);
doc.fontSize(12).fillColor("rgba(255,255,255,0.55)").font("Helvetica")
   .text("Powered by eWR Infrastructure", ML, 123);

// Main title
doc.fontSize(34).fillColor(C.white).font("Helvetica-Bold")
   .text("API Integration", ML, 225, { lineGap: 2 });
doc.fontSize(34).fillColor(C.white).font("Helvetica-Bold")
   .text("Reference Guide", ML, 263, { lineGap: 2 });

doc.fontSize(11).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
   .text(
     "Complete technical documentation for all integration roles:\nFactory Portals, Producers, Brokers, Off-Takers,\nFinanciers, Cooperatives, and Exchange Administrators.",
     ML, 314, { width: 380, lineGap: 4 }
   );

// Badges
const badges = ["REST / JSON", "Clerk JWT Auth", "API Key (Service)", "eWR Registry Sync", "Version 1.0"];
let bx = ML, by = 400;
badges.forEach(b => {
  const bw = doc.widthOfString(b, { fontSize: 8 }) + 18;
  doc.roundedRect(bx, by, bw, 18, 2)
     .strokeColor("rgba(255,255,255,0.25)").lineWidth(0.8).stroke();
  doc.fontSize(8).fillColor("rgba(255,255,255,0.6)").font("Helvetica")
     .text(b, bx + 7, by + 5, { lineBreak: false });
  bx += bw + 8;
});

// Bottom meta
doc.moveTo(ML, PH - 110).lineTo(PW - MR, PH - 110).strokeColor("rgba(255,255,255,0.12)").lineWidth(0.5).stroke();
doc.fontSize(8.5).fillColor("rgba(255,255,255,0.4)").font("Helvetica")
   .text("Document Version  1.0 — July 2026", ML, PH - 95)
   .text("Classification   Confidential — Partners Only", ML, PH - 80)
   .text("Contact   exchange@tokenharvest.io", ML, PH - 65);

// ══════════════════════════════════════════════════════════ TABLE OF CONTENTS
newPage();
doc.fontSize(18).fillColor(C.greenDark).font("Helvetica-Bold").text("Table of Contents", ML, doc.y);
doc.moveTo(ML, doc.y + 4).lineTo(PW - MR, doc.y + 4).strokeColor(C.greenPale).lineWidth(1.5).stroke();
doc.y += 14;

const tocItems = [
  ["1", "Base URL & Environments"],
  ["2", "Authentication Methods"],
  ["3", "User Tiers & Roles"],
  ["4", "Users & Profiles API"],
  ["5", "Electronic Warehouse Receipts (eWRs)"],
  ["6", "Tea Lots, Auctions & Bidding"],
  ["7", "Factory Portal Integration"],
  ["8", "Broker Mandates"],
  ["9", "Financing & Lending"],
  ["10", "Forward Contracts"],
  ["11", "Settlements & Disbursement"],
  ["12", "Cooperative Endpoints"],
  ["13", "Admin, Statistics & Registry"],
  ["A", "Appendix — Enumerations & Error Codes"],
];

tocItems.forEach(([num, title], i) => {
  const ty = doc.y;
  doc.roundedRect(ML, ty, 24, 16, 2).fillColor(i < 13 ? C.greenDark : C.gray600).fill();
  doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold").text(num, ML, ty + 4, { width: 24, align: "center" });
  doc.fontSize(9.5).fillColor(C.gray700).font("Helvetica").text(title, ML + 30, ty + 3, { lineBreak: false });

  // Dotted leader line
  const tw = doc.widthOfString(title, { fontSize: 9.5 });
  const dotStart = ML + 30 + tw + 6;
  const dotEnd = PW - MR - 20;
  for (let dx = dotStart; dx < dotEnd; dx += 5) {
    doc.circle(dx, ty + 10, 0.8).fillColor(C.gray300).fill();
  }

  doc.y = ty + 20;
});

gap(14);
doc.fontSize(11).fillColor(C.greenDark).font("Helvetica-Bold").text("Integration Role Quick Reference");
gap(4);
table(
  ["Role / System", "Auth Method", "Primary Actions"],
  [
    ["Factory Portal", "X-Api-Key header", "Push TEA eWRs to the marketplace"],
    ["PRODUCER", "Clerk JWT", "View eWRs, self-list lots, request financing, forward contracts"],
    ["ENABLER (Broker)", "Clerk JWT", "Receive mandates, catalogue lots, submit auctions, settle trades"],
    ["OFF_TAKER", "Clerk JWT", "Browse market, place bids, buy fixed-price lots, sign forward contracts"],
    ["FINANCIER", "Clerk JWT", "Approve/disburse loans, view loan book, audit platform earnings"],
    ["COOPERATIVE", "Clerk JWT", "Aggregate member deliveries, request bulk eWRs, split eWRs"],
    ["ADMIN", "Clerk JWT", "Full platform access — auctions, users, settlements, earnings"],
    ["WRSC Registry", "eWRS JWT / HMAC", "Registry webhooks, lien sync, master reference data"],
  ],
  [120, 120, CW - 240]
);

// ══════════════════════════════════════════════════════════════ SECTION 1
newPage();
sectionHeader("1", "Base URL & Environments");

body("All API endpoints are served under the /api prefix relative to your deployment domain.");
gap(4);

// URL box
const urlCy = doc.y;
doc.rect(ML, urlCy, CW, 44).fillColor(C.greenDark).fill();
doc.fontSize(9).fillColor(C.teal).font("Courier")
   .text("Production:    https://<your-domain>/api", ML + 12, urlCy + 8)
   .text("Development:   https://<replit-dev-domain>/tea/api", ML + 12, urlCy + 24);
doc.y = urlCy + 52;

callout(
  "Path prefix in development: The marketplace is mounted at the /tea/ path in the Replit preview environment. External systems targeting production do not need this prefix.",
  "info"
);

heading2("Global Request Headers");
table(
  ["Header", "Value", "Required When"],
  [
    ["Authorization", "Bearer <clerk-jwt>", "All Clerk-authenticated endpoints"],
    ["X-Api-Key", "<factory-api-key>", "Factory service-to-service endpoints only"],
    ["Content-Type", "application/json", "All POST / PATCH requests"],
    ["Accept", "application/json", "Recommended on all requests"],
  ],
  [140, 160, CW - 300]
);

heading2("Error Response Envelope");
body("All errors return a JSON object. Successful responses return the resource directly (not wrapped).");
gap(3);
codeBlock(`{
  "error": "Human-readable message describing the failure",
  "issues": [ /* Zod validation issues array — present on 400 validation errors */ ]
}`);

// ══════════════════════════════════════════════════════════════ SECTION 2
newPage();
sectionHeader("2", "Authentication Methods");

heading2("2.1  Clerk JWT (Standard User Auth)");
body("The primary authentication mechanism for all human users. Obtain a session token via the Clerk SDK. Pass it as a Bearer token in the Authorization header on every request.");
gap(4);
table(
  ["Client Platform", "SDK / Method"],
  [
    ["Browser / SPA (React)", "@clerk/react — useAuth().getToken()"],
    ["Mobile (React Native)", "@clerk/expo SDK"],
    ["Server-to-server", "Clerk Backend API — create a machine token"],
    ["Postman / curl testing", "Copy session token from browser DevTools → Network tab"],
  ],
  [180, CW - 180]
);

callout(
  "Request the Clerk publishable key from your exchange operator. Keys are environment-specific. Never embed secret keys in client code. Token lifetimes are managed by Clerk automatically.",
  "info"
);

heading2("2.2  API Key Auth (Factory / Service-to-Service)");
body("Used exclusively by the factory portal. A shared secret is set as FACTORY_API_KEY on the API server and is passed in the X-Api-Key header. No Clerk account is required.");
gap(4);
codeBlock(`# Example — push an eWR from factory system
curl -X POST https://<domain>/api/factory/ewrs \\
  -H "X-Api-Key: YOUR_FACTORY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "factoryMark": "LIMURU_01", "ewrsReceiptId": "EWR-2026-00001", ... }'`);

callout(
  "Security: The /factory/ewrs endpoint is not mounted at all unless FACTORY_API_KEY is explicitly set on the server. Rotate the key immediately if compromised. All pushes share a single key per configured factory.",
  "warn"
);

heading2("2.3  eWRS Registry JWT");
body("Used by the Warehouse Receipt System Controller (WRSC) for registry webhooks and master data access. Requires WRSC_SECRET, EWR_JWT_SECRET, and EWR_OAUTH_CLIENTS to all be configured. This surface is completely disabled unless all three secrets are present. Contact the exchange operator to configure.");

// ══════════════════════════════════════════════════════════════ SECTION 3
newPage();
sectionHeader("3", "User Tiers & Roles");

body("Every registered user is assigned exactly one tier at account creation. The tier is immutable after registration (except via Admin override). All endpoints enforce tier-based access server-side — the UI is a convenience layer only.");
gap(6);

const tiers = [
  ["PRODUCER", "Tea estates, smallholder farmers, agricultural producers.", "Submit eWRs · Self-list lots (direct sales) · Request financing · Create forward contracts · Grant mandates to brokers", "Cannot place bids, create auctions, or disburse settlements."],
  ["ENABLER\n(Broker)", "Licensed tea brokers and intermediaries.", "Receive mandates · Catalogue lots · Submit lots to auctions · Accept below-reserve bids · Manage dispatch documents · Disburse settlement legs", "Cannot own eWRs or place bids as a buyer."],
  ["OFF_TAKER", "Tea buyers, blenders, packers, exporters.", "Browse spot market · Place auction bids · Purchase fixed-price lots · Sign forward contracts · Place spot orders", "Cannot list lots, create mandates, or access admin."],
  ["FINANCIER", "Banks, microfinance institutions, trade finance providers.", "View eligible eWRs · Approve / disburse loans · View full loan book · Access earnings & audit logs", "Cannot list lots, place bids, or create mandates."],
  ["COOPERATIVE", "Farmer cooperative societies and aggregators.", "Aggregate member deliveries into macro-lots · Request bulk eWRs · Split eWRs by member weight", "Trades through member producers, not directly."],
  ["ADMIN", "Exchange operators and platform staff.", "Full access — create auction sessions, manage users, override tiers, oversee all settlements, view platform earnings", "No restrictions — handle with care."],
];

tiers.forEach(([tier, who, can, cannot]) => {
  if (doc.y > PH - 130) { doc.addPage(); }
  const cy = doc.y;
  const bh = 70;
  doc.rect(ML, cy, CW, bh).fillColor(C.gray50).fill();
  doc.rect(ML, cy, CW, bh).strokeColor(C.gray200).lineWidth(0.4).stroke();
  doc.rect(ML, cy, 90, bh).fillColor(C.greenDark).fill();
  doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold").text(tier, ML + 5, cy + 8, { width: 80, align: "center", lineGap: 2 });
  doc.fontSize(7.5).fillColor("rgba(255,255,255,0.6)").font("Helvetica").text(who, ML + 5, cy + 28, { width: 80, align: "center", lineGap: 2 });

  doc.fontSize(7.5).fillColor(C.gray500).font("Helvetica-Bold").text("CAN DO", ML + 98, cy + 6, { lineBreak: false });
  doc.fontSize(8).fillColor(C.gray700).font("Helvetica").text(can, ML + 98, cy + 17, { width: CW - 110, lineGap: 1.5 });

  const th2 = doc.heightOfString(can, { width: CW - 110, fontSize: 8, lineGap: 1.5 });
  doc.fontSize(7.5).fillColor(C.gray500).font("Helvetica-Bold").text("RESTRICTIONS", ML + 98, cy + 17 + th2 + 3, { lineBreak: false });
  doc.fontSize(8).fillColor(C.gray500).font("Helvetica").text(cannot, ML + 98, cy + 17 + th2 + 13, { width: CW - 110, lineGap: 1 });

  doc.y = cy + bh + 5;
});

gap(8);
heading2("First-Time Registration Flow");
callout(
  "When a user signs in for the first time, the frontend calls GET /users/me. If no DB record exists, the user completes their profile via PATCH /users/me (name, company, tier). Tier selection is permanent — warn users before they confirm. After registration, the tier cannot be changed without Admin intervention.",
  "green"
);

// ══════════════════════════════════════════════════════════════ SECTION 4
newPage();
sectionHeader("4", "Users & Profiles API");

endpointHeader("GET", "/users/me", "Clerk JWT");
body("Returns the authenticated user's full profile. On first login for super-admin accounts, auto-creates the DB record by matching the Clerk email against the configured admin email. All other users must call PATCH /users/me first.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["Any authenticated"]);
gap(2);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("id, clerkId, name, company, phone, nationalId, tier, reputationScore, kybStatus, createdAt");
gap(6);

endpointHeader("PATCH", "/users/me", "Clerk JWT");
body("Updates the current user's profile. Tier can only be set once — if a tier is already recorded it is ignored in subsequent calls.");
gap(3);
table(
  ["Field", "Type", "Constraint"],
  [
    ["name", "string", "OPTIONAL"],
    ["company", "string", "OPTIONAL"],
    ["phone", "string", "OPTIONAL"],
    ["nationalId", "string", "OPTIONAL"],
    ["tier", "enum", "OPTIONAL — immutable after first set. Values: PRODUCER | ENABLER | OFF_TAKER | FINANCIER | COOPERATIVE"],
  ],
  [120, 80, CW - 200]
);

endpointHeader("GET", "/users/brokers", "Clerk JWT");
body("Returns all users with the ENABLER tier. Used by producers to populate the broker picker when granting mandates.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS  ");
body("Array of { id, name, company }");
gap(6);

endpointHeader("GET", "/users/:userId", "Clerk JWT");
body("Returns the public profile of any user by internal DB ID. Use for displaying counterparty information in trades.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS  ");
body("{ id, name, company, tier, reputationScore }");

// ══════════════════════════════════════════════════════════════ SECTION 5
newPage();
sectionHeader("5", "Electronic Warehouse Receipts (eWRs)");

callout(
  "eWR Lifecycle:  INGESTED → MARKET_LISTED → AUCTION_ACTIVE → SETTLED / EXTINGUISHED\n" +
  "Side states:    ENCUMBERED (active lien/loan)  ·  FORWARD_BOUND (pledged to a forward contract)\n" +
  "Terminal states: SETTLED and EXTINGUISHED cannot be listed, financed, or transferred.",
  "green"
);

endpointHeader("POST", "/ewrs", "Clerk JWT");
body("Intakes a new eWR through the marketplace UI. Validates commodity-specific grading standards (EAS moisture limits for grain, cold-chain requirements for avocado). For grain, assigns to an existing pool group or creates a new one.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER", "ENABLER"]);
gap(3);

table(
  ["Field", "Type", "Requirement", "Notes"],
  [
    ["commodityType", "enum", "REQUIRED", "MAIZE | RICE | COFFEE | TEA | AVOCADO"],
    ["ewrsReceiptId", "string", "REQUIRED", "Exchange-issued receipt number — must be unique"],
    ["warehouseCode", "string", "REQUIRED", "WRSC-assigned facility code"],
    ["weightMt", "number", "REQUIRED", "Weight in metric tonnes"],
    ["grade", "string", "REQUIRED", "Commodity grade e.g. BOP (tea), Grade 1 (maize)"],
    ["harvestSeason", "string", "REQUIRED", "e.g. '2026A'"],
    ["estimatedValueUsd", "number", "OPTIONAL", ""],
    ["teaProcessingType", "string", "TEA only", "CTC | Orthodox"],
    ["teaLeafGrade", "string", "TEA only", "BOP | BOPF | PF | BP | D | F"],
    ["teaInvoiceSerial", "string", "TEA only", "Factory invoice serial number"],
  ],
  [140, 70, 80, CW - 290]
);
table(
  ["Status", "Error Condition"],
  [
    ["422", "Grading standards not met (moisture / cold-chain)"],
    ["409", "Duplicate ewrsReceiptId"],
    ["403", "Caller tier cannot submit eWRs"],
  ],
  [60, CW - 60]
);

gap(6);
endpointHeader("GET", "/ewrs/my-portfolio", "Clerk JWT");
body("Returns all eWRs owned by the caller, enriched with active lien/loan status, portfolio total value, and counts by state and commodity type.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("{ ewrs[], totalValueUsd, stateCounts{}, commodityCounts{} }");
gap(6);

endpointHeader("GET", "/ewrs/broker-available", "Clerk JWT");
body("Returns TEA eWRs in INGESTED state owned by producers who have granted the calling broker an active mandate. Used to populate the eWR picker when a broker creates a new lot.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER"]);
gap(6);

endpointHeader("POST", "/ewrs/:ewrId/split", "Clerk JWT");
body("Splits one eWR into two by weight. The original is extinguished; two child eWRs are minted. eWR must have no active lien and be in INGESTED or MARKET_LISTED state.");
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [["splitWeightMt", "number", "REQUIRED — weight assigned to child A; remainder forms child B"]],
  [130, 70, CW - 200]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS  ");
body("{ original, childA, childB } — all three eWR objects");
gap(6);

endpointHeader("POST", "/ewrs/:ewrId/transfer", "Clerk JWT");
body("Transfers eWR ownership to another registered user. No active lien may exist. For OTC title transfers outside the auction/order flow.");
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [["toUserId", "integer", "REQUIRED — target user's internal DB ID"]],
  [130, 70, CW - 200]
);

gap(6);
endpointHeader("POST", "/ewrs/:ewrId/retire", "Clerk JWT");
body("Permanently extinguishes an eWR (state → EXTINGUISHED). Used when goods are consumed, destroyed, or removed from the warehouse system. Irreversible — no active lien may exist.");

// ══════════════════════════════════════════════════════════════ SECTION 6
newPage();
sectionHeader("6", "Tea Lots, Auctions & Bidding");

callout(
  "Lot Status Flow:  DRAFT → CATALOGUED → DISPATCHED → LIVE → SOLD\n" +
  "Also:  DRAFT → CATALOGUED → SOLD (fixed-price, no auction needed)\n" +
  "Terminal:  SOLD · UNSOLD · WITHDRAWN · RESERVE_NOT_MET\n" +
  "Creating a lot from an eWR immediately advances the eWR from INGESTED → MARKET_LISTED.",
  "green"
);

heading2("6.1  Tea Lot Management");

endpointHeader("POST", "/tea/lots", "Clerk JWT");
body("Creates a tea lot catalogue entry (status DRAFT). Brokers (ENABLER) require an active mandate from the eWR owner. Producers (PRODUCER) self-list their own eWRs with zero commission — no mandate needed. The source eWR must be INGESTED. Only one active (non-WITHDRAWN) lot may exist per eWR.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "PRODUCER"]);
gap(3);

table(
  ["Field", "Type", "Requirement", "Notes"],
  [
    ["ewrId", "integer", "REQUIRED", "Source eWR — must be INGESTED, no existing active lot"],
    ["grade", "string", "REQUIRED", "e.g. 'BOP'"],
    ["gradeMark", "string", "REQUIRED", "Estate / factory mark"],
    ["giOrigin", "string", "REQUIRED", "e.g. 'Kenya'"],
    ["grossWeightKg", "number", "REQUIRED", ""],
    ["netWeightKg", "number", "REQUIRED", ""],
    ["tareWeightKg", "number", "REQUIRED", ""],
    ["packageType", "string", "REQUIRED", "e.g. 'Paper Sack'"],
    ["listingType", "enum", "REQUIRED", "AUCTION | FIXED_PRICE"],
    ["reservePriceUsd", "number", "If AUCTION", "Price per kg — reserve floor"],
    ["fixedPricePerKgUsd", "number", "If FIXED_PRICE", "Price per kg — fixed sale price"],
    ["certifications", "string[]", "OPTIONAL", "Default: []"],
    ["tasterRemarks", "string", "OPTIONAL", ""],
    ["commissionRate", "decimal 0–1", "OPTIONAL", "Default 0.01 (1%). Force-set to 0 for PRODUCER self-listings"],
    ["bidSecurityPct", "decimal 0–1", "OPTIONAL", "Default 0.10 (10% bid security hold)"],
  ],
  [140, 80, 80, CW - 300]
);

table(
  ["Status", "Error Condition"],
  [
    ["403", "Broker has no active mandate from eWR owner / Producer does not own the eWR"],
    ["409", "eWR not in INGESTED state or active lot already exists for this eWR"],
  ],
  [60, CW - 60]
);

gap(6);
endpointHeader("GET", "/tea/lots", "Clerk JWT");
body("Filterable catalogue of all tea lots. Returns all columns plus warehouseCode (from the linked eWR) on each row.");
gap(3);
table(
  ["Query Param", "Values", "Notes"],
  [
    ["grade", "string", "Exact match"],
    ["giOrigin", "string", "Exact match"],
    ["listingType", "AUCTION | FIXED_PRICE", ""],
    ["status", "DRAFT | CATALOGUED | DISPATCHED | LIVE | SOLD | UNSOLD | WITHDRAWN | RESERVE_NOT_MET", ""],
    ["brokerId", "integer", "Filter by broker user ID"],
    ["ownerId", "integer", "Filter by producer user ID"],
    ["certification", "string", "JSONB array contains check"],
  ],
  [130, 200, CW - 330]
);

newPage();
endpointHeader("GET", "/tea/lots/:id", "Clerk JWT");
body("Full lot detail including enriched eWR data (processing type, leaf grade, harvest season, warehouse code), owner/broker names, and best-effort warehouse operator profile lookup (matched on WRSC licence number).");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("lot + warehouseCode + warehouseProfile? + ownerName + brokerName + ewr (sub-object)");
gap(6);

endpointHeader("PATCH", "/tea/lots/:id", "Clerk JWT");
body("Updates a DRAFT or CATALOGUED lot. Any PATCH on a DRAFT lot automatically advances it to CATALOGUED (published). Commission rate is locked at 0 for direct (producer self-listed) lots — the server enforces this regardless of what is sent. Only the mandate broker or eWR owner may call this.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "PRODUCER"]);
gap(3);
table(
  ["Status", "Error Condition"],
  [
    ["400", "Lot status is not DRAFT or CATALOGUED"],
    ["403", "Caller is neither the mandate broker nor the eWR owner"],
  ],
  [60, CW - 60]
);
gap(6);

endpointHeader("POST", "/tea/lots/:id/dispatch", "Clerk JWT");
body("Attaches a dispatch document. Attaching PRE_AUCTION_DISPATCH to a CATALOGUED lot auto-advances it to DISPATCHED. DELIVERY_ORDER can only be attached after the lot is SOLD.");
gap(3);
table(
  ["Body Field", "Values", "Notes"],
  [
    ["docType", "PRE_AUCTION_DISPATCH | WEIGHMENT_REPORT | DELIVERY_ORDER", "REQUIRED"],
    ["docData", "object", "OPTIONAL — arbitrary fields, e.g. { fileUrl: '...' }"],
  ],
  [130, 200, CW - 330]
);

heading2("6.2  Auction Sessions");

endpointHeader("POST", "/tea/auctions", "Clerk JWT");
body("Creates a SCHEDULED auction session. Brokers then assign lots before the session goes live.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN"]);
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("BODY");
body("auctionDate (string, YYYY-MM-DD)  REQUIRED");
gap(6);

endpointHeader("POST", "/tea/auctions/:id/lots", "Clerk JWT");
body("Assigns CATALOGUED or DISPATCHED lots to a SCHEDULED session. The broker must be the mandate holder for each lot submitted.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "ADMIN"]);
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("BODY");
body("lotIds: integer[]  REQUIRED");
gap(6);

endpointHeader("POST", "/tea/auctions/:id/start", "Clerk JWT");
body("Starts the auction. Session → LIVE, first lot countdown begins. Requires at least one lot assigned.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN"]);
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("BODY");
body("durationMins: integer (1–120, default 7)  OPTIONAL");
gap(6);

heading2("6.3  Bidding");

endpointHeader("POST", "/tea/lots/:id/bids", "Clerk JWT");
body("Places a bid on a LIVE lot. Enforces minimum bid increments (tick rules). Anti-snipe logic: bids within the configured window (default 3 min) extend the timer. A bid security hold is recorded for the bidder (default 10% of bid value × net weight).");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["OFF_TAKER"]);
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("BODY");
body("amountUsd: number  REQUIRED — bid price per kg");
gap(3);
table(
  ["Status", "Error Condition"],
  [
    ["400", "Bid is below minimum tick increment"],
    ["400", "Auction countdown has ended"],
    ["403", "eWR owner cannot bid on their own lot"],
  ],
  [60, CW - 60]
);
gap(6);

endpointHeader("POST", "/tea/lots/:id/accept-below-reserve", "Clerk JWT");
body("Accepts the highest bid on a RESERVE_NOT_MET lot. Triggers eWR ownership transfer and settlement record creation.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "ADMIN"]);
gap(6);

endpointHeader("GET", "/tea/lots/:id/settlement", "Clerk JWT");
body("Returns the settlement breakdown for a specific lot. Restricted to parties in the trade and exchange admin.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN"]);
body("+ lot owner, mandate broker, and winning bidder");

// ══════════════════════════════════════════════════════════════ SECTION 7
newPage();
sectionHeader("7", "Factory Portal Integration");

callout(
  "Service-to-service integration — no Clerk account required. Configure FACTORY_API_KEY on the API server and share the same value with the factory system. The route is not mounted until this variable is set. The producer must register on the marketplace and set their factory mark in their profile before any push will succeed.",
  "warn"
);

heading2("How the factory push flow works");
const steps = [
  "Producer registers on the marketplace and sets their factory mark (a unique string, e.g. \"LIMURU_01\") in their profile settings.",
  "Factory system is configured with the shared FACTORY_API_KEY and the marketplace base URL.",
  "After each batch is weighed and graded, the factory system calls POST /factory/ewrs.",
  "The API looks up the producer by factory mark, mints the eWR in INGESTED state, and associates it with the producer's account.",
  "The producer sees the new eWR in their dashboard and can immediately self-list it as a direct sale.",
];
steps.forEach((s, i) => {
  const cy = doc.y;
  doc.circle(ML + 10, cy + 6, 9).fillColor(C.greenDark).fill();
  doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold").text(String(i + 1), ML + 1, cy + 3, { width: 18, align: "center" });
  doc.fontSize(9).fillColor(C.gray700).font("Helvetica").text(s, ML + 26, cy + 1, { width: CW - 30 });
  doc.y = Math.max(doc.y, cy + 20);
});
gap(8);

endpointHeader("POST", "/factory/ewrs", "X-Api-Key");
body("Ingests a TEA eWR from an external factory portal. The factoryMark is matched against producer_profiles.factory_marks. Idempotent on ewrsReceiptId — re-submitting an existing receipt ID returns the stored record without creating a duplicate.");
gap(3);

table(
  ["Body Field", "Type", "Requirement", "Notes"],
  [
    ["factoryMark", "string", "REQUIRED", "Must match a registered producer profile"],
    ["ewrsReceiptId", "string", "REQUIRED", "Exchange receipt number — unique"],
    ["warehouseCode", "string", "REQUIRED", "WRSC-assigned facility code"],
    ["weightMt", "number", "REQUIRED", "Weight in metric tonnes"],
    ["grade", "string", "REQUIRED", "e.g. 'BOP'"],
    ["harvestSeason", "string", "REQUIRED", "e.g. '2026A'"],
    ["teaProcessingType", "string", "OPTIONAL", "CTC | Orthodox"],
    ["teaLeafGrade", "string", "OPTIONAL", "BOP | BOPF | PF | BP | D | F"],
    ["teaInvoiceSerial", "string", "OPTIONAL", "Factory invoice serial"],
    ["estimatedValueUsd", "number", "OPTIONAL", "Estimated market value in USD"],
  ],
  [140, 70, 80, CW - 290]
);

table(
  ["Status", "Condition"],
  [
    ["401", "Missing or invalid X-Api-Key header"],
    ["404", "No producer profile found with this factoryMark"],
    ["409", "Duplicate ewrsReceiptId — existing record returned, no duplicate created"],
  ],
  [60, CW - 60]
);

gap(6);
heading2("Request & Response Example");
codeBlock(`POST /api/factory/ewrs
X-Api-Key: sk_factory_live_xxxxxxxxxxxxxxxx

{
  "factoryMark":        "LIMURU_01",
  "ewrsReceiptId":      "EWR-TEA-2026-00847",
  "warehouseCode":      "WRSC-KE-NBI-014",
  "weightMt":           2.450,
  "grade":              "BOP",
  "harvestSeason":      "2026A",
  "teaProcessingType":  "CTC",
  "teaLeafGrade":       "BOPF",
  "teaInvoiceSerial":   "INV-2026-0221",
  "estimatedValueUsd":  3200
}`);

body("201 Created response:");
codeBlock(`{
  "id":              147,
  "ewrsReceiptId":   "EWR-TEA-2026-00847",
  "ownerId":         23,
  "commodityType":   "TEA",
  "state":           "INGESTED",
  "warehouseCode":   "WRSC-KE-NBI-014",
  "weightMt":        "2.450",
  "grade":           "BOP",
  "harvestSeason":   "2026A",
  "createdAt":       "2026-07-26T08:15:00.000Z"
}`);

// ══════════════════════════════════════════════════════════════ SECTION 8
newPage();
sectionHeader("8", "Broker Mandates");

body("A mandate is formal permission granted by a commodity owner (PRODUCER or COOPERATIVE) to a broker (ENABLER) to act on their behalf for a specific commodity type. Brokers cannot catalogue lots without an active mandate from the eWR owner.");
gap(4);
callout("Only one active mandate per producer–broker–commodity combination may exist at a time. Attempting to create a duplicate returns HTTP 409.", "warn");

endpointHeader("POST", "/broker-mandates", "Clerk JWT");
body("Grants a mandate. The caller is the mandate owner. Commission rate override is stored as a decimal ratio (e.g. 0.05 = 5%) and applied automatically when the broker creates lots for this producer.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER", "COOPERATIVE"]);
gap(3);
table(
  ["Field", "Type", "Requirement", "Notes"],
  [
    ["brokerId", "integer", "REQUIRED", "ENABLER user ID — use GET /users/brokers to list"],
    ["commodityType", "enum", "REQUIRED", "MAIZE | RICE | COFFEE | TEA | AVOCADO"],
    ["commissionRateOverride", "decimal 0–1", "OPTIONAL", "e.g. 0.03 for 3%"],
    ["permissions", "string[]", "OPTIONAL", "Defaults to full set: list, accept_bids, negotiate, set_reserve"],
    ["validFrom", "ISO8601", "OPTIONAL", "Mandate start date"],
    ["validTo", "ISO8601", "OPTIONAL", "Mandate end date — open-ended if omitted"],
  ],
  [150, 80, 80, CW - 310]
);
table(
  ["Status", "Error Condition"],
  [
    ["403", "Caller is not PRODUCER or COOPERATIVE"],
    ["404", "Broker user not found"],
    ["409", "Active mandate already exists for this producer–broker–commodity combination"],
  ],
  [60, CW - 60]
);
gap(6);

endpointHeader("GET", "/broker-mandates/my", "Clerk JWT");
body("Returns all mandates granted to the calling broker. Includes ownerName and active status.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER"]);
gap(6);

endpointHeader("GET", "/broker-mandates/given", "Clerk JWT");
body("Returns all mandates granted by the calling producer or cooperative. Includes brokerName for display.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER", "COOPERATIVE"]);
gap(6);

endpointHeader("DELETE", "/broker-mandates/:id", "Clerk JWT");
body("Revokes an active mandate (sets revoked = true). The broker can no longer create lots for this producer for this commodity. Existing lots created under this mandate are unaffected.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
body("Mandate owner (PRODUCER / COOPERATIVE)");
gap(3);
table(
  ["Status", "Error Condition"],
  [
    ["403", "Caller is not the mandate owner"],
    ["400", "Mandate is already revoked"],
  ],
  [60, CW - 60]
);

// ══════════════════════════════════════════════════════════════ SECTION 9
newPage();
sectionHeader("9", "Financing & Lending");

body("Producers pledge unencumbered eWRs as collateral to request warehouse-receipt financing. Financiers review, approve, and disburse loans. The eWR is locked (ENCUMBERED) for the loan duration and released upon settlement.");
gap(4);
callout(
  "Eligibility:  eWR must be in INGESTED or MARKET_LISTED state with no active lien (isLienActive = false).\n" +
  "Max loan-to-value: 60% of estimated value  ·  Default interest rate: 12% per annum",
  "green"
);

endpointHeader("GET", "/financing/eligible-ewrs", "Clerk JWT");
body("Returns eWRs eligible for financing. Producers see only their own. Financiers see all eligible eWRs platform-wide. Each item includes lMaxUsd (max loan = 60% of estimated value) and the default interest rate.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER", "FINANCIER", "ENABLER"]);
gap(6);

endpointHeader("POST", "/financing", "Clerk JWT");
body("Creates a PENDING financing request against an eligible eWR. Only one active request per eWR may exist at a time.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER"]);
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [
    ["ewrId", "integer", "REQUIRED — must be eligible"],
    ["notes", "string", "OPTIONAL"],
  ],
  [130, 70, CW - 200]
);
table(
  ["Status", "Error Condition"],
  [
    ["409", "Active financing request already exists for this eWR"],
    ["400", "eWR state is ineligible (already encumbered or terminal)"],
  ],
  [60, CW - 60]
);
gap(6);

endpointHeader("GET", "/financing/:requestId", "Clerk JWT");
body("Returns request details enriched with eWR metadata and linked loan data.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER", "FINANCIER", "ENABLER"]);
gap(6);

endpointHeader("PATCH", "/financing/:requestId/approve", "Clerk JWT");
body("Approves a PENDING request. Sets eWR → ENCUMBERED, activates lien (isLienActive = true, lienHolderId = financier), creates a loan record, and simulates a WRSC lien lock.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["FINANCIER"]);
gap(6);

endpointHeader("PATCH", "/financing/:requestId/disburse", "Clerk JWT");
body("Confirms loan funds have been sent to the producer's bank account. Status → DISBURSED. Simulates bank transfer and registry capital ingress recording.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["FINANCIER"]);
gap(6);

endpointHeader("PATCH", "/financing/:requestId/reject", "Clerk JWT");
body("Rejects a PENDING financing request. Status → REJECTED. eWR remains unencumbered.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["FINANCIER"]);
gap(6);

endpointHeader("GET", "/financing/loan-book", "Clerk JWT");
body("Returns all active loans with live accrual calculations: accruedInterestUsd and totalRepayableUsd based on days elapsed since disbursement.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["FINANCIER", "ENABLER"]);

// ══════════════════════════════════════════════════════════════ SECTION 10
newPage();
sectionHeader("10", "Forward Contracts");

body("Forward contracts allow producers to lock in a future delivery price with a buyer before harvest or processing is complete. A 15% performance bond is required from both parties. The eWR is pledged (FORWARD_BOUND) for the contract duration.");
gap(6);

endpointHeader("POST", "/forwards", "Clerk JWT");
body("Creates a PENDING_SIGNATURE contract. The producer pledges an eWR and sets delivery price and maturity date. Status remains PENDING_SIGNATURE until the buyer co-signs.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["PRODUCER"]);
gap(3);
table(
  ["Body Field", "Type", "Requirement", "Notes"],
  [
    ["ewrId", "integer", "REQUIRED", "Must be INGESTED or MARKET_LISTED"],
    ["maturityDate", "ISO8601", "REQUIRED", "Must be in the future"],
    ["deliveryPriceUsd", "number", "REQUIRED", "Total contract delivery value"],
  ],
  [140, 70, 80, CW - 290]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("Contract object including performanceBondUsd (15% of deliveryPriceUsd)");
gap(6);

endpointHeader("GET", "/forwards", "Clerk JWT");
body("Lists forward contracts. Filterable by status, sellerId, buyerId.");
gap(3);
table(
  ["Query Param", "Type", "Notes"],
  [
    ["status", "string", "PENDING_SIGNATURE | ACTIVE | MATURED | DEFAULTED"],
    ["sellerId", "integer", "Filter by producer"],
    ["buyerId", "integer", "Filter by off-taker"],
  ],
  [120, 100, CW - 220]
);
gap(6);

endpointHeader("POST", "/forwards/:contractId/co-sign", "Clerk JWT");
body("Buyer co-signs the contract. Status → ACTIVE. eWR → ENCUMBERED (lien to buyer). Performance bonds for both parties activated. eWR cannot be financed, traded, or transferred while active.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["OFF_TAKER"]);
gap(6);

endpointHeader("POST", "/forwards/:contractId/complete", "Clerk JWT");
body("Triggers maturity resolution if the maturity date has passed. Status → MATURED. Performance bonds released. eWR remains ENCUMBERED pending full settlement.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "PRODUCER", "OFF_TAKER"]);
gap(6);

endpointHeader("POST", "/forwards/:contractId/resolve-default", "Clerk JWT");
body("Declares a default. The defaulting party forfeits their performance bond and loses 10 reputation points. Status → DEFAULTED. eWR released back to INGESTED.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER"]);
body("+ SELLER (if declaring buyer default) or BUYER (if declaring seller default)");
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [["defaultSide", "enum", "REQUIRED — BUYER | SELLER"]],
  [130, 70, CW - 200]
);

// ══════════════════════════════════════════════════════════════ SECTION 11
newPage();
sectionHeader("11", "Settlements & Disbursement");

body("The settlement engine handles the financial close-out for all trade types: auction lots, fixed-price orders, and forward contracts. It calculates platform fees, manages lien repayment, and orchestrates sequential payment leg disbursement.");
gap(4);
callout(
  "Fee structure:\n" +
  "  Platform fee:         2% of gross trade value (all trade types)\n" +
  "  Escrow fee:           0.5% on spot orders\n" +
  "  Financing facilitation: 0.5% of interest charged\n\n" +
  "Disbursement order: Bank leg (if lien active) → Platform leg → Producer leg\n" +
  "Completing the final leg transfers eWR title to the buyer and issues a signed Digital Release Token.",
  "green"
);

endpointHeader("POST", "/settlements", "Clerk JWT");
body("Initiates settlement for a completed trade. Calculates all financial legs: platform fee (2%), bank repayment (from linked loan if lien active), and producer net payout. Sum of all legs equals gross trade value.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "FINANCIER", "ADMIN"]);
body("+ transaction parties (seller / buyer)");
gap(3);
table(
  ["Body Field", "Type", "Requirement", "Notes"],
  [
    ["entityType", "enum", "REQUIRED", "ORDER | AUCTION | FORWARD"],
    ["entityId", "integer", "REQUIRED", "ID of the order, lot, or forward contract"],
    ["loanId", "integer", "OPTIONAL", "Linked loan for mandatory lien repayment"],
    ["notes", "string", "OPTIONAL", ""],
  ],
  [130, 70, 80, CW - 280]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("Settlement object with: bankLegUsd, platformFeeUsd, producerNetUsd, grossValueUsd, status");
gap(3);
table(
  ["Status", "Error Condition"],
  [
    ["409", "Settlement already exists for this entity"],
    ["400", "Loan/eWR mismatch"],
  ],
  [60, CW - 60]
);
gap(6);

endpointHeader("GET", "/settlements/:settlementId", "Clerk JWT");
body("Returns settlement status, calculated legs, linked loan details, and release token if settlement is complete. Restricted to involved parties and exchange admin.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN", "FINANCIER"]);
body("+ lot owner, mandate broker, and buyer");
gap(6);

endpointHeader("POST", "/settlements/:settlementId/disburse", "Clerk JWT");
body("Confirms disbursement of a specific payment leg. Must follow the sequence: bank → platform → producer. Attempting to disburse out of order returns an error. On final leg completion, eWR ownership transfers to the buyer and a signed Digital Release Token is included in the response.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ENABLER", "FINANCIER", "ADMIN"]);
gap(3);
table(
  ["Body Field", "Values", "Notes"],
  [["leg", "bank | platform | producer", "REQUIRED — must be disbursed in order"]],
  [100, 140, CW - 240]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("Updated settlement. On final leg: releaseToken (HMAC-signed) included in response body.");

// ══════════════════════════════════════════════════════════════ SECTION 12
newPage();
sectionHeader("12", "Cooperative Endpoints");

body("Cooperatives aggregate member deliveries into macro-lots before minting a single bulk eWR. This allows smallholder farmers to pool their output while the cooperative manages the logistics.");
gap(6);

const coopEndpoints = [
  ["GET",  "/cooperatives/me",                           "Returns the caller's cooperative profile and member list."],
  ["POST", "/cooperatives/me/macro-lots",                "Creates a macro-lot. Groups member deliveries by grade and harvest season."],
  ["POST", "/cooperatives/me/macro-lots/:id/finalise",   "Closes a macro-lot to new intake entries. Required before requesting an eWR."],
  ["POST", "/cooperatives/me/macro-lots/:id/request-ewr","Mints a fungible eWR for a finalised macro-lot. Body requires: warehouseCode (string)."],
];
coopEndpoints.forEach(([method, path, desc]) => {
  endpointHeader(method, path, "Clerk JWT");
  body(desc);
  gap(4);
});

heading2("eWR Split (used by cooperatives to divide lots by member)");
endpointHeader("POST", "/ewrs/:ewrId/split", "Clerk JWT");
body("Splits a cooperative macro-lot eWR into two by weight — one for each member allocation. The original eWR is extinguished and two child eWRs are created. No active lien may exist.");
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [["splitWeightMt", "number", "REQUIRED — weight of child A; remainder forms child B"]],
  [130, 70, CW - 200]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("{ original, childA, childB } — three eWR objects");

// ══════════════════════════════════════════════════════════════ SECTION 13
newPage();
sectionHeader("13", "Admin, Statistics & Registry");

heading2("13.1  Administration");

endpointHeader("GET", "/admin/users", "Clerk JWT");
body("Lists and searches all registered users. Supports name / email / company filtering. Used for KYB management and tier overrides.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN", "ENABLER", "FINANCIER"]);
gap(3);
table(
  ["Query Param", "Notes"],
  [
    ["search", "Name / email / company substring search"],
    ["tier", "Filter by tier value"],
    ["kybStatus", "PENDING | APPROVED | REJECTED"],
  ],
  [120, CW - 120]
);
gap(6);

endpointHeader("PATCH", "/admin/users/:id", "Clerk JWT");
body("Updates a user's tier or KYB status. The only pathway to change a user's tier after registration. KYB status controls whether a user can transact at higher values.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN"]);
gap(3);
table(
  ["Body Field", "Values", "Notes"],
  [
    ["tier", "enum", "OPTIONAL — any valid tier"],
    ["kybStatus", "PENDING | APPROVED | REJECTED", "OPTIONAL"],
  ],
  [120, 160, CW - 280]
);
gap(6);

endpointHeader("GET", "/admin/earnings", "Clerk JWT");
body("Platform earnings summary: total platform fees (2% of trade value), escrow fees (0.5% on orders), financing facilitation fees (0.5% of interest charged).");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN", "ENABLER", "FINANCIER"]);
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("{ platformFeesUsd, escrowFeesUsd, financingFacilitationUsd, totalUsd }");
gap(6);

endpointHeader("GET", "/audit", "Clerk JWT");
body("Returns audit log entries. All significant state changes produce audit entries. Filterable by entity type and entity ID.");
gap(3);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("ROLES");
roleBadges(["ADMIN", "ENABLER", "FINANCIER"]);
gap(6);

heading2("13.2  Market Statistics");

table(
  ["Endpoint", "Returns"],
  [
    ["GET /stats/market-summary", "Total value locked, trade volume, active lot and user counts"],
    ["GET /stats/commodity-breakdown", "eWR and volume stats grouped by commodity type"],
    ["GET /stats/recent-activity", "Feed of recent orders and settlements"],
    ["GET /stats/market-risk", "Caller's active liens and pending settlement totals"],
    ["GET /stats/warehouse-distribution", "Inventory counts and values grouped by warehouse code"],
    ["GET /stats/price-trends", "Clearing prices from historical auction lots"],
  ],
  [200, CW - 200]
);
gap(6);

heading2("13.3  WRSC Registry Integration");
callout(
  "Restricted surface — only mounted when WRSC_SECRET, EWR_JWT_SECRET, and EWR_OAUTH_CLIENTS are all configured. The WRSC team coordinates configuration directly with the exchange operator.",
  "warn"
);
table(
  ["Endpoint", "Auth", "Purpose"],
  [
    ["GET /ewr/master/counties", "eWRS JWT", "Reference list of counties for intake forms"],
    ["GET /ewr/master/commodity-types", "eWRS JWT", "Supported commodity types and grading standards"],
    ["GET /ewr/master/harvest-seasons", "eWRS JWT", "Active and historical harvest seasons"],
    ["POST /webhooks/registry-sync", "HMAC signature", "Inbound lien status updates and title transfer confirmations from the WRSC"],
  ],
  [200, 90, CW - 290]
);

heading2("13.4  File Storage");
endpointHeader("POST", "/storage/uploads/request-url", "Clerk JWT");
body("Returns a presigned upload URL for object storage. Use for dispatch documents, warehouse reports, or any file attachment.");
gap(3);
table(
  ["Body Field", "Type", "Notes"],
  [
    ["name", "string", "REQUIRED — filename"],
    ["size", "integer", "REQUIRED — file size in bytes"],
    ["contentType", "string", "REQUIRED — MIME type e.g. application/pdf"],
  ],
  [130, 70, CW - 200]
);
doc.fontSize(8).fillColor(C.gray500).font("Helvetica-Bold").text("RETURNS");
body("{ uploadUrl, objectPath } — PUT the file binary directly to uploadUrl, then store objectPath in docData");

// ══════════════════════════════════════════════════════════════ APPENDIX
newPage();
sectionHeader("A", "Appendix — Enumerations & Error Codes");

heading2("eWR States");
table(
  ["Value", "Meaning", "Terminal?"],
  [
    ["INGESTED", "Freshly minted; available for listing or financing", "No"],
    ["MARKET_LISTED", "An active lot exists against this eWR", "No"],
    ["AUCTION_ACTIVE", "Currently live in an auction session", "No"],
    ["ENCUMBERED", "Active lien (loan or forward contract)", "No"],
    ["FORWARD_BOUND", "Pledged to a forward contract pre-co-sign", "No"],
    ["SETTLED", "Title transferred to buyer", "YES"],
    ["EXTINGUISHED", "Physically retired / destroyed", "YES"],
  ],
  [150, CW - 210, 60]
);

heading2("Lot Statuses");
table(
  ["Value", "Meaning"],
  [
    ["DRAFT", "Created; not yet published to the catalogue"],
    ["CATALOGUED", "Published — visible in the marketplace catalogue"],
    ["DISPATCHED", "Pre-auction dispatch document attached"],
    ["LIVE", "Active in an auction session — bidding open"],
    ["SOLD", "Winning bid accepted or fixed-price purchased"],
    ["UNSOLD", "Auction closed with no bids placed"],
    ["RESERVE_NOT_MET", "Bids were placed but none reached the reserve"],
    ["WITHDRAWN", "Manually removed from the market"],
  ],
  [180, CW - 180]
);

heading2("Commodity Types");
table(
  ["Value", "Grading Standard / Notes"],
  [
    ["TEA", "Supported via factory push (POST /factory/ewrs) and direct UI intake"],
    ["MAIZE", "EAS 40 — moisture content < 13.5%"],
    ["RICE", "EAS 5 — moisture content < 14.5%"],
    ["COFFEE", "Moisture content < 12.5%"],
    ["AVOCADO", "Cold-chain requirements enforced; time-decay tracking enabled"],
  ],
  [120, CW - 120]
);

heading2("HTTP Status Codes");
table(
  ["Code", "Meaning"],
  [
    ["200", "OK — resource returned"],
    ["201", "Created — new resource created successfully"],
    ["400", "Bad Request — validation error in body (see issues[] array)"],
    ["401", "Unauthenticated — missing or invalid Bearer / API key"],
    ["403", "Forbidden — authenticated but insufficient tier or role"],
    ["404", "Not Found — resource does not exist"],
    ["409", "Conflict — duplicate resource or invalid state transition"],
    ["422", "Unprocessable Entity — grading / cold-chain standard not met"],
    ["500", "Internal Server Error — contact exchange operator"],
  ],
  [60, CW - 60]
);

heading2("Listing Types");
table(
  ["Value", "Required Pricing Field", "Settlement Path"],
  [
    ["AUCTION", "reservePriceUsd (per kg)", "Winning bid → accept → settle → disburse"],
    ["FIXED_PRICE", "fixedPricePerKgUsd (per kg)", "POST /orders → settlement → disburse"],
  ],
  [120, 180, CW - 300]
);

// Final rule and footer note
gap(16);
sectionRule(C.gray200);
gap(6);
doc.fontSize(8).fillColor(C.gray400).font("Helvetica")
   .text(
     "TokenHarvest Tea Marketplace — API Integration Reference Guide  v1.0  ·  July 2026\n" +
     "© 2026 TokenHarvest Exchange Limited. Confidential — Partners Only.\n" +
     "For technical support, integration questions, or API key provisioning contact: exchange@tokenharvest.io",
     ML, doc.y, { align: "center", width: CW, lineGap: 2 }
   );

// Finalise
doc.end();
console.log("PDF written to:", OUT);
