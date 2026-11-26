// Render entry.png (1024x1024 broadsheet) from stories.json.
// Usage: node render.mjs
// Chrome binary: $CHROMIUM, else the puppeteer Chrome, else google-chrome/chromium.
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'stories.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const marketsHtml = data.markets.map((m) => {
  const arrow = m.delta.startsWith('+') ? '▲' : m.delta.startsWith('-') ? '▼' : '';
  const cls = m.up ? 'up' : 'down';
  return `<span class="tick"><span class="tlabel">${esc(m.label)}</span> <span class="tvalue">${esc(m.value)}</span> <span class="${cls}">${arrow}${esc(m.delta)}</span></span>`;
}).join('<span class="dot">·</span>');

const panelsHtml = data.panels.map((p) => `
  <section class="panel">
    <div class="pbar" style="background:${p.color}"></div>
    <h2 style="color:${p.color}">${esc(p.region)}</h2>
    <ul>
      ${p.stories.map((s) => `<li><span class="sq" style="background:${p.color}"></span><span>${esc(s)}</span></li>`).join('')}
    </ul>
  </section>`).join('');

const storyCount = data.panels.reduce((n, p) => n + p.stories.length, 0) + 1;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1024px; height:1024px; overflow:hidden; }
  body {
    font-family: "Noto Sans", "DejaVu Sans", sans-serif;
    background:#f6f1e7; color:#16130e;
    display:flex; flex-direction:column; padding:12px;
    gap:7px;
  }
  .masthead { background:#141210; color:#f6f1e7; padding:8px 16px 7px; text-align:center; }
  .masthead h1 {
    font-family:"Noto Serif","DejaVu Serif",serif; font-weight:800;
    font-size:46px; letter-spacing:2px; line-height:1;
  }
  .dateline {
    display:flex; justify-content:space-between; align-items:baseline;
    border-top:1px solid #c9a227; margin-top:5px; padding-top:4px;
  }
  .dateline .date { font-size:22px; font-weight:700; letter-spacing:1.2px; color:#e8c85a; }
  .dateline .meta { font-size:13px; letter-spacing:1.6px; color:#cfc8b8; }
  .markets {
    background:#1c2f52; color:#eef2fa; padding:6px 12px;
    font-size:17.5px; display:flex; justify-content:space-between; align-items:center;
  }
  .markets .tlabel { color:#9db4dd; font-weight:700; font-size:15px; letter-spacing:.6px; }
  .markets .tvalue { font-weight:700; }
  .markets .up { color:#7ee2a0; font-weight:700; }
  .markets .down { color:#ff9d8a; font-weight:700; }
  .markets .dot { color:#5a6f96; }
  .lead { background:#fffdf7; border:1px solid #d8d0bf; border-left:8px solid #b3271e; padding:6px 12px 7px; }
  .lead .kicker { color:#b3271e; font-weight:800; font-size:14px; letter-spacing:2px; }
  .lead .headline {
    font-family:"Noto Serif","DejaVu Serif",serif; font-weight:800;
    font-size:27px; line-height:1.12; margin:2px 0 2px;
  }
  .lead .sub { font-size:16.5px; color:#3d382e; }
  .grid { flex:1; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:repeat(4,1fr); gap:7px; min-height:0; }
  .panel { background:#fffdf7; border:1px solid #d8d0bf; padding:0 11px 4px; overflow:hidden; }
  .panel .pbar { height:5px; margin:0 -11px 4px; }
  .panel h2 { font-size:17px; font-weight:800; letter-spacing:1.1px; text-transform:uppercase; margin-bottom:2px; }
  .panel ul { list-style:none; }
  .panel li {
    display:flex; gap:7px; align-items:flex-start;
    font-size:16.5px; line-height:1.16; padding:0.5px 0;
  }
  .panel .sq { flex:0 0 auto; width:7px; height:7px; margin-top:6px; }
  .sport { background:#141210; color:#f6f1e7; padding:6px 12px 7px; white-space:nowrap; overflow:hidden; }
  .sport .stag { color:#e8c85a; font-weight:800; letter-spacing:2px; font-size:13px; }
  .sport .sline { font-size:16px; line-height:1.28; }
  .footer { font-size:11.5px; color:#6b6455; text-align:center; letter-spacing:.4px; margin-top:-2px; }
</style></head>
<body>
  <header class="masthead">
    <h1>THE WORLD TODAY</h1>
    <div class="dateline">
      <span class="date">${esc(data.dateLine.toUpperCase())}</span>
      <span class="meta">${storyCount} STORIES · ${data.panels.length} REGIONS · ONE PAGE</span>
    </div>
  </header>
  <div class="markets">${marketsHtml}</div>
  <div class="lead">
    <div class="kicker">${esc(data.lead.kicker)}</div>
    <div class="headline">${esc(data.lead.headline)}</div>
    <div class="sub">${esc(data.lead.sub)}</div>
  </div>
  <main class="grid">${panelsHtml}</main>
  <div class="sport">
    <span class="stag">SPORT&nbsp;&nbsp;</span><span class="sline">${esc(data.sport[0])}</span>
  </div>
  <div class="footer">Compiled from wire and regional reports dated Wednesday, 25 November 2026 · Markets: Wednesday closes</div>
</body></html>`;

const htmlPath = join(here, 'index.html');
const pngPath = join(here, 'entry.png');
writeFileSync(htmlPath, html);

const candidates = [
  process.env.CHROMIUM,
  '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome',
  'google-chrome',
  'chromium',
  'chromium-browser',
].filter(Boolean);
const chrome = candidates.find((c) => c.includes('/') ? existsSync(c) : true);
if (!chrome) { console.error('No Chrome binary found'); process.exit(1); }

execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1024,1024',
  '--virtual-time-budget=5000',
  `--screenshot=${pngPath}`,
  `file://${htmlPath}`,
], { stdio: 'inherit' });

const buf = readFileSync(pngPath);
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
console.log(`entry.png: ${w}x${h}, ${statSync(pngPath).size} bytes, ${storyCount} stories (incl. lead)`);
