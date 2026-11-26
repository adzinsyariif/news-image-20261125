// Render entry.png (1024x1024 broadsheet) from stories.json — v3.
// Usage: node render.mjs
// Chrome binary: $CHROMIUM, else the puppeteer Chrome, else google-chrome/chromium.
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'stories.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- markets ticker ----------
const tickerHtml = data.markets.map((m) => {
  const arrow = m.delta.startsWith('+') ? '▲' : m.delta.startsWith('-') ? '▼' : '';
  const cls = m.up ? 'up' : 'down';
  return `<span class="tick"><span class="tlabel">${esc(m.label)}</span> <span class="tvalue">${esc(m.value)}</span> <span class="${cls}">${arrow}${esc(m.delta)}</span></span>`;
}).join('<span class="dot">·</span>');

// ---------- timeline strip ----------
const timelineHtml = data.timeline.map((t) => `
  <div class="tl-col">
    <div class="tl-dot"></div>
    <div class="tl-when">${esc(t.when)}</div>
    <div class="tl-what">${esc(t.what)}</div>
  </div>`).join('');

// ---------- region panels ----------
const panelsHtml = data.panels.map((p) => `
  <section class="panel" style="border-top-color:${p.color}">
    <h3 style="color:${p.color}">${esc(p.region)}</h3>
    <ul>
      ${p.stories.map((s) => `<li><span class="sq" style="background:${p.color}"></span><span class="hl">${esc(s.h)}</span> <span class="src">${esc(s.s)}</span></li>`).join('')}
    </ul>
  </section>`).join('');

// ---------- world dot map (locator) ----------
// Coarse dot-matrix world map, 44 cols x 21 rows. Letters = regions:
// N North America, L Latin America, E Europe, M Middle East,
// A Africa, P Asia-Pacific, O Oceania. '.' = ocean.
const MAP_ROWS = [
  '..NNNNNNNNNNN........EEEEEPPPPPPPPPPPPPPPPP.',
  '.NNNNNNNNNNNNN......EEEEEEEPPPPPPPPPPPPPPPP.',
  'NNNNNNNNNNNNNN......EEEEEEEPPPPPPPPPPPPPPPP.',
  'NNNNNNNNNNNNN.......EEEEEEEEPPPPPPPPPPPPPPP.',
  '.NNNNNNNNNNN........EEEEEEEPPPPPPPPPPPPPPP..',
  '.NNNNNNNNNN.........EEEEEE..PPPPPPPPPPPPPP..',
  '..NNNNNNNN..........EEEEE.MMPPPPPPPPPPPP....',
  '...NNNNNN...........EEEE.MMMMPPPPPPPPPP.....',
  '...NNNNN............EEE..MMMMMMPPPPPPPP.....',
  '....NNNN............EEE..MMMMMMPPPPPPP......',
  '....NNN...................MMMMMMPPPPP.......',
  '.....NN..............AAAAAMMMMM.PPPP........',
  '.....NN.............AAAAAAAAA....PPP........',
  '......LLL...........AAAAAAAAAA....PPP.......',
  '......LLLLL.........AAAAAAAAAA....PPPP......',
  '.......LLLLL........AAAAAAAAA......PPP......',
  '.......LLLLL........AAAAAAAA.........OOOO...',
  '.......LLLL..........AAAAAAA.........OOOOO..',
  '........LL...........AAAAAA..........OOOOOO.',
  '........L.............AAAA............OOOO.O',
  '.......................AA.................OO',
];
const REGION_COLORS = {
  N: '#2456a6', L: '#b05c1e', E: '#0e7a6d', M: '#b3271e',
  A: '#9a7b12', P: '#6d3fc0', O: '#1f7a9e',
};
const CELL = 5.9;
let mapDots = '';
MAP_ROWS.forEach((rowStr, r) => {
  const row = rowStr.padEnd(44, '.').slice(0, 44);
  [...row].forEach((ch, c) => {
    const color = REGION_COLORS[ch];
    if (color) {
      mapDots += `<circle cx="${(c * CELL + CELL / 2).toFixed(1)}" cy="${(r * CELL + CELL / 2).toFixed(1)}" r="2.3" fill="${color}"/>`;
    }
  });
});
const mapW = 44 * CELL;
const mapH = MAP_ROWS.length * CELL;
const legendHtml = [
  ['N', 'N. America'], ['L', 'Latin Am.'], ['E', 'Europe'], ['M', 'Mid. East'],
  ['A', 'Africa'], ['P', 'Asia-Pacific'], ['O', 'Oceania'],
].map(([k, label]) => `<span class="lg"><span class="lg-dot" style="background:${REGION_COLORS[k]}"></span>${label}</span>`).join('');

// ---------- markets day-move chart ----------
const chartRows = data.markets.filter((m) => m.move !== null);
const MAXMOVE = 3.5;
const HALF = 92; // px for MAXMOVE
const chartHtml = chartRows.map((m) => {
  const w = Math.max(3, Math.round((Math.abs(m.move) / MAXMOVE) * HALF));
  const bar = m.move >= 0
    ? `<span class="bar pos" style="left:50%;width:${w}px"></span>`
    : `<span class="bar neg" style="right:50%;width:${w}px"></span>`;
  const cls = m.up ? 'up' : 'down';
  return `<div class="crow"><span class="clabel">${esc(m.label)}</span><span class="ctrack">${bar}<span class="czero"></span></span><span class="cval ${cls}">${esc(m.delta)}</span></div>`;
}).join('');

// ---------- by the numbers ----------
const numbersHtml = data.numbers.map((n) => `
  <div class="num"><span class="num-n">${esc(n.n)}</span><span class="num-t">${esc(n.t)}</span></div>`).join('');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1024px; height:1024px; background:#f8f4ec; color:#1a1a1a;
         font-family:"Liberation Sans","Noto Sans",sans-serif; overflow:hidden; }
  .page { display:flex; flex-direction:column; height:1024px; padding:0 0 8px; }

  /* masthead */
  .masthead { background:#111; color:#f5efe0; padding:14px 28px 10px; }
  .masthead h1 { font-family:"Liberation Serif","Noto Serif",serif; font-size:46px; font-weight:700;
                 letter-spacing:6px; text-align:center; line-height:1.05; }
  .mast-sub { display:flex; justify-content:space-between; align-items:baseline; margin-top:6px;
              border-top:1px solid #c9a227; padding-top:6px; }
  .mast-date { color:#e8c33c; font-weight:700; font-size:17px; letter-spacing:2px; }
  .mast-count { color:#cfc8b8; font-size:11px; letter-spacing:2px; }

  /* ticker */
  .ticker { background:#14264a; color:#e8ecf4; padding:7px 16px; font-size:13px;
            display:flex; justify-content:space-between; align-items:center; }
  .tlabel { color:#9fb4d8; font-size:10.5px; letter-spacing:1px; }
  .tvalue { font-weight:700; font-size:14px; }
  .up { color:#3ddc84; } .down { color:#ff7a6b; }
  .ticker .dot { color:#5a6f96; }

  /* lead */
  .lead { padding:8px 28px 7px; border-bottom:3px double #1a1a1a; }
  .lead .kicker { color:#b3271e; font-size:11px; font-weight:700; letter-spacing:2.5px; }
  .lead h2 { font-family:"Liberation Serif","Noto Serif",serif; font-size:31px; font-weight:700;
             line-height:1.12; margin:3px 0 4px; }
  .lead .sub { font-size:13.5px; color:#444; }
  .lead .src { font-size:10px; color:#8a8378; text-transform:uppercase; letter-spacing:1px; }

  /* timeline */
  .timeline { display:flex; gap:0; padding:8px 20px 6px; background:#efe9da;
              border-bottom:1px solid #d8d0bd; position:relative; }
  .timeline::before { content:""; position:absolute; left:32px; right:32px; top:15px;
                      border-top:2px solid #b9ad8f; }
  .tl-col { flex:1; padding:0 8px; position:relative; }
  .tl-dot { width:9px; height:9px; border-radius:50%; background:#b3271e; margin:0 auto 5px;
            border:2px solid #efe9da; position:relative; z-index:1; }
  .tl-when { font-size:9.5px; font-weight:700; letter-spacing:1.5px; color:#7a6c3f;
             text-align:center; margin-bottom:3px; }
  .tl-what { font-size:10.5px; line-height:1.3; text-align:center; color:#2a2a2a; }

  /* main */
  .main { display:flex; gap:12px; padding:10px 16px 2px; flex:1; min-height:0; }
  .panels { flex:1; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:repeat(4,1fr); gap:8px 14px; min-height:0; }
  .panel { border-top:3px solid #999; padding-top:5px; }
  .panel h3 { font-size:14px; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px;
              font-family:"Liberation Serif","Noto Serif",serif; font-weight:700; }
  .panel ul { list-style:none; }
  .panel li { font-size:12.2px; line-height:1.34; margin-bottom:3px; display:flex; gap:5px; }
  .sq { width:6px; height:6px; flex:none; margin-top:4.5px; }
  .hl { font-family:"Liberation Serif","Noto Serif",serif; }
  .src { font-size:8.5px; color:#9a937f; text-transform:uppercase; letter-spacing:.6px; white-space:nowrap; }

  /* right rail */
  .rail { width:276px; flex:none; display:flex; flex-direction:column; gap:12px; justify-content:space-between; }
  .box { border:1px solid #d8d0bd; background:#fffdf6; padding:8px 10px; }
  .box h4 { font-size:10.5px; letter-spacing:2px; color:#7a6c3f; border-bottom:1px solid #e3dcc8;
            padding-bottom:5px; margin-bottom:7px; text-transform:uppercase; }
  .legend { display:flex; flex-wrap:wrap; gap:3px 8px; margin-top:6px; }
  .lg { font-size:9px; color:#555; display:flex; align-items:center; gap:3px; }
  .lg-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
  .map-note { font-size:8.5px; color:#9a937f; margin-top:4px; }

  .crow { display:flex; align-items:center; gap:6px; margin-bottom:5px; font-size:10.5px; }
  .clabel { width:52px; flex:none; color:#555; font-size:9.5px; letter-spacing:.5px; }
  .ctrack { flex:1; position:relative; height:11px; background:#f1ebdb; }
  .bar { position:absolute; top:1px; height:9px; }
  .bar.pos { background:#2e9e5b; } .bar.neg { background:#c0392b; }
  .czero { position:absolute; left:50%; top:0; width:1px; height:11px; background:#8a8378; }
  .cval { width:40px; flex:none; text-align:right; font-weight:700; font-size:10px; }
  .cval.up { color:#2e9e5b; } .cval.down { color:#c0392b; }

  .num { display:flex; gap:8px; align-items:baseline; margin-bottom:6px; }
  .num-n { font-family:"Liberation Serif","Noto Serif",serif; font-size:19px; font-weight:700;
           color:#14264a; min-width:74px; }
  .num-t { font-size:10.5px; color:#444; line-height:1.25; }

  /* sport + footer */
  .sport { background:#111; color:#f5efe0; margin:6px 16px 0; padding:7px 14px; font-size:12px;
           display:flex; gap:12px; align-items:center; }
  .sport .stag { color:#e8c33c; font-weight:700; letter-spacing:2px; font-size:11px; }
  .footer { text-align:center; font-size:9.5px; color:#8a8378; padding:6px 16px 0; letter-spacing:.4px; }
</style></head>
<body><div class="page">
  <header class="masthead">
    <h1>THE WORLD TODAY</h1>
    <div class="mast-sub">
      <span class="mast-date">${esc(data.dateLine.toUpperCase())}</span>
      <span class="mast-count">49 STORIES · 8 REGIONS · ONE PAGE</span>
    </div>
  </header>
  <div class="ticker">${tickerHtml}</div>
  <section class="lead">
    <div class="kicker">${esc(data.lead.kicker)}</div>
    <h2>${esc(data.lead.headline)}</h2>
    <div class="sub">${esc(data.lead.sub)} <span class="src">— ${esc(data.lead.src)}</span></div>
  </section>
  <section class="timeline">${timelineHtml}</section>
  <div class="main">
    <div class="panels">${panelsHtml}</div>
    <aside class="rail">
      <div class="box">
        <h4>Where it happened</h4>
        <svg width="${mapW.toFixed(0)}" height="${mapH.toFixed(0)}" viewBox="0 0 ${mapW.toFixed(1)} ${mapH.toFixed(1)}">${mapDots}</svg>
        <div class="legend">${legendHtml}</div>
        <div class="map-note">Science · Tech · Culture stories are global.</div>
      </div>
      <div class="box">
        <h4>Markets — day move %</h4>
        ${chartHtml}
      </div>
      <div class="box">
        <h4>By the numbers</h4>
        ${numbersHtml}
      </div>
    </aside>
  </div>
  <div class="sport"><span class="stag">SPORT</span><span>${esc(data.sport)}</span></div>
  <div class="footer">${esc(data.footer)}</div>
</div></body></html>`;

const htmlPath = '/tmp/news25v3-index.html';
const pngPath = join(here, 'entry.png');
writeFileSync(htmlPath, html);

const chrome = [
  process.env.CHROMIUM,
  '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome',
  'google-chrome', 'chromium', 'chromium-browser',
].find((c) => c && (c.includes('/') ? existsSync(c) : true));

execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1024,1024',
  '--default-background-color=00000000',
  `--screenshot=${pngPath}`,
  `file://${htmlPath}`,
], { stdio: 'inherit' });

const buf = readFileSync(pngPath);
const sha = createHash('sha256').update(buf).digest('hex');
console.log(`entry.png ${statSync(pngPath).size} bytes sha256 ${sha}`);
