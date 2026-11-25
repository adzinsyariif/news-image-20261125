// THE WORLD TODAY — Wednesday 25 November 2026.
// A front-page image drawn entirely from code: one 1024x1024 PNG that sums
// up the day's world news. No network, no assets, no fonts on disk — every
// pixel comes from the rasterizer below, so two runs write identical bytes.
//
// Stories (all first reported on Wednesday 25 November 2026, Reuters unless
// noted): Shenzhou-24 launches with the first Pakistani astronaut to reach
// China's Tiangong station; Zelenskyy confirms Ukraine struck Russian ships
// in the Gulf of Finland and off Benghazi; a Russian strike kills two in
// Odesa; Australia and the Solomon Islands sign a security pact; Beijing
// opens an investigation into Shanghai party chief Chen Jining; Washington
// pauses joint military operations with Ecuador; Australia apologises to
// LGBTQ veterans; markets wait on US inflation data ahead of the Fed.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas: a plain RGB pixel buffer with small drawing helpers.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function fill(r: RGB, x0: number, y0: number, x1: number, y1: number): void {
  const [r0, g0, b0] = r;
  const xa = Math.max(0, Math.floor(x0));
  const ya = Math.max(0, Math.floor(y0));
  const xb = Math.min(W, Math.ceil(x1));
  const yb = Math.min(H, Math.ceil(y1));
  for (let y = ya; y < yb; y++) {
    let i = (y * W + xa) * 3;
    for (let x = xa; x < xb; x++) {
      px[i] = r0; px[i + 1] = g0; px[i + 2] = b0;
      i += 3;
    }
  }
}

function dot(c: RGB, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function hline(c: RGB, x0: number, x1: number, y: number, t = 1): void {
  for (let k = 0; k < t; k++) fill(c, x0, y + k, x1, y + k + 1);
}

function vline(c: RGB, x: number, y0: number, y1: number, t = 1): void {
  for (let k = 0; k < t; k++) fill(c, x + k, y0, x + k + 1, y1);
}

function box(c: RGB, x0: number, y0: number, x1: number, y1: number, t = 1): void {
  hline(c, x0, x1, y0, t);
  hline(c, x0, x1, y1 - t, t);
  vline(c, x0, y0, y1, t);
  vline(c, x1 - t, y0, y1, t);
}

function disc(c: RGB, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) dot(c, cx + x, cy + y);
    }
  }
}

function line(c: RGB, x0: number, y0: number, x1: number, y1: number, t = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) dot(c, x + a, y + b);
  }
}

function tri(c: RGB, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)) / d;
      const b = ((x0 - x2) * (y - y2) - (x - x2) * (y0 - y2)) / d;
      if (a >= 0 && b >= 0 && a + b <= 1) dot(c, x, y);
    }
  }
}

// ---------------------------------------------------------------------------
// A 5x7 bitmap font, drawn from my own glyph table. Lowercase maps to the
// same capitals; unknown characters become a blank.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
};

function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}

function drawText(c: RGB, s: string, x: number, y: number, sc: number): void {
  const up = s.toUpperCase();
  for (let k = 0; k < up.length; k++) {
    const g = GLYPHS[up[k]] ?? GLYPHS[' '];
    const ox = x + k * 6 * sc;
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          fill(c, ox + col * sc, y + row * sc, ox + col * sc + sc, y + row * sc + sc);
        }
      }
    }
  }
}

function centerText(c: RGB, s: string, cx: number, y: number, sc: number): void {
  drawText(c, s, cx - Math.floor(textWidth(s, sc) / 2), y, sc);
}

// Greedy word wrap into lines no wider than maxW px at scale sc. Long words
// are broken on hyphens first, then character by character, so no single
// word can ever overflow its column.
function wrap(s: string, maxW: number, sc: number): string[] {
  const pieces: string[] = [];
  for (const w of s.split(' ')) {
    if (textWidth(w, sc) <= maxW) {
      pieces.push(w);
      continue;
    }
    // Break on hyphens, keeping the hyphen on the first half.
    const parts = w.split(/(?<=-)/);
    let ok = true;
    for (const p of parts) if (textWidth(p, sc) > maxW) ok = false;
    if (ok) {
      pieces.push(...parts);
      continue;
    }
    // Last resort: character-level chunks.
    let chunk = '';
    for (const ch of w) {
      if (textWidth(chunk + ch, sc) > maxW && chunk) {
        pieces.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    if (chunk) pieces.push(chunk);
  }
  const lines: string[] = [];
  let cur = '';
  for (const w of pieces) {
    const sep = cur && !cur.endsWith('-') ? ' ' : '';
    const trial = cur + sep + w;
    if (textWidth(trial, sc) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function para(c: RGB, s: string, x: number, y: number, maxW: number, sc: number, lh: number): number {
  const lines = wrap(s, maxW, sc);
  for (let i = 0; i < lines.length; i++) drawText(c, lines[i], x, y + i * lh, sc);
  return y + lines.length * lh;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const INK: RGB = [17, 17, 20];
const PAPER: RGB = [248, 244, 232];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [178, 34, 28];
const GOLD: RGB = [196, 141, 38];
const NAVY: RGB = [23, 52, 96];
const TEAL: RGB = [14, 110, 105];
const SKY: RGB = [122, 178, 214];
const DUSK: RGB = [38, 44, 66];
const GREY: RGB = [92, 92, 96];
const LIGHT: RGB = [232, 226, 210];
const PALE: RGB = [238, 233, 219];

// ---------------------------------------------------------------------------
// Small scene icons, drawn with shapes inside a panel.
// ---------------------------------------------------------------------------
function rocketIcon(x: number, y: number, s: number): void {
  // s = overall height in px
  const w = Math.round(s * 0.42);
  fill(WHITE, x, y + Math.round(s * 0.18), x + w, y + Math.round(s * 0.62));
  tri(RED, x, y + Math.round(s * 0.18), x + w, y + Math.round(s * 0.18), x + Math.round(w / 2), y);
  fill(NAVY, x, y + Math.round(s * 0.30), x + w, y + Math.round(s * 0.38));
  tri(RED, x, y + Math.round(s * 0.42), x - Math.round(w * 0.45), y + Math.round(s * 0.66), x, y + Math.round(s * 0.62));
  tri(RED, x + w, y + Math.round(s * 0.42), x + w + Math.round(w * 0.45), y + Math.round(s * 0.66), x + w, y + Math.round(s * 0.62));
  tri(GOLD, x + Math.round(w * 0.2), y + Math.round(s * 0.62), x + Math.round(w * 0.8), y + Math.round(s * 0.62), x + Math.round(w / 2), y + s);
  disc(NAVY, x + Math.round(w / 2), y + Math.round(s * 0.48), Math.max(3, Math.round(w * 0.16)));
}

function shipIcon(x: number, y: number, s: number): void {
  const w = Math.round(s * 1.5);
  fill(NAVY, x, y + Math.round(s * 0.45), x + w, y + Math.round(s * 0.72));
  tri(NAVY, x + Math.round(w * 0.78), y + Math.round(s * 0.45), x + w, y + Math.round(s * 0.45), x + w, y + Math.round(s * 0.72));
  vline(WHITE, x + Math.round(w * 0.3), y, y + Math.round(s * 0.45), 3);
  tri(RED, x + Math.round(w * 0.3), y, x + Math.round(w * 0.62), y + Math.round(s * 0.14), x + Math.round(w * 0.3), y + Math.round(s * 0.16));
  for (let k = 0; k < 3; k++) {
    line(SKY, x + k * Math.round(w * 0.2), y + Math.round(s * 0.82) + k * 4, x + Math.round(w * 0.5) + k * Math.round(w * 0.2), y + Math.round(s * 0.82) + k * 4, 3);
  }
}

function blastIcon(x: number, y: number, s: number): void {
  const cx = x + Math.round(s / 2);
  const cy = y + Math.round(s / 2);
  const r = Math.round(s / 2);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const x2 = Math.round(cx + Math.cos(a) * r);
    const y2 = Math.round(cy + Math.sin(a) * r);
    const x3 = Math.round(cx + Math.cos(a + Math.PI / 8) * (r * 0.45));
    const y3 = Math.round(cy + Math.sin(a + Math.PI / 8) * (r * 0.45));
    tri(k % 2 ? GOLD : RED, cx, cy, x2, y2, x3, y3);
  }
  disc(INK, cx, cy, Math.max(3, Math.round(r * 0.28)));
}

function globeIcon(x: number, y: number, s: number): void {
  const cx = x + Math.round(s / 2);
  const cy = y + Math.round(s / 2);
  const r = Math.round(s / 2);
  disc(TEAL, cx, cy, r);
  disc(PAPER, cx, cy, Math.max(4, r - 3));
  disc(TEAL, cx, cy, Math.max(4, r - 6));
  hline(PAPER, cx - r, cx + r, cy - Math.round(r * 0.4), 3);
  hline(PAPER, cx - r, cx + r, cy + Math.round(r * 0.4), 3);
  vline(PAPER, cx, cy - r, cy + r, 3);
}

function towerIcon(x: number, y: number, s: number): void {
  const w = Math.round(s * 0.45);
  fill(NAVY, x, y + Math.round(s * 0.1), x + w, y + s);
  for (let k = 0; k < 6; k++) {
    hline(GOLD, x + 3, x + w - 3, y + Math.round(s * 0.16) + k * Math.round(s * 0.14), 3);
  }
  tri(RED, x + Math.round(w * 0.2), y + Math.round(s * 0.1), x + Math.round(w * 0.8), y + Math.round(s * 0.1), x + Math.round(w / 2), y);
}

function chartIcon(x: number, y: number, s: number): void {
  const w = Math.round(s * 1.3);
  const h = s;
  hline(GREY, x, x + w, y + h - 4, 3);
  vline(GREY, x, y, y + h, 3);
  line(TEAL, x + 4, y + h - 14, x + Math.round(w * 0.35), y + Math.round(h * 0.55), 4);
  line(TEAL, x + Math.round(w * 0.35), y + Math.round(h * 0.55), x + Math.round(w * 0.65), y + Math.round(h * 0.62), 4);
  line(RED, x + Math.round(w * 0.65), y + Math.round(h * 0.62), x + w - 4, y + Math.round(h * 0.2), 4);
  disc(GOLD, x + w - 4, y + Math.round(h * 0.2), 5);
}

function flagIcon(x: number, y: number, s: number): void {
  vline(INK, x, y, y + s, 4);
  tri(RED, x + 4, y, x + Math.round(s * 1.1), y + Math.round(s * 0.2), x + 4, y + Math.round(s * 0.42));
  fill(NAVY, x + 4, y + Math.round(s * 0.42), x + Math.round(s * 1.1), y + Math.round(s * 0.5));
}

function scalesIcon(x: number, y: number, s: number): void {
  const cx = x + Math.round(s / 2);
  vline(INK, cx, y, y + Math.round(s * 0.8), 4);
  hline(INK, cx - Math.round(s * 0.45), cx + Math.round(s * 0.45), y + 4, 4);
  tri(GOLD, cx - Math.round(s * 0.45), y + Math.round(s * 0.55), cx - Math.round(s * 0.15), y + Math.round(s * 0.55), cx - Math.round(s * 0.3), y + Math.round(s * 0.85));
  tri(GOLD, cx + Math.round(s * 0.15), y + Math.round(s * 0.55), cx + Math.round(s * 0.45), y + Math.round(s * 0.55), cx + Math.round(s * 0.3), y + Math.round(s * 0.85));
  hline(INK, cx - Math.round(s * 0.4), cx + Math.round(s * 0.4), y + Math.round(s * 0.85), 4);
}

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------
function tagChip(x: number, y: number, label: string, bg: RGB): number {
  const w = textWidth(label, 2) + 16;
  fill(bg, x, y, x + w, y + 22);
  drawText(WHITE, label, x + 8, y + 4, 2);
  return w;
}

function panel(x0: number, y0: number, x1: number, y1: number): void {
  fill(WHITE, x0, y0, x1, y1);
  box(INK, x0, y0, x1, y1, 2);
}

function storyPanel(
  x0: number, y0: number, x1: number, y1: number,
  tag: string, tagBg: RGB,
  headline: string, deck: string,
  icon: (x: number, y: number, s: number) => void,
): void {
  panel(x0, y0, x1, y1);
  // Tag top-left, icon top-right; headline and deck run the full width.
  tagChip(x0 + 14, y0 + 10, tag, tagBg);
  const iconS = 44;
  const iconX = x1 - 14 - iconS - 8;
  const iconY = y0 + 8;
  fill(PALE, iconX - 5, iconY - 3, iconX + iconS + 5, iconY + iconS + 3);
  box(LIGHT, iconX - 5, iconY - 3, iconX + iconS + 5, iconY + iconS + 3, 1);
  icon(iconX, iconY, iconS);
  const tx = x0 + 14;
  const tw = x1 - 14 - tx;
  const hy = para(INK, headline, tx, y0 + 44, tw, 3, 26);
  para(GREY, deck, tx, hy + 8, tw, 2, 19);
}

// ---------------------------------------------------------------------------
// Compose the page
// ---------------------------------------------------------------------------
fill(PAPER, 0, 0, W, H);

// Masthead
fill(INK, 0, 0, W, 118);
fill(RED, 0, 118, W, 124);
centerText(WHITE, 'THE WORLD TODAY', W / 2, 14, 7);
centerText(GOLD, 'WEDNESDAY 25 NOVEMBER 2026', W / 2, 76, 4);

// Lead story: Shenzhou-24 (large, left)
{
  const x0 = 12, y0 = 136, x1 = 622, y1 = 428;
  panel(x0, y0, x1, y1);
  fill(DUSK, x0 + 2, y0 + 2, x1 - 2, y0 + 140);
  // Stars in the sky band.
  const stars: [number, number][] = [[40, 26], [120, 52], [210, 22], [300, 60], [380, 30], [470, 58], [540, 26], [160, 78], [440, 84], [90, 92], [250, 110], [500, 110]];
  for (const [sx, sy] of stars) disc(WHITE, x0 + sx, y0 + sy, 2);
  disc(GOLD, x0 + 520, y0 + 46, 16);
  rocketIcon(x0 + 66, y0 + 22, 84);
  tagChip(x0 + 190, y0 + 16, 'SPACE - LEAD', RED);
  drawText(WHITE, 'CHINA LAUNCHES', x0 + 190, y0 + 46, 4);
  drawText(WHITE, 'SHENZHOU-24', x0 + 190, y0 + 78, 4);
  drawText(WHITE, 'FIRST FOREIGNER ABOARD TIANGONG', x0 + 190, y0 + 116, 2);
  const hy = para(INK, 'Three astronauts lift off for Tiangong with a Pakistani aboard — a first for China\u2019s station.', x0 + 16, y0 + 148, x1 - x0 - 32, 3, 27);
  para(GREY, 'Launch from Jiuquan, Wednesday morning.', x0 + 16, hy + 10, x1 - x0 - 32, 2, 19);
  hline(GOLD, x0 + 16, x1 - 16, y1 - 30, 3);
  drawText(RED, 'CREW OF THREE - SIX MONTHS IN ORBIT', x0 + 16, y1 - 22, 2);
}

// Right column: one Ukraine panel holding both of the day's Ukraine stories.
{
  const x0 = 634, y0 = 136, x1 = 1012, y1 = 428;
  panel(x0, y0, x1, y1);
  tagChip(x0 + 14, y0 + 10, 'UKRAINE', NAVY);
  const iconS = 44;
  const iconX = x1 - 14 - iconS - 8;
  const iconY = y0 + 8;
  fill(PALE, iconX - 5, iconY - 3, iconX + iconS + 5, iconY + iconS + 3);
  box(LIGHT, iconX - 5, iconY - 3, iconX + iconS + 5, iconY + iconS + 3, 1);
  shipIcon(iconX, iconY, iconS);
  const tx = x0 + 14;
  const tw = x1 - 14 - tx;
  let y = para(INK, 'KYIV CONFIRMS SHIP STRIKES', tx, y0 + 44, tw, 3, 24);
  y = para(GREY, 'Zelenskyy says Ukraine hit a Russian cargo ship in the Gulf of Finland and sank a warship off Benghazi, Libya.', tx, y + 8, tw, 2, 18);
  hline(LIGHT, x0 + 16, x1 - 16, y + 12, 2);
  y = para(INK, 'ODESA: TWO KILLED', tx, y + 24, tw, 3, 24);
  para(GREY, 'A Russian strike kills two in Odesa; drones hit a Kyiv apartment block overnight, injuring two.', tx, y + 8, tw, 2, 18);
}

// Middle row: four panels
storyPanel(12, 440, 258, 692, 'PACIFIC', TEAL,
  'AUSTRALIA-SOLOMONS PACT',
  'Canberra signs a pact making it the Solomons\u2019 defence partner.',
  globeIcon);
storyPanel(270, 440, 516, 692, 'CHINA', NAVY,
  'SHANGHAI CHIEF PROBED',
  'Beijing investigates Shanghai chief Chen Jining, a Politburo member.',
  towerIcon);
storyPanel(528, 440, 774, 692, 'AMERICAS', RED,
  'US PAUSES ECUADOR OPS',
  'Washington halts joint operations with Ecuador while it probes a deadly raid.',
  flagIcon);
storyPanel(786, 440, 1012, 692, 'AUSTRALIA', TEAL,
  'LGBTQ VETERANS APOLOGY',
  'Australia apologises for decades of discrimination against LGBTQ troops.',
  scalesIcon);

// Bottom row: markets (left) + also today (right)
{
  const x0 = 12, y0 = 704, x1 = 560, y1 = 900;
  panel(x0, y0, x1, y1);
  tagChip(x0 + 14, y0 + 10, 'MARKETS', GOLD);
  chartIcon(x0 + 16, y0 + 46, 84);
  const tx = x0 + 150;
  const hy = para(INK, 'MARKETS WAIT ON US INFLATION', tx, y0 + 44, x1 - 14 - tx, 2, 19);
  para(GREY, 'Gold slips and the dollar steadies before US inflation data, out later today.', tx, hy + 8, x1 - 14 - tx, 2, 19);
  hline(LIGHT, x0 + 16, x1 - 16, y1 - 44, 2);
  drawText(INK, 'GOLD $3,545/OZ  -  BTC $59,508', x0 + 16, y1 - 32, 2);
}
{
  const x0 = 572, y0 = 704, x1 = 1012, y1 = 900;
  panel(x0, y0, x1, y1);
  tagChip(x0 + 14, y0 + 10, 'ALSO TODAY', INK);
  const items: [string, string][] = [
    ['USA', 'Trump pardons turkeys Freedom and Feathers.'],
    ['USA', 'Trump awards Giuliani the Medal of Freedom.'],
    ['FRANCE', 'Sarkozy corruption case ordered to trial.'],
  ];
  let y = y0 + 46;
  for (const [k, v] of items) {
    drawText(RED, k, x0 + 16, y + 2, 2);
    y = para(INK, v, x0 + 108, y, x1 - 16 - (x0 + 108), 2, 19) + 12;
  }
}

// Footer
fill(INK, 0, 912, W, H);
hline(GOLD, 0, W, 912, 4);
centerText(WHITE, 'WEDNESDAY 25 NOVEMBER 2026  -  EVERY STORY FIRST REPORTED THAT DAY', W / 2, 934, 2);
centerText(GREY, 'SOURCES: REUTERS, 25 NOV 2026  -  RFE/RL  -  DRAWN FROM CODE', W / 2, 962, 2);
centerText(GOLD, 'THE WORLD TODAY  -  ONE DAY, ONE PAGE', W / 2, 990, 2);

// ---------------------------------------------------------------------------
// PNG encoding: filter-0 scanlines, zlib stream, CRC32. Fully deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // 8-bit
ihdr[9] = 2; // RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
