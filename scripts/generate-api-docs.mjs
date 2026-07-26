import { writeFileSync } from "fs";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>TokenHarvest Tea Marketplace — API Integration Guide</title>
<style>
  /* ── Reset & base ─────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green-dark:  #0a2a1e;
    --green-mid:   #14532d;
    --green-light: #166534;
    --green-pale:  #dcfce7;
    --green-faint: #f0fdf4;
    --teal:        #0d9488;
    --teal-pale:   #ccfbf1;
    --amber:       #d97706;
    --amber-pale:  #fef3c7;
    --red:         #dc2626;
    --red-pale:    #fee2e2;
    --blue:        #2563eb;
    --blue-pale:   #dbeafe;
    --gray-50:     #f9fafb;
    --gray-100:    #f3f4f6;
    --gray-200:    #e5e7eb;
    --gray-300:    #d1d5db;
    --gray-400:    #9ca3af;
    --gray-500:    #6b7280;
    --gray-600:    #4b5563;
    --gray-700:    #374151;
    --gray-900:    #111827;
    --font-sans:   'Segoe UI', system-ui, -apple-system, sans-serif;
    --font-mono:   'Consolas', 'Cascadia Code', 'SF Mono', monospace;
  }

  html { font-size: 10.5pt; }
  body {
    font-family: var(--font-sans);
    color: var(--gray-900);
    line-height: 1.55;
    background: #fff;
  }

  /* ── Print setup ──────────────────────────────────────── */
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-center {
      content: "TokenHarvest Tea Marketplace — API Integration Guide   |   Page " counter(page) " of " counter(pages);
      font-size: 7.5pt;
      color: #9ca3af;
      font-family: var(--font-sans);
    }
  }
  @page :first { margin-top: 0; @bottom-center { content: none; } }

  .page-break       { break-before: page; }
  .no-break         { break-inside: avoid; }
  .keep-with-next   { break-after: avoid; }

  /* ── Cover page ───────────────────────────────────────── */
  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(155deg, var(--green-dark) 0%, #0f3d26 55%, #1a5c35 100%);
    color: white;
    padding: 64px 56px 48px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: rgba(255,255,255,.035);
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: -60px; left: -60px;
    width: 320px; height: 320px;
    border-radius: 50%;
    background: rgba(255,255,255,.025);
  }
  .cover-wordmark {
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: rgba(255,255,255,.55);
    margin-bottom: 6px;
  }
  .cover-product {
    font-size: 24pt;
    font-weight: 800;
    letter-spacing: -.02em;
    color: #fff;
    line-height: 1.15;
  }
  .cover-sub {
    font-size: 13pt;
    color: rgba(255,255,255,.65);
    margin-top: 8px;
    font-weight: 400;
  }
  .cover-divider {
    width: 60px; height: 3px;
    background: var(--teal);
    margin: 36px 0 28px;
  }
  .cover-title {
    font-size: 30pt;
    font-weight: 900;
    letter-spacing: -.03em;
    line-height: 1.1;
    max-width: 520px;
  }
  .cover-desc {
    font-size: 11pt;
    color: rgba(255,255,255,.7);
    max-width: 460px;
    margin-top: 20px;
    line-height: 1.6;
  }
  .cover-meta {
    margin-top: auto;
    padding-top: 40px;
    display: flex;
    gap: 48px;
    font-size: 8.5pt;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .cover-meta strong { color: rgba(255,255,255,.75); display: block; font-size: 9pt; }
  .cover-badges {
    display: flex; gap: 10px; margin-top: 32px; flex-wrap: wrap;
  }
  .cover-badge {
    padding: 4px 12px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 2px;
    font-size: 8pt;
    color: rgba(255,255,255,.6);
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  /* ── Table of contents ────────────────────────────────── */
  .toc { padding: 48px 0 32px; }
  .toc h2 {
    font-size: 17pt;
    font-weight: 800;
    color: var(--green-dark);
    margin-bottom: 24px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--green-pale);
  }
  .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 48px; }
  .toc-item {
    display: flex; align-items: baseline;
    gap: 6px;
    font-size: 9.5pt;
    padding: 3px 0;
    border-bottom: 1px dotted var(--gray-200);
  }
  .toc-num  { color: var(--green-light); font-weight: 700; width: 22px; shrink: 0; }
  .toc-name { flex: 1; color: var(--gray-700); }
  .toc-page { color: var(--gray-400); font-size: 8.5pt; }

  /* ── Section headings ─────────────────────────────────── */
  .section { margin-top: 48px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--green-pale);
  }
  .section-num {
    width: 36px; height: 36px;
    background: var(--green-dark);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 13pt; font-weight: 800;
    flex-shrink: 0;
    border-radius: 4px;
  }
  .section-title {
    font-size: 17pt;
    font-weight: 800;
    color: var(--green-dark);
    letter-spacing: -.02em;
  }
  .section-tag {
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--teal);
    background: var(--teal-pale);
    padding: 2px 8px;
    border-radius: 2px;
    margin-left: 6px;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: var(--green-mid);
    margin: 28px 0 10px;
    letter-spacing: -.01em;
  }

  p { margin-bottom: 8px; }
  ul, ol { padding-left: 20px; margin-bottom: 10px; }
  li { margin-bottom: 3px; font-size: 9.5pt; }

  /* ── Info callout ─────────────────────────────────────── */
  .callout {
    padding: 12px 16px;
    border-radius: 3px;
    margin-bottom: 16px;
    font-size: 9pt;
    line-height: 1.55;
    break-inside: avoid;
  }
  .callout.info   { background: var(--blue-pale);   border-left: 3px solid var(--blue);   color: #1e3a8a; }
  .callout.warn   { background: var(--amber-pale);  border-left: 3px solid var(--amber);  color: #78350f; }
  .callout.green  { background: var(--green-pale);  border-left: 3px solid var(--green-light); color: var(--green-dark); }
  .callout.danger { background: var(--red-pale);    border-left: 3px solid var(--red);    color: #7f1d1d; }
  .callout strong { font-weight: 700; }

  /* ── Endpoint card ────────────────────────────────────── */
  .endpoint {
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    margin-bottom: 16px;
    break-inside: avoid;
    overflow: hidden;
  }
  .endpoint-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-200);
  }
  .method {
    font-family: var(--font-mono);
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: .04em;
    padding: 2px 8px;
    border-radius: 3px;
    flex-shrink: 0;
    min-width: 54px;
    text-align: center;
  }
  .method.get    { background: var(--blue-pale);   color: var(--blue);    border: 1px solid #bfdbfe; }
  .method.post   { background: var(--green-pale);  color: var(--green-mid); border: 1px solid #bbf7d0; }
  .method.patch  { background: var(--amber-pale);  color: var(--amber);   border: 1px solid #fde68a; }
  .method.delete { background: var(--red-pale);    color: var(--red);     border: 1px solid #fecaca; }
  .method.put    { background: var(--teal-pale);   color: var(--teal);    border: 1px solid #99f6e4; }

  .endpoint-path {
    font-family: var(--font-mono);
    font-size: 9.5pt;
    font-weight: 600;
    color: var(--gray-900);
    flex: 1;
  }
  .endpoint-path .param { color: var(--teal); }

  .auth-badge {
    font-size: 7.5pt;
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .auth-badge.clerk   { background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }
  .auth-badge.apikey  { background: #fef9c3; color: #a16207; border: 1px solid #fde047; }
  .auth-badge.ewrjwt  { background: var(--teal-pale); color: var(--teal); border: 1px solid #5eead4; }
  .auth-badge.public  { background: var(--gray-100);  color: var(--gray-500); border: 1px solid var(--gray-300); }

  .endpoint-body { padding: 12px 14px; font-size: 9pt; }
  .endpoint-desc { color: var(--gray-700); margin-bottom: 10px; line-height: 1.55; }

  .ep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ep-col h4 {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--gray-400);
    margin-bottom: 6px;
  }

  .role-badge {
    display: inline-block;
    font-size: 7.5pt;
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 2px;
    margin: 1px 2px;
    background: var(--green-pale);
    color: var(--green-mid);
    border: 1px solid #bbf7d0;
  }
  .role-badge.admin     { background: #fce7f3; color: #9d174d; border-color: #fbcfe8; }
  .role-badge.financier { background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
  .role-badge.any       { background: var(--gray-100); color: var(--gray-600); border-color: var(--gray-300); }
  .role-badge.service   { background: #fef9c3; color: #a16207; border-color: #fde047; }

  /* ── Param table ──────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin: 4px 0 8px;
  }
  th {
    background: var(--green-dark);
    color: #fff;
    text-align: left;
    padding: 5px 8px;
    font-size: 7.5pt;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  td { padding: 4px 8px; border-bottom: 1px solid var(--gray-100); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: var(--gray-50); }
  td code { font-family: var(--font-mono); font-size: 8pt; color: var(--teal); }
  td .req  { color: var(--red); font-size: 7pt; font-weight: 700; letter-spacing: .04em; }
  td .opt  { color: var(--gray-400); font-size: 7pt; }

  /* ── Code block ───────────────────────────────────────── */
  pre {
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 3px;
    padding: 10px 12px;
    font-family: var(--font-mono);
    font-size: 8pt;
    line-height: 1.5;
    overflow-x: auto;
    margin: 6px 0;
    break-inside: avoid;
  }
  pre .key   { color: #7dd3fc; }
  pre .str   { color: #86efac; }
  pre .num   { color: #fbbf24; }
  pre .cmt   { color: #64748b; }

  /* ── Tier table ───────────────────────────────────────── */
  .tier-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 16px 0;
  }
  .tier-card {
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
    break-inside: avoid;
  }
  .tier-card-head {
    padding: 8px 12px;
    background: var(--green-dark);
    color: #fff;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: .05em;
  }
  .tier-card-body { padding: 10px 12px; font-size: 8.5pt; color: var(--gray-700); line-height: 1.55; }
  .tier-card-body strong { color: var(--green-dark); font-size: 7.5pt; display: block; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }

  /* ── Error table ──────────────────────────────────────── */
  .error-row td:first-child { font-family: var(--font-mono); font-weight: 700; color: var(--red); }

  /* ── Misc ─────────────────────────────────────────────── */
  hr { border: none; border-top: 1px solid var(--gray-200); margin: 28px 0; }
  code { font-family: var(--font-mono); font-size: 8.5pt; color: var(--teal); background: var(--gray-100); padding: 1px 4px; border-radius: 2px; }
  strong { font-weight: 700; }
  .muted { color: var(--gray-500); font-size: 8.5pt; }
  .mono  { font-family: var(--font-mono); }

  .base-url-box {
    background: var(--green-dark);
    color: #86efac;
    font-family: var(--font-mono);
    font-size: 10pt;
    padding: 12px 16px;
    border-radius: 4px;
    margin: 12px 0 20px;
    letter-spacing: .01em;
  }
  .base-url-box span { color: rgba(255,255,255,.4); }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ COVER ══ -->
<div class="cover">
  <div>
    <div class="cover-wordmark">TokenHarvest</div>
    <div class="cover-product">Tea Marketplace</div>
    <div class="cover-sub">Powered by eWR Infrastructure</div>
  </div>

  <div class="cover-divider"></div>

  <div class="cover-title">API Integration<br/>Reference Guide</div>
  <div class="cover-desc">
    Complete technical documentation for all integration roles: Factory Portals, Producers,
    Brokers, Off-Takers, Financiers, Cooperatives, and Exchange Administrators.
    Covers authentication, every endpoint, request/response schemas, and error handling.
  </div>

  <div class="cover-badges">
    <div class="cover-badge">REST / JSON</div>
    <div class="cover-badge">Clerk JWT Auth</div>
    <div class="cover-badge">API Key (Service)</div>
    <div class="cover-badge">eWR Registry Sync</div>
    <div class="cover-badge">Version 1.0</div>
  </div>

  <div class="cover-meta">
    <div><strong>Document Version</strong>1.0 — July 2026</div>
    <div><strong>Classification</strong>Confidential — Partners Only</div>
    <div><strong>Contact</strong>exchange@tokenharvest.io</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ TABLE OF CONTENTS ══ -->
<div class="toc page-break">
  <h2>Table of Contents</h2>
  <div class="toc-grid">
    <div class="toc-item"><span class="toc-num">1</span><span class="toc-name">Base URL &amp; Environments</span></div>
    <div class="toc-item"><span class="toc-num">7</span><span class="toc-name">Factory Portal Integration</span></div>
    <div class="toc-item"><span class="toc-num">2</span><span class="toc-name">Authentication Methods</span></div>
    <div class="toc-item"><span class="toc-num">8</span><span class="toc-name">Cooperative Role</span></div>
    <div class="toc-item"><span class="toc-num">3</span><span class="toc-name">User Tiers &amp; Roles</span></div>
    <div class="toc-item"><span class="toc-num">9</span><span class="toc-name">Financing &amp; Lending</span></div>
    <div class="toc-item"><span class="toc-num">4</span><span class="toc-name">Users &amp; Profiles</span></div>
    <div class="toc-item"><span class="toc-num">10</span><span class="toc-name">Forward Contracts</span></div>
    <div class="toc-item"><span class="toc-num">5</span><span class="toc-name">eWR Management</span></div>
    <div class="toc-item"><span class="toc-num">11</span><span class="toc-name">Settlements &amp; Disbursement</span></div>
    <div class="toc-item"><span class="toc-num">6</span><span class="toc-name">Tea Lots, Auctions &amp; Bidding</span></div>
    <div class="toc-item"><span class="toc-num">12</span><span class="toc-name">Admin, Stats &amp; Registry</span></div>
  </div>

  <h2 style="margin-top:32px">Integration Role Quick Reference</h2>
  <table>
    <thead>
      <tr><th>Role / System</th><th>Auth Method</th><th>Primary Actions</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Factory Portal</strong></td><td><code>X-Api-Key</code> header</td><td>Push TEA eWRs to the marketplace</td></tr>
      <tr><td><strong>Producer (PRODUCER)</strong></td><td>Clerk JWT</td><td>View own eWRs, self-list lots, request financing, create forward contracts</td></tr>
      <tr><td><strong>Broker (ENABLER)</strong></td><td>Clerk JWT</td><td>Manage mandates, catalogue lots, submit to auctions, settle trades</td></tr>
      <tr><td><strong>Off-Taker (OFF_TAKER)</strong></td><td>Clerk JWT</td><td>Browse spot market, place bids, purchase at fixed price, manage orders</td></tr>
      <tr><td><strong>Financier (FINANCIER)</strong></td><td>Clerk JWT</td><td>Review financing requests, approve/disburse loans, view loan book</td></tr>
      <tr><td><strong>Cooperative (COOPERATIVE)</strong></td><td>Clerk JWT</td><td>Aggregate member deliveries into macro-lots, request eWRs</td></tr>
      <tr><td><strong>Admin (ADMIN)</strong></td><td>Clerk JWT</td><td>Full platform access, create auctions, manage users, oversee settlements</td></tr>
      <tr><td><strong>Registry (eWRS)</strong></td><td>eWRS JWT / HMAC</td><td>Sync lien status, master reference data, registry webhooks</td></tr>
    </tbody>
  </table>
</div>

<!-- ══════════════════════════════════════════════ SECTION 1 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">1</div>
    <div class="section-title">Base URL &amp; Environments</div>
  </div>

  <p>All API endpoints are served under the <code>/api</code> prefix relative to your deployment domain.</p>

  <div class="base-url-box">
    <span>Production: </span>https://&lt;your-domain&gt;/api<br/>
    <span>Development: </span>https://&lt;replit-dev-domain&gt;/tea/api
  </div>

  <div class="callout info">
    <strong>Path prefix in development:</strong> The marketplace is mounted at the <code>/tea/</code>
    path in the Replit preview environment. All relative API calls use
    <code>import.meta.env.BASE_URL</code> automatically. External systems should always target
    the production domain without a path prefix.
  </div>

  <h3>Global Headers</h3>
  <table>
    <thead><tr><th>Header</th><th>Value</th><th>When Required</th></tr></thead>
    <tbody>
      <tr><td><code>Authorization</code></td><td><code>Bearer &lt;clerk-jwt&gt;</code></td><td>All Clerk-authenticated endpoints</td></tr>
      <tr><td><code>X-Api-Key</code></td><td><code>&lt;factory-api-key&gt;</code></td><td>Factory service-to-service endpoints</td></tr>
      <tr><td><code>Content-Type</code></td><td><code>application/json</code></td><td>All POST / PATCH requests</td></tr>
      <tr><td><code>Accept</code></td><td><code>application/json</code></td><td>Recommended on all requests</td></tr>
    </tbody>
  </table>

  <h3>Response envelope</h3>
  <p>Successful responses return the resource directly (not wrapped). Errors always return:</p>
  <pre>{
  <span class="key">"error"</span>: <span class="str">"Human-readable message"</span>,
  <span class="key">"issues"</span>: [ <span class="cmt">/* Zod validation issues when present */</span> ]
}</pre>
</div>

<!-- ══════════════════════════════════════════════ SECTION 2 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">2</div>
    <div class="section-title">Authentication Methods</div>
  </div>

  <h3>2.1 Clerk JWT (Standard User Auth)</h3>
  <p>The primary authentication mechanism for all human users. Obtain a session token using the
  Clerk SDK for your platform (web, mobile, server-to-server). Pass the JWT in the
  <code>Authorization: Bearer &lt;token&gt;</code> header.</p>

  <div class="callout green">
    <strong>Clerk publishable key</strong> — request this from your exchange operator. The key
    is environment-specific (development vs production). Never embed secret keys in client-side code.
  </div>

  <table>
    <thead><tr><th>Scenario</th><th>How to get a token</th></tr></thead>
    <tbody>
      <tr><td>Browser / SPA</td><td>Use <code>@clerk/react</code> — <code>useAuth().getToken()</code></td></tr>
      <tr><td>Mobile (React Native)</td><td>Use <code>@clerk/expo</code> SDK</td></tr>
      <tr><td>Server-to-server (machine user)</td><td>Create a Clerk machine token via the Clerk Backend API</td></tr>
    </tbody>
  </table>

  <h3>2.2 API Key Auth (Factory / Service-to-Service)</h3>
  <p>Used exclusively by the factory portal integration. A shared secret is configured as the
  <code>FACTORY_API_KEY</code> environment variable on the API server. No Clerk account is needed.</p>

  <pre><span class="cmt"># Example curl call from factory system</span>
curl -X POST https://&lt;domain&gt;/api/factory/ewrs \
  -H "X-Api-Key: <span class="str">YOUR_FACTORY_API_KEY</span>" \
  -H "Content-Type: application/json" \
  -d '{ "factoryMark": "LIMURU_01", "ewrsReceiptId": "EWR-2026-00001", ... }'</pre>

  <div class="callout warn">
    <strong>Security note:</strong> The factory endpoint is only mounted when <code>FACTORY_API_KEY</code>
    is explicitly set in the server environment. On an unconfigured server the route returns 404.
    Rotate this key immediately if it is compromised — all pushes use a single shared key per factory.
  </div>

  <h3>2.3 eWRS Registry JWT (Registry Sync)</h3>
  <p>Used by the Warehouse Receipt System Controller (WRSC) for registry webhooks and master
  data access. Requires <code>WRSC_SECRET</code>, <code>EWR_JWT_SECRET</code>, and
  <code>EWR_OAUTH_CLIENTS</code> to be configured. This surface is completely disabled unless
  all three secrets are present.</p>
</div>

<!-- ══════════════════════════════════════════════ SECTION 3 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">3</div>
    <div class="section-title">User Tiers &amp; Roles</div>
  </div>

  <p>Every registered user is assigned exactly one tier at account creation. The tier is
  <strong>immutable</strong> after registration (except via Admin override). Endpoints
  enforce tier-based access control server-side — the UI is a convenience layer only.</p>

  <div class="tier-grid">
    <div class="tier-card">
      <div class="tier-card-head">PRODUCER</div>
      <div class="tier-card-body">
        <strong>Who</strong>Tea estates, smallholder farmers, agricultural producers.
        <strong>Can do</strong>Submit eWRs, self-list tea lots (direct sales), request financing, create forward contracts, grant mandates to brokers.
        <strong>Cannot do</strong>Place bids, create auctions, disburse settlements.
      </div>
    </div>
    <div class="tier-card">
      <div class="tier-card-head">ENABLER (Broker)</div>
      <div class="tier-card-body">
        <strong>Who</strong>Licensed tea brokers and intermediaries.
        <strong>Can do</strong>Receive mandates, catalogue lots for mandate holders, submit lots to auction sessions, accept below-reserve bids, manage dispatch docs, disburse settlement legs.
        <strong>Cannot do</strong>Own eWRs, place bids as buyer.
      </div>
    </div>
    <div class="tier-card">
      <div class="tier-card-head">OFF_TAKER</div>
      <div class="tier-card-body">
        <strong>Who</strong>Tea buyers, blenders, packers, exporters.
        <strong>Can do</strong>Browse market, place auction bids, purchase fixed-price lots, sign forward contracts, place spot orders.
        <strong>Cannot do</strong>List lots, create mandates, access admin.
      </div>
    </div>
    <div class="tier-card">
      <div class="tier-card-head">FINANCIER</div>
      <div class="tier-card-body">
        <strong>Who</strong>Banks, microfinance institutions, trade finance providers.
        <strong>Can do</strong>View eligible eWRs, approve/disburse loans, view full loan book, access earnings and audit logs.
        <strong>Cannot do</strong>List lots, place bids, create mandates.
      </div>
    </div>
    <div class="tier-card">
      <div class="tier-card-head">COOPERATIVE</div>
      <div class="tier-card-body">
        <strong>Who</strong>Farmer cooperative societies, aggregators.
        <strong>Can do</strong>Aggregate member deliveries into macro-lots, request bulk eWRs, split eWRs by member weight.
        <strong>Cannot do</strong>Trade directly — they submit eWRs that producer members can then list.
      </div>
    </div>
    <div class="tier-card">
      <div class="tier-card-head">ADMIN</div>
      <div class="tier-card-body">
        <strong>Who</strong>Exchange operators, platform staff.
        <strong>Can do</strong>Full access to all endpoints. Create auction sessions, manage users, override tiers, oversee all settlements, view platform earnings.
        <strong>Notes</strong>ADMIN sees all sections in the sidebar. Actions marked ADMIN-only are not available to any other tier.
      </div>
    </div>
  </div>

  <h3>First-Time Registration Flow</h3>
  <div class="callout info">
    When a user signs in for the first time, the frontend calls <code>GET /users/me</code>.
    If no DB record exists, the user must complete their profile (name, company, tier) via
    <code>PATCH /users/me</code> before accessing any other features. Tier selection is
    permanent — warn users before they submit.
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 4 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">4</div>
    <div class="section-title">Users &amp; Profiles</div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/users/me</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns the authenticated user's full profile record. On first login for super-admin accounts, auto-creates the DB record by matching the Clerk email against the configured admin email. All other users must call <code>PATCH /users/me</code> to complete registration.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated user</span></div>
        <div class="ep-col"><h4>Returns</h4><code>id, clerkId, name, company, phone, nationalId, tier, reputationScore, kybStatus, createdAt</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method patch">PATCH</span>
      <span class="endpoint-path">/users/me</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Updates the current user's profile. <strong>Tier can only be set once</strong> — if a tier is already recorded it is ignored in subsequent calls. All other fields are freely updatable.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Body Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td>string</td><td><span class="opt">optional</span></td></tr>
              <tr><td><code>company</code></td><td>string</td><td><span class="opt">optional</span></td></tr>
              <tr><td><code>phone</code></td><td>string</td><td><span class="opt">optional</span></td></tr>
              <tr><td><code>nationalId</code></td><td>string</td><td><span class="opt">optional</span></td></tr>
              <tr><td><code>tier</code></td><td>enum</td><td><span class="opt">only on first set</span> PRODUCER | ENABLER | OFF_TAKER | FINANCIER | COOPERATIVE</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col"><h4>Returns</h4>Updated user object.</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/users/brokers</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns all users registered with the <code>ENABLER</code> tier. Used by producers to populate the broker picker when granting mandates.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of <code>{ id, name, company }</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/users/<span class="param">:userId</span></span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns the public profile of any user by their internal DB ID. Useful for displaying counterparty information in trades.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated</span></div>
        <div class="ep-col"><h4>Returns</h4><code>id, name, company, tier, reputationScore</code></div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 5 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">5</div>
    <div class="section-title">Electronic Warehouse Receipts (eWRs)</div>
  </div>

  <div class="callout green">
    <strong>eWR Lifecycle:</strong> INGESTED → MARKET_LISTED → AUCTION_ACTIVE → SETTLED / EXTINGUISHED
    (or ENCUMBERED when a lien/loan is active, FORWARD_BOUND when pledged to a forward contract).
    Once SETTLED or EXTINGUISHED an eWR is terminal — it cannot be listed or financed again.
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/ewrs</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Intakes a new electronic Warehouse Receipt directly through the marketplace UI. Validates commodity-specific grading standards (EAS moisture limits for grain, cold-chain for avocado). For grain commodities, assigns to an existing pool group or creates a new one.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4>
          <span class="role-badge">PRODUCER</span><span class="role-badge">ENABLER</span>
          <h4 style="margin-top:10px">Common Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th><th></th></tr></thead>
            <tbody>
              <tr><td><code>commodityType</code></td><td>enum</td><td><span class="req">REQUIRED</span> MAIZE | RICE | COFFEE | TEA | AVOCADO</td></tr>
              <tr><td><code>ewrsReceiptId</code></td><td>string</td><td><span class="req">REQUIRED</span> Exchange-issued receipt number</td></tr>
              <tr><td><code>warehouseCode</code></td><td>string</td><td><span class="req">REQUIRED</span> WRSC-assigned facility code</td></tr>
              <tr><td><code>weightMt</code></td><td>number</td><td><span class="req">REQUIRED</span> Weight in metric tonnes</td></tr>
              <tr><td><code>grade</code></td><td>string</td><td><span class="req">REQUIRED</span></td></tr>
              <tr><td><code>harvestSeason</code></td><td>string</td><td><span class="req">REQUIRED</span> e.g. "2026A"</td></tr>
              <tr><td><code>estimatedValueUsd</code></td><td>number</td><td><span class="opt">optional</span></td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>TEA-Specific Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>teaProcessingType</code></td><td>string (e.g. "CTC", "Orthodox")</td></tr>
              <tr><td><code>teaLeafGrade</code></td><td>string (e.g. "BOP", "BOPF", "PF")</td></tr>
              <tr><td><code>teaInvoiceSerial</code></td><td>string</td></tr>
            </tbody>
          </table>
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>422</td><td>Grading standards not met (moisture/grade)</td></tr>
              <tr><td>409</td><td>Duplicate ewrsReceiptId</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/ewrs/my-portfolio</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns all eWRs owned by the authenticated user, enriched with active lien/loan status, portfolio total value, and counts by state and commodity type.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated</span></div>
        <div class="ep-col"><h4>Returns</h4><code>{ ewrs[], totalValueUsd, stateCounts{}, commodityCounts{} }</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/ewrs/broker-available</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns TEA eWRs in <code>INGESTED</code> state owned by producers who have granted the calling broker an active mandate. Used to populate the eWR picker when a broker creates a new lot.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of eWR objects enriched with <code>ownerName</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/ewrs/<span class="param">:ewrId</span>/split</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Splits one eWR into two by weight. The original is extinguished and two new eWRs are minted. The eWR must have no active lien and must be in INGESTED or MARKET_LISTED state. Calls the WRSC registry to record the split.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Body</h4>
          <table><thead><tr><th>Field</th><th>Type</th></tr></thead>
          <tbody>
            <tr><td><code>splitWeightMt</code></td><td>number — weight for first child eWR (remainder forms second)</td></tr>
          </tbody></table>
        </div>
        <div class="ep-col"><h4>Returns</h4><code>{ original, childA, childB }</code> — three eWR objects</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/ewrs/<span class="param">:ewrId</span>/transfer</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Transfers ownership of an eWR to another registered user. The eWR must have no active lien. Typically used for OTC title transfers outside the auction/order flow.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Body</h4><code>toUserId</code> (number) — target user's internal ID</div>
        <div class="ep-col"><h4>Errors</h4>400 if active lien exists; 404 if target user not found</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/ewrs/<span class="param">:ewrId</span>/retire</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Permanently extinguishes an eWR (marks it EXTINGUISHED). Used when physical goods are consumed, destroyed, or removed from the warehouse system. Irreversible. No active lien may exist.</div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 6 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">6</div>
    <div class="section-title">Tea Lots, Auctions &amp; Bidding</div>
  </div>

  <div class="callout green">
    <strong>Lot Status Flow:</strong> DRAFT → CATALOGUED → DISPATCHED → LIVE (auction) or
    direct CATALOGUED → SOLD (fixed-price). Terminal states: SOLD, UNSOLD, WITHDRAWN, RESERVE_NOT_MET.
    Creating a lot from an eWR immediately advances the eWR from INGESTED → MARKET_LISTED.
  </div>

  <h3>6.1 Tea Lot Management</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/lots</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Creates a tea lot catalogue entry (status DRAFT). Brokers (ENABLER) must hold an active mandate from the eWR owner. Producers (PRODUCER) can self-list their own eWRs with zero commission — no mandate required. The source eWR must be in INGESTED state; it is immediately advanced to MARKET_LISTED. Only one active (non-WITHDRAWN) lot may exist per eWR.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4>
          <span class="role-badge">ENABLER</span><span class="role-badge">PRODUCER</span>
          <h4 style="margin-top:10px">Required Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>ewrId</code></td><td>integer — source eWR</td></tr>
              <tr><td><code>grade</code></td><td>string e.g. "BOP"</td></tr>
              <tr><td><code>gradeMark</code></td><td>string — estate/factory mark</td></tr>
              <tr><td><code>giOrigin</code></td><td>string e.g. "Kenya"</td></tr>
              <tr><td><code>grossWeightKg</code></td><td>number</td></tr>
              <tr><td><code>netWeightKg</code></td><td>number</td></tr>
              <tr><td><code>tareWeightKg</code></td><td>number</td></tr>
              <tr><td><code>packageType</code></td><td>string e.g. "Paper Sack"</td></tr>
              <tr><td><code>listingType</code></td><td>AUCTION | FIXED_PRICE</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>Conditional Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>When Required</th></tr></thead>
            <tbody>
              <tr><td><code>reservePriceUsd</code></td><td>listingType = AUCTION</td></tr>
              <tr><td><code>fixedPricePerKgUsd</code></td><td>listingType = FIXED_PRICE</td></tr>
            </tbody>
          </table>
          <h4 style="margin-top:10px">Optional Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Default</th></tr></thead>
            <tbody>
              <tr><td><code>certifications</code></td><td>[]</td></tr>
              <tr><td><code>tasterRemarks</code></td><td>—</td></tr>
              <tr><td><code>catalogueType</code></td><td>WITHOUT_VALUATION</td></tr>
              <tr><td><code>brokerValuationUsd</code></td><td>—</td></tr>
              <tr><td><code>commissionRate</code></td><td>0.01 (forced 0 for producers)</td></tr>
              <tr><td><code>bidSecurityPct</code></td><td>0.10</td></tr>
            </tbody>
          </table>
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>403</td><td>No active mandate (broker) / not eWR owner (producer)</td></tr>
              <tr><td>409</td><td>eWR not in INGESTED state or active lot already exists</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/tea/lots</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Filterable catalogue of all tea lots. Returns all columns plus <code>warehouseCode</code> (from linked eWR) on each row.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Query Parameters</h4>
          <table>
            <thead><tr><th>Param</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>grade</code></td><td>string — exact match</td></tr>
              <tr><td><code>giOrigin</code></td><td>string — exact match</td></tr>
              <tr><td><code>listingType</code></td><td>AUCTION | FIXED_PRICE</td></tr>
              <tr><td><code>status</code></td><td>DRAFT | CATALOGUED | DISPATCHED | LIVE | SOLD | UNSOLD | WITHDRAWN | RESERVE_NOT_MET</td></tr>
              <tr><td><code>brokerId</code></td><td>integer</td></tr>
              <tr><td><code>ownerId</code></td><td>integer</td></tr>
              <tr><td><code>certification</code></td><td>string — JSONB array contains check</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated</span><p style="margin-top:8px;font-size:8.5pt">Returns array of lot objects.</p></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span></span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Full lot detail including enriched eWR data (processing type, leaf grade, harvest season, warehouse code), owner/broker names, and best-effort warehouse operator profile lookup (matched on WRSC licence number).</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge any">Any authenticated</span></div>
        <div class="ep-col"><h4>Returns</h4><code>lot + warehouseCode + warehouseProfile? + ownerName + brokerName + ewr</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method patch">PATCH</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span></span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Updates a DRAFT or CATALOGUED lot. Any PATCH on a DRAFT lot automatically advances it to CATALOGUED (published). The commission rate is permanently locked at 0 for direct (producer self-listed) lots regardless of the request body. Only the mandate broker or the eWR owner may call this endpoint.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span><span class="role-badge">PRODUCER</span> (mandate holder or owner)</div>
        <div class="ep-col"><h4>Errors</h4>400 if status is not DRAFT / CATALOGUED; 403 if not broker/owner</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span>/dispatch</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Attaches a dispatch document to a lot. Attaching a <code>PRE_AUCTION_DISPATCH</code> form to a CATALOGUED lot automatically advances it to DISPATCHED. Delivery Orders can only be attached after the lot is SOLD.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Body</h4>
          <table>
            <thead><tr><th>Field</th><th>Values</th></tr></thead>
            <tbody>
              <tr><td><code>docType</code></td><td>PRE_AUCTION_DISPATCH | WEIGHMENT_REPORT | DELIVERY_ORDER</td></tr>
              <tr><td><code>docData</code></td><td>object — arbitrary document fields / file URL</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span><span class="role-badge">PRODUCER</span> (lot broker or owner)</div>
      </div>
    </div>
  </div>

  <h3>6.2 Auction Sessions</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/auctions</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Creates a new SCHEDULED auction session. Sessions are identified by auction date. Brokers then submit lots to the session before it goes live.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Body</h4><code>auctionDate</code> (string, YYYY-MM-DD) <span class="req">REQUIRED</span></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/auctions/<span class="param">:id</span>/lots</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Assigns CATALOGUED or DISPATCHED lots to a SCHEDULED session. The broker must be the mandate holder for each lot submitted. Lots that are already assigned to a session are rejected.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span><span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Body</h4><code>lotIds</code> (integer[], <span class="req">REQUIRED</span>)</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/auctions/<span class="param">:id</span>/start</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Starts the auction session. The session moves to LIVE and the first lot's countdown begins. Only possible on SCHEDULED sessions that have at least one lot assigned.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Body</h4><code>durationMins</code> (integer, 1–120, default 7)</div>
      </div>
    </div>
  </div>

  <h3>6.3 Bidding</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span>/bids</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Places a bid on a LIVE lot. Enforces minimum bid increment tiers (tick rules). Applies anti-snipe logic: if a bid arrives within the configured window (default 3 min) before close, the timer extends by the configured amount. A bid security hold of <code>bidSecurityPct × amountUsd × netWeightKg</code> is recorded for the bidder.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">OFF_TAKER</span>
          <h4 style="margin-top:8px">Body</h4>
          <code>amountUsd</code> (number) — bid price per kg
        </div>
        <div class="ep-col">
          <h4>Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>400</td><td>Bid below minimum increment</td></tr>
              <tr><td>400</td><td>Auction countdown has ended</td></tr>
              <tr><td>403</td><td>Owner cannot bid on own lot</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span>/accept-below-reserve</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Manually accepts the highest bid on a RESERVE_NOT_MET lot. Triggers eWR ownership transfer to the winner and creates a settlement record. Only available after the auction has closed.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span> (mandate broker)<span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Returns</h4>Updated lot object with status SOLD + linked settlement ID</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 7 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">7</div>
    <div class="section-title">Factory Portal Integration</div>
  </div>

  <div class="callout info">
    <strong>This is a service-to-service integration.</strong> No Clerk account is needed.
    Configure <code>FACTORY_API_KEY</code> on the API server and share the same value with
    the factory system. The route is not mounted at all until this variable is set.
    The producer must first register on the marketplace and set their factory mark in their profile.
  </div>

  <h3>How the factory push flow works</h3>
  <ol style="margin-bottom:16px">
    <li>Producer registers on the marketplace and sets their <strong>factory mark</strong> (a unique string identifying their factory, e.g. <code>"LIMURU_01"</code>) in their profile settings.</li>
    <li>Factory system is configured with the shared <code>FACTORY_API_KEY</code> and the marketplace URL.</li>
    <li>After each tea batch is weighed and graded, the factory system calls <code>POST /factory/ewrs</code>.</li>
    <li>The API looks up the producer by factory mark, mints the eWR in INGESTED state, and associates it with the producer's account.</li>
    <li>The producer sees the eWR in their dashboard and can immediately self-list it.</li>
  </ol>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/factory/ewrs</span>
      <span class="auth-badge apikey">X-Api-Key</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Ingests a TEA eWR from an external factory portal. The factory mark is matched against <code>producer_profiles.factory_marks</code> to identify the producer. Idempotent on <code>ewrsReceiptId</code> — re-submitting a known receipt ID returns the existing eWR (no duplicate is created).</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Auth Header</h4>
          <code>X-Api-Key: &lt;FACTORY_API_KEY&gt;</code>
          <h4 style="margin-top:10px">Required Body Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td><code>factoryMark</code></td><td>string</td><td>Must match a registered producer profile</td></tr>
              <tr><td><code>ewrsReceiptId</code></td><td>string</td><td>Exchange receipt number — unique</td></tr>
              <tr><td><code>warehouseCode</code></td><td>string</td><td>WRSC facility code</td></tr>
              <tr><td><code>weightMt</code></td><td>number</td><td>Weight in metric tonnes</td></tr>
              <tr><td><code>grade</code></td><td>string</td><td>e.g. "BOP"</td></tr>
              <tr><td><code>harvestSeason</code></td><td>string</td><td>e.g. "2026A"</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>Optional Body Fields</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>teaProcessingType</code></td><td>string (CTC / Orthodox)</td></tr>
              <tr><td><code>teaLeafGrade</code></td><td>string (BOP / BOPF / PF / BP / D / F)</td></tr>
              <tr><td><code>teaInvoiceSerial</code></td><td>string</td></tr>
              <tr><td><code>estimatedValueUsd</code></td><td>number</td></tr>
            </tbody>
          </table>
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>401</td><td>Missing or invalid X-Api-Key</td></tr>
              <tr><td>404</td><td>No producer profile with this factory mark</td></tr>
              <tr><td>409</td><td>Duplicate ewrsReceiptId (returns existing record)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <h4 style="margin-top:12px">Example Request</h4>
      <pre>POST /api/factory/ewrs
X-Api-Key: sk_factory_...

{
  <span class="key">"factoryMark"</span>:        <span class="str">"LIMURU_01"</span>,
  <span class="key">"ewrsReceiptId"</span>:     <span class="str">"EWR-TEA-2026-00847"</span>,
  <span class="key">"warehouseCode"</span>:     <span class="str">"WRSC-KE-NBI-014"</span>,
  <span class="key">"weightMt"</span>:          <span class="num">2.450</span>,
  <span class="key">"grade"</span>:            <span class="str">"BOP"</span>,
  <span class="key">"harvestSeason"</span>:    <span class="str">"2026A"</span>,
  <span class="key">"teaProcessingType"</span>: <span class="str">"CTC"</span>,
  <span class="key">"teaLeafGrade"</span>:     <span class="str">"BOPF"</span>,
  <span class="key">"teaInvoiceSerial"</span>: <span class="str">"INV-2026-0221"</span>,
  <span class="key">"estimatedValueUsd"</span>: <span class="num">3200</span>
}</pre>

      <h4>Example Response (201 Created)</h4>
      <pre>{
  <span class="key">"id"</span>:              <span class="num">147</span>,
  <span class="key">"ewrsReceiptId"</span>:   <span class="str">"EWR-TEA-2026-00847"</span>,
  <span class="key">"ownerId"</span>:         <span class="num">23</span>,
  <span class="key">"commodityType"</span>:   <span class="str">"TEA"</span>,
  <span class="key">"state"</span>:           <span class="str">"INGESTED"</span>,
  <span class="key">"warehouseCode"</span>:   <span class="str">"WRSC-KE-NBI-014"</span>,
  <span class="key">"weightMt"</span>:        <span class="str">"2.450"</span>,
  <span class="key">"grade"</span>:           <span class="str">"BOP"</span>,
  <span class="key">"createdAt"</span>:       <span class="str">"2026-07-26T08:15:00.000Z"</span>
}</pre>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 8 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">8</div>
    <div class="section-title">Broker Mandates</div>
  </div>

  <p>A mandate is a formal permission granted by a commodity owner (PRODUCER or COOPERATIVE)
  to a broker (ENABLER) to act on their behalf for a specific commodity type.
  Brokers cannot catalogue lots without an active mandate from the eWR owner.</p>

  <div class="callout warn">
    Only one active mandate per producer–broker–commodity combination may exist at any time.
    Attempting to create a duplicate returns HTTP 409.
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/broker-mandates</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Grants a mandate to a broker. The caller is the mandate owner (PRODUCER or COOPERATIVE). Commission rate override is stored as a decimal ratio (0.05 = 5%) and applied automatically when the broker creates lots for this producer.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">PRODUCER</span><span class="role-badge">COOPERATIVE</span>
          <h4 style="margin-top:10px">Body</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th><th></th></tr></thead>
            <tbody>
              <tr><td><code>brokerId</code></td><td>integer</td><td><span class="req">REQUIRED</span> — use GET /users/brokers to list</td></tr>
              <tr><td><code>commodityType</code></td><td>enum</td><td><span class="req">REQUIRED</span> MAIZE | RICE | COFFEE | TEA | AVOCADO</td></tr>
              <tr><td><code>commissionRateOverride</code></td><td>number 0–1</td><td><span class="opt">optional</span> e.g. 0.03 for 3%</td></tr>
              <tr><td><code>permissions</code></td><td>string[]</td><td><span class="opt">optional</span> defaults to full set</td></tr>
              <tr><td><code>validFrom</code></td><td>ISO8601</td><td><span class="opt">optional</span></td></tr>
              <tr><td><code>validTo</code></td><td>ISO8601</td><td><span class="opt">optional</span> open-ended if omitted</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>Returns</h4>
          Mandate object including <code>brokerName</code>.
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>403</td><td>Caller is not PRODUCER or COOPERATIVE</td></tr>
              <tr><td>404</td><td>Broker user not found</td></tr>
              <tr><td>409</td><td>Active mandate already exists for this combination</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/broker-mandates/my</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns all mandates granted <em>to</em> the calling broker. Includes <code>ownerName</code> and active status. Used by brokers to populate their mandate holders view.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of mandate objects with <code>ownerName</code>, <code>active</code> boolean</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/broker-mandates/given</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns all mandates granted <em>by</em> the calling producer or cooperative. Includes <code>brokerName</code> for display in the mandates management page.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">PRODUCER</span><span class="role-badge">COOPERATIVE</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of mandate objects with <code>brokerName</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method delete">DELETE</span>
      <span class="endpoint-path">/broker-mandates/<span class="param">:id</span></span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Revokes an active mandate. Sets <code>revoked = true</code>. The broker will no longer be able to create lots for this producer for this commodity. Existing lots already created under this mandate are unaffected.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4>Mandate owner (PRODUCER / COOPERATIVE)</div>
        <div class="ep-col"><h4>Errors</h4>403 if not owner; 400 if already revoked</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 9 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">9</div>
    <div class="section-title">Financing &amp; Lending</div>
  </div>

  <p>Producers can pledge their unencumbered eWRs as collateral to request warehouse-receipt financing.
  Financiers review, approve, and disburse loans. The eWR is locked (ENCUMBERED) for the loan duration
  and released upon settlement repayment.</p>

  <div class="callout green">
    <strong>Eligibility:</strong> An eWR is financeable if it is in INGESTED or MARKET_LISTED state
    with no active lien (<code>isLienActive = false</code>). Maximum loan-to-value is <strong>60%</strong>
    of estimated value at a default rate of <strong>12% p.a.</strong>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/financing/eligible-ewrs</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns eWRs eligible for financing. Producers see only their own. Financiers see all eligible eWRs across the platform. Each item includes <code>lMaxUsd</code> (maximum loan = 60% of estimated value) and the default interest rate.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">PRODUCER</span><span class="role-badge financier">FINANCIER</span><span class="role-badge">ENABLER</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of eWRs with <code>lMaxUsd</code>, <code>interestRateDefault</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/financing</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Creates a PENDING financing request against an eligible eWR. Only one active request per eWR may exist at a time. The request enters a queue for financier review.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">PRODUCER</span>
          <h4 style="margin-top:8px">Body</h4>
          <code>ewrId</code> (integer, <span class="req">REQUIRED</span>)<br/>
          <code>notes</code> (string, <span class="opt">optional</span>)
        </div>
        <div class="ep-col">
          <h4>Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>409</td><td>Active financing request already exists for this eWR</td></tr>
              <tr><td>400</td><td>eWR state is ineligible (already encumbered or terminal)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method patch">PATCH</span>
      <span class="endpoint-path">/financing/<span class="param">:requestId</span>/approve</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Approves a PENDING financing request. Sets eWR state to ENCUMBERED and activates the lien (<code>isLienActive = true</code>, <code>lienHolderId = financier</code>). Creates a loan record. Simulates a WRSC registry lien lock call.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge financier">FINANCIER</span></div>
        <div class="ep-col"><h4>Errors</h4>409 if eWR already encumbered by a different request</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method patch">PATCH</span>
      <span class="endpoint-path">/financing/<span class="param">:requestId</span>/disburse</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Confirms that loan funds have been disbursed to the producer's bank account. Status transitions to DISBURSED. Simulates the bank transfer confirmation and registry capital ingress recording.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge financier">FINANCIER</span></div>
        <div class="ep-col"><h4>Returns</h4>Updated financing request object</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/financing/loan-book</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns all active loans. For each loan, calculates <code>accruedInterestUsd</code> and <code>totalRepayableUsd</code> based on elapsed days since disbursement at the loan's agreed interest rate.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge financier">FINANCIER</span><span class="role-badge">ENABLER</span></div>
        <div class="ep-col"><h4>Returns</h4>Array of loans with live accrual calculations</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 10 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">10</div>
    <div class="section-title">Forward Contracts</div>
  </div>

  <p>Forward contracts allow producers to lock in a future delivery price with a buyer before
  harvest or processing is complete. A 15% performance bond is required from both parties.
  The eWR is pledged (FORWARD_BOUND) for the contract duration.</p>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/forwards</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Creates a PENDING_SIGNATURE forward contract. The producer pledges an eWR as the underlying asset and sets the delivery price and maturity date. Status is PENDING_SIGNATURE until the buyer co-signs.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">PRODUCER</span>
          <h4 style="margin-top:8px">Body</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>ewrId</code></td><td>integer <span class="req">REQUIRED</span></td></tr>
              <tr><td><code>maturityDate</code></td><td>ISO8601 <span class="req">REQUIRED</span> — must be in future</td></tr>
              <tr><td><code>deliveryPriceUsd</code></td><td>number <span class="req">REQUIRED</span> — total contract value</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>Returns</h4>Forward contract object with <code>performanceBondUsd</code> (15% of value)
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>400</td><td>Maturity date is in the past</td></tr>
              <tr><td>400</td><td>eWR state is not INGESTED or MARKET_LISTED</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/forwards/<span class="param">:contractId</span>/co-sign</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Buyer co-signs the contract. Status becomes ACTIVE. eWR is moved to ENCUMBERED (lien to buyer) and performance bonds for both parties are activated. The eWR cannot be financed, traded, or transferred while ACTIVE.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">OFF_TAKER</span></div>
        <div class="ep-col"><h4>Returns</h4>Updated contract with <code>status: "ACTIVE"</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/forwards/<span class="param">:contractId</span>/complete</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Triggers maturity resolution if the maturity date has passed. Status becomes MATURED. Performance bonds are released. The eWR remains ENCUMBERED pending the settlement engine to fully close out.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge">ENABLER</span><span class="role-badge">PRODUCER</span><span class="role-badge">OFF_TAKER</span></div>
        <div class="ep-col"><h4>Errors</h4>400 if maturity date has not yet passed</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/forwards/<span class="param">:contractId</span>/resolve-default</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Declares a contract default by one party. The defaulting party forfeits their performance bond and loses 10 reputation points. Status becomes DEFAULTED and the eWR is released back to INGESTED state.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">ENABLER</span> (any); SELLER (if buyer default); BUYER (if seller default)
          <h4 style="margin-top:8px">Body</h4><code>defaultSide</code>: "BUYER" | "SELLER"
        </div>
        <div class="ep-col"><h4>Returns</h4>Updated contract with <code>status: "DEFAULTED"</code></div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 11 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">11</div>
    <div class="section-title">Settlements &amp; Disbursement</div>
  </div>

  <p>The settlement engine handles the financial close-out for all trade types: auction lots,
  fixed-price orders, and forward contracts. It calculates platform fees, manages lien repayment,
  and orchestrates the sequential disbursement of payment legs.</p>

  <div class="callout info">
    <strong>Fee structure:</strong> Platform fee = <strong>2%</strong> of gross trade value.
    Escrow fee = <strong>0.5%</strong> on spot orders. If a lien exists on the eWR, the bank
    repayment leg is always disbursed first; the remaining proceeds go to the producer.
  </div>

  <h3>Settlement Leg Sequence</h3>
  <p>Bank leg (if lien) → Platform leg → Producer leg. Each leg must be marked disbursed in order.
  Completing the final leg transfers eWR title to the buyer and issues a Digital Release Token.</p>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/settlements</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Initiates a settlement for a completed trade. Calculates all financial legs automatically: platform fee (2%), bank repayment (from linked loan if lien active), and producer net payout. The sum of all legs equals the gross trade value.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4>Transaction parties, <span class="role-badge">ENABLER</span><span class="role-badge financier">FINANCIER</span><span class="role-badge admin">ADMIN</span>
          <h4 style="margin-top:8px">Body</h4>
          <table>
            <thead><tr><th>Field</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td><code>entityType</code></td><td>ORDER | AUCTION | FORWARD <span class="req">REQUIRED</span></td></tr>
              <tr><td><code>entityId</code></td><td>integer <span class="req">REQUIRED</span></td></tr>
              <tr><td><code>loanId</code></td><td>integer <span class="opt">optional</span> — linked loan for repayment</td></tr>
              <tr><td><code>notes</code></td><td>string <span class="opt">optional</span></td></tr>
            </tbody>
          </table>
        </div>
        <div class="ep-col">
          <h4>Returns</h4>
          Settlement object with all legs: <code>bankLegUsd</code>, <code>platformFeeUsd</code>, <code>producerNetUsd</code>, <code>grossValueUsd</code>
          <h4 style="margin-top:10px">Errors</h4>
          <table class="error-row">
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td>409</td><td>Settlement already exists for this entity</td></tr>
              <tr><td>400</td><td>Loan/eWR mismatch</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/settlements/<span class="param">:settlementId</span>/disburse</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Confirms disbursement of a specific payment leg. Must follow the sequence: bank → platform → producer. Completing the final leg transfers eWR ownership to the buyer and issues a signed Digital Release Token in the response.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Roles</h4><span class="role-badge">ENABLER</span><span class="role-badge financier">FINANCIER</span><span class="role-badge admin">ADMIN</span>
          <h4 style="margin-top:8px">Body</h4>
          <code>leg</code>: "bank" | "platform" | "producer"
        </div>
        <div class="ep-col"><h4>Returns</h4>Updated settlement. On final leg: <code>releaseToken</code> (HMAC-signed) included in response</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/tea/lots/<span class="param">:id</span>/settlement</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns detailed settlement breakdown for a specific tea lot. Restricted to parties involved in the trade (owner, broker, buyer) and exchange admin.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4>Owner, broker, winning bidder, <span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Returns</h4>Settlement legs, status, prompt date, release token (if complete)</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ SECTION 12 ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num">12</div>
    <div class="section-title">Admin, Statistics &amp; Registry</div>
  </div>

  <h3>12.1 Administration</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/admin/users</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Lists and searches all registered users. Supports name/email/company filtering. Used for KYB management and tier overrides.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span><span class="role-badge">ENABLER</span><span class="role-badge financier">FINANCIER</span></div>
        <div class="ep-col"><h4>Query Params</h4><code>search</code>, <code>tier</code>, <code>kybStatus</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method patch">PATCH</span>
      <span class="endpoint-path">/admin/users/<span class="param">:id</span></span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Updates a user's tier or KYB status. The only pathway to change a user's tier after registration. KYB status controls whether a user can transact at higher values.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span></div>
        <div class="ep-col"><h4>Body</h4><code>tier</code> (enum, optional); <code>kybStatus</code>: PENDING | APPROVED | REJECTED</div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/admin/earnings</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns a summary of platform earnings: total platform fees collected (2% of trade value), escrow fees (0.5% on orders), and financing facilitation fees (0.5% of interest charged).</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span><span class="role-badge">ENABLER</span><span class="role-badge financier">FINANCIER</span></div>
        <div class="ep-col"><h4>Returns</h4><code>platformFeesUsd, escrowFeesUsd, financingFacilitationUsd, totalUsd</code></div>
      </div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/audit</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns audit log entries. Filterable by entity type and entity ID. All significant state changes (eWR creation, lien activation, settlement disbursement) produce audit entries.</div>
      <div class="ep-grid">
        <div class="ep-col"><h4>Roles</h4><span class="role-badge admin">ADMIN</span><span class="role-badge">ENABLER</span><span class="role-badge financier">FINANCIER</span></div>
        <div class="ep-col"><h4>Query Params</h4><code>entityType</code>, <code>entityId</code></div>
      </div>
    </div>
  </div>

  <h3>12.2 Market Statistics (Public Read)</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/stats/market-summary</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">High-level platform metrics: total value locked in eWRs, trade volume, active lot counts, and active user counts.</div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/stats/commodity-breakdown</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns eWR and trade volume statistics broken down by commodity type (Maize, Rice, Coffee, Tea, Avocado).</div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/stats/price-trends</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns clearing prices from historical auction lots, useful for benchmarking and price discovery.</div>
    </div>
  </div>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="endpoint-path">/stats/warehouse-distribution</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns inventory counts and values grouped by warehouse facility code. Useful for exchange-level capacity monitoring.</div>
    </div>
  </div>

  <h3>12.3 WRSC Registry Integration</h3>

  <div class="callout warn">
    <strong>Restricted surface.</strong> The eWRS external API is only mounted when
    <code>WRSC_SECRET</code>, <code>EWR_JWT_SECRET</code>, and <code>EWR_OAUTH_CLIENTS</code> are
    all configured. Never expose these credentials. The WRSC team manages the configuration
    directly with the exchange operator.
  </div>

  <table>
    <thead><tr><th>Endpoint</th><th>Auth</th><th>Purpose</th></tr></thead>
    <tbody>
      <tr><td><code>GET /ewr/master/counties</code></td><td>eWRS JWT</td><td>Reference list of counties for intake forms</td></tr>
      <tr><td><code>GET /ewr/master/commodity-types</code></td><td>eWRS JWT</td><td>Supported commodity types</td></tr>
      <tr><td><code>GET /ewr/master/harvest-seasons</code></td><td>eWRS JWT</td><td>Active and historical harvest seasons</td></tr>
      <tr><td><code>POST /webhooks/registry-sync</code></td><td>HMAC signature</td><td>Inbound lien status updates and title transfer confirmations from the WRSC registry</td></tr>
    </tbody>
  </table>

  <h3>12.4 Cooperative Endpoints</h3>

  <table>
    <thead><tr><th>Endpoint</th><th>Roles</th><th>Purpose</th></tr></thead>
    <tbody>
      <tr><td><code>GET /cooperatives/me</code></td><td>COOPERATIVE</td><td>Caller's cooperative profile and member list</td></tr>
      <tr><td><code>POST /cooperatives/me/macro-lots</code></td><td>COOPERATIVE</td><td>Create a macro-lot aggregating member deliveries by grade/season</td></tr>
      <tr><td><code>POST /cooperatives/me/macro-lots/:id/finalise</code></td><td>COOPERATIVE</td><td>Close a macro-lot for new intake entries</td></tr>
      <tr><td><code>POST /cooperatives/me/macro-lots/:id/request-ewr</code></td><td>COOPERATIVE</td><td>Mint a fungible eWR for a finalised macro-lot. Requires <code>warehouseCode</code>.</td></tr>
    </tbody>
  </table>

  <h3>12.5 File Storage</h3>

  <div class="endpoint no-break">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="endpoint-path">/storage/uploads/request-url</span>
      <span class="auth-badge clerk">Clerk JWT</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Returns a presigned upload URL for object storage. Use this to upload dispatch documents, warehouse reports, or other attachments before attaching the resulting URL to a dispatch doc record.</div>
      <div class="ep-grid">
        <div class="ep-col">
          <h4>Body</h4>
          <code>name</code> (string), <code>size</code> (integer, bytes), <code>contentType</code> (MIME string)
        </div>
        <div class="ep-col"><h4>Returns</h4><code>{ uploadUrl, objectPath }</code> — use <code>PUT uploadUrl</code> to upload the file directly</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════ APPENDIX ══ -->
<div class="section page-break">
  <div class="section-header keep-with-next">
    <div class="section-num" style="background:var(--gray-600)">A</div>
    <div class="section-title">Appendix — Common Enumerations</div>
  </div>

  <div class="ep-grid">
    <div>
      <h3>eWR States</h3>
      <table>
        <thead><tr><th>Value</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>INGESTED</code></td><td>Freshly minted; available for listing or financing</td></tr>
          <tr><td><code>MARKET_LISTED</code></td><td>Active lot exists against this eWR</td></tr>
          <tr><td><code>AUCTION_ACTIVE</code></td><td>Currently live in an auction session</td></tr>
          <tr><td><code>ENCUMBERED</code></td><td>Lien active (loan or forward contract)</td></tr>
          <tr><td><code>FORWARD_BOUND</code></td><td>Pledged to a forward contract (pre-co-sign)</td></tr>
          <tr><td><code>SETTLED</code></td><td>Title transferred — terminal</td></tr>
          <tr><td><code>EXTINGUISHED</code></td><td>Physically retired — terminal</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Lot Statuses</h3>
      <table>
        <thead><tr><th>Value</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>DRAFT</code></td><td>Created; not yet published to catalogue</td></tr>
          <tr><td><code>CATALOGUED</code></td><td>Published; visible in catalogue</td></tr>
          <tr><td><code>DISPATCHED</code></td><td>Pre-auction dispatch form attached</td></tr>
          <tr><td><code>LIVE</code></td><td>Active in an auction session</td></tr>
          <tr><td><code>SOLD</code></td><td>Winning bid accepted / fixed-price purchased</td></tr>
          <tr><td><code>UNSOLD</code></td><td>Auction closed; no bids placed</td></tr>
          <tr><td><code>RESERVE_NOT_MET</code></td><td>Bids placed but below reserve</td></tr>
          <tr><td><code>WITHDRAWN</code></td><td>Manually taken out of market</td></tr>
        </tbody>
      </table>
    </div>

    <div>
      <h3>Commodity Types</h3>
      <table>
        <thead><tr><th>Value</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>TEA</code></td><td>Supported via factory push + direct intake</td></tr>
          <tr><td><code>MAIZE</code></td><td>Grain; moisture &lt; 13.5% EAS 40</td></tr>
          <tr><td><code>RICE</code></td><td>Grain; moisture &lt; 14.5% EAS 5</td></tr>
          <tr><td><code>COFFEE</code></td><td>Moisture &lt; 12.5%</td></tr>
          <tr><td><code>AVOCADO</code></td><td>Cold-chain required; time-decay tracked</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">HTTP Status Codes</h3>
      <table class="error-row">
        <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>200</td><td>OK — resource returned</td></tr>
          <tr><td>201</td><td>Created — new resource</td></tr>
          <tr><td>400</td><td>Bad request — validation error in body</td></tr>
          <tr><td>401</td><td>Unauthenticated — missing or invalid token</td></tr>
          <tr><td>403</td><td>Forbidden — insufficient tier/role</td></tr>
          <tr><td>404</td><td>Not found</td></tr>
          <tr><td>409</td><td>Conflict — duplicate or state mismatch</td></tr>
          <tr><td>422</td><td>Grading standard not met</td></tr>
          <tr><td>500</td><td>Internal server error</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Listing Types</h3>
      <table>
        <thead><tr><th>Value</th><th>Price Field</th></tr></thead>
        <tbody>
          <tr><td><code>AUCTION</code></td><td><code>reservePriceUsd</code> (per kg)</td></tr>
          <tr><td><code>FIXED_PRICE</code></td><td><code>fixedPricePerKgUsd</code> (per kg)</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <hr/>
  <div style="text-align:center; margin-top:24px; color:var(--gray-400); font-size:8pt;">
    <p>TokenHarvest Tea Marketplace — API Integration Reference Guide v1.0</p>
    <p style="margin-top:4px;">© 2026 TokenHarvest. Confidential — Partners Only. Contact exchange@tokenharvest.io for access.</p>
  </div>
</div>

</body>
</html>`;

writeFileSync("/tmp/api-docs.html", html, "utf8");
console.log("HTML written:", html.length, "chars");
