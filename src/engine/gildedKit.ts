// Gilded Illumination (Lemo-Opuscar) deterministic Canvas 2D rendering kit
// Flat mineral pigments + firm iron-gall ink outlines + white-lead pearls/dots
// + real tiled gold leaf laid in squares with per-square tilt & glint mask.

export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const seg = (t: number, a: number, b: number): number =>
  b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a));
export const ss = (t: number): number => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
export const eio = (t: number): number => {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const eo = (t: number): number => 1 - Math.pow(1 - clamp(t), 3);
export const ei = (t: number): number => Math.pow(clamp(t), 3);
export const popS = (x: number, k = 1): number =>
  x <= 0 ? 0 : 1 - Math.exp((-x * 10) / k) * Math.cos((x * 15) / k);

export function mulberry(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function h2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnT(x: number, y: number, p: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const m = (k: number) => ((k % p) + p) % p;
  const a = h2(m(xi), m(yi));
  const b = h2(m(xi + 1), m(yi));
  const c = h2(m(xi), m(yi + 1));
  const d = h2(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmT(x: number, y: number, p: number, oct = 4): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    s += a * vnT(x, y, p);
    x *= 2;
    y *= 2;
    p *= 2;
    a *= 0.5;
  }
  return s;
}

// Mineral pigment palette (STYLE.md §3)
export const PAL = {
  ULTRA: '#1e328d',
  ULTRA_D: '#121d5c',
  ULTRA_NIGHT: '#15236b',
  LAPIS: '#2546a2',
  LAPIS_D: '#162d73',
  LAPIS_L: '#4f74c8',
  VERM: '#c8321f',
  VERM_D: '#8b1d11',
  VERM_L: '#e65e3e',
  VERDI: '#388570',
  VERDI_D: '#215748',
  VERD: '#2e6839',
  VERD_D: '#1c4424',
  VERD_L: '#5c9550',
  AZUR: '#3a7aa0',
  AZUR_D: '#255576',
  ROSE: '#c96f78',
  ROSE_D: '#94434e',
  CORAL: '#b96552',
  CORAL_D: '#823f32',
  LILAC: '#9c8ebd',
  LILAC_D: '#645687',
  OCHRE: '#c98e3d',
  OCHRE_D: '#8d5b1f',
  WOOD: '#6e4322',
  WOOD_D: '#462812',
  BOLE: '#a4422a',
  INK: '#24160e',
  GALL: '#3b2416',
  WHITE: '#fbf5e6',
  VELL: '#efe2c4',
  VELL_D: '#c7b082',
};

export interface LightSource {
  type: 'r' | 'b' | 'o';
  x: number;
  y: number;
  a: number;
  r?: number;
  nx?: number;
  ny?: number;
  w?: number;
  rad?: number;
}

export interface GoldPoint {
  x: number;
  y: number;
  r: number;
  k: number;
}

export interface GildedTextures {
  goldC: HTMLCanvasElement;
  spkC: HTMLCanvasElement;
  grainC: HTMLCanvasElement;
}

let cachedTex: GildedTextures | null = null;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

export function getTextures(): GildedTextures {
  if (cachedTex) return cachedTex;

  // 1. Tileable burnished gold-leaf body (384x384, fast to init and rich)
  const gw = 384;
  const goldC = makeCanvas(gw, gw);
  const gg = goldC.getContext('2d')!;
  const gim = gg.createImageData(gw, gw);
  const gd = gim.data;
  for (let y = 0; y < gw; y++) {
    for (let x = 0; x < gw; x++) {
      const n = fbmT((x / gw) * 18, (y / gw) * 18, 18, 4);
      const m = vnT((x / gw) * 144, (y / gw) * 144, 144);
      const st = vnT((x / gw) * 6, (y / gw) * 48, 6);
      const v = 0.72 + 0.34 * (n - 0.5) + 0.1 * (m - 0.5) + 0.08 * (st - 0.5);
      const i = (y * gw + x) * 4;
      gd[i] = clamp(214 * v + 38, 0, 255);
      gd[i + 1] = clamp(163 * v + 18, 0, 255);
      gd[i + 2] = clamp(60 * v + 4, 0, 255);
      gd[i + 3] = 255;
    }
  }
  gg.putImageData(gim, 0, 0);

  // 2. Tileable fine specks for gold and vellum
  const sw = 256;
  const spkC = makeCanvas(sw, sw);
  const sg = spkC.getContext('2d')!;
  const sim = sg.createImageData(sw, sw);
  const sd = sim.data;
  const rs = mulberry(91);
  for (let i = 0; i < sw * sw; i++) {
    const r = rs();
    const v = r < 0.045 ? 255 : r > 0.955 ? 0 : 128;
    sd[i * 4] = sd[i * 4 + 1] = sd[i * 4 + 2] = v;
    sd[i * 4 + 3] = v === 128 ? 0 : 68;
  }
  sg.putImageData(sim, 0, 0);

  // 3. Coarse mineral pigment granules (lapis ultramarine powder)
  const mw = 384;
  const grainC = makeCanvas(mw, mw);
  const mg = grainC.getContext('2d')!;
  const mim = mg.createImageData(mw, mw);
  const md = mim.data;
  const rm = mulberry(5);
  for (let y = 0; y < mw; y++) {
    for (let x = 0; x < mw; x++) {
      const n = vnT(x / 7, y / 7, 54);
      const m = vnT(x / 2.2, y / 2.2, 174);
      const r = rm();
      const v = 128 + 68 * (n - 0.5) + 38 * (m - 0.5) + (r < 0.05 ? 65 : r > 0.95 ? -65 : 0);
      const i = (y * mw + x) * 4;
      md[i] = md[i + 1] = md[i + 2] = clamp(v, 0, 255);
      md[i + 3] = 255;
    }
  }
  mg.putImageData(mim, 0, 0);

  cachedTex = { goldC, spkC, grainC };
  return cachedTex;
}

// Leaf grid constants
export const LS = 96;
export const rowOff = (j: number): number => h2(j, 77) * LS;
export const leafTilt = (i: number, j: number): number => h2(i * 7 + 3, j * 13 + 5) * TAU;
export const leafTone = (i: number, j: number): number => h2(i * 11 + 1, j * 5 + 9);

export class GildedCtx {
  ctx: CanvasRenderingContext2D;
  maskCanvas: HTMLCanvasElement;
  maskCtx: CanvasRenderingContext2D;
  glowCanvas: HTMLCanvasElement;
  glowCtx: CanvasRenderingContext2D;
  glowData: Float32Array;
  glowImg: ImageData;
  w: number;
  h: number;
  dim = 0.55;
  lwk = 1.25;
  lwh = 1.15;
  goldPat: CanvasPattern;
  spkPat: CanvasPattern;
  grainPat: CanvasPattern;
  goldPoints: GoldPoint[] = [];
  maskCol = '#ffffff';

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.maskCanvas = makeCanvas(w, h);
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;
    this.glowCanvas = makeCanvas(w / 4, h / 4);
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.glowData = new Float32Array((w / 4) * (h / 4));
    this.glowImg = this.glowCtx.createImageData(w / 4, h / 4);
    const tex = getTextures();
    this.goldPat = ctx.createPattern(tex.goldC, 'repeat')!;
    this.spkPat = ctx.createPattern(tex.spkC, 'repeat')!;
    this.grainPat = ctx.createPattern(tex.grainC, 'repeat')!;
  }

  beginFrame(dim = 0.55) {
    this.dim = dim;
    this.goldPoints = [];
    this.maskCol = '#ffffff';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.maskCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.maskCtx.clearRect(0, 0, this.w, this.h);
  }

  setZoom(z: number) {
    this.lwk = Math.max(0.85, 1.45 * Math.pow(z, -0.58));
    this.lwh = Math.pow(this.lwk, 0.7);
  }

  pushFlash(x: number, y: number, r: number, k = 1) {
    this.goldPoints.push({ x, y, r, k });
  }

  // Fill mineral granular ultramarine sky ground
  fillUltramarineGround(x: number, y: number, w: number, h: number, base = PAL.ULTRA) {
    const g = this.ctx;
    g.save();
    g.fillStyle = base;
    g.fillRect(x, y, w, h);
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.28;
    g.fillStyle = this.grainPat;
    g.fillRect(x, y, w, h);
    g.restore();
  }

  ink(path: Path2D, w = 2.6, col = PAL.INK) {
    const g = this.ctx;
    g.strokeStyle = col;
    g.lineWidth = w * this.lwk;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke(path);
  }

  rimShade(path: Path2D, col: string, w: number) {
    const g = this.ctx;
    g.save();
    g.clip(path);
    g.strokeStyle = col;
    g.lineWidth = w * this.lwk;
    g.lineJoin = 'round';
    g.stroke(path);
    g.restore();
  }

  shape(path: Path2D, fill: string, rimCol?: string, rimW = 8, lw = 2.6) {
    const g = this.ctx;
    g.fillStyle = fill;
    g.fill(path);
    if (rimCol) this.rimShade(path, rimCol, rimW);
    if (lw > 0) this.ink(path, lw, PAL.INK);
  }

  hiLine(pts: [number, number][], w = 2.0, a = 0.85) {
    if (pts.length < 2) return;
    const g = this.ctx;
    g.strokeStyle = `rgba(255,250,234,${a})`;
    g.lineWidth = w * this.lwh;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  }

  triad(x: number, y: number, r = 2.6, a = 0.9, rot = 0) {
    const g = this.ctx;
    g.fillStyle = `rgba(255,250,236,${a})`;
    const rr = r * this.lwh;
    for (let k = 0; k < 3; k++) {
      const an = rot + (k * TAU) / 3 - Math.PI / 2;
      g.beginPath();
      g.arc(x + Math.cos(an) * rr * 1.55, y + Math.sin(an) * rr * 1.55, rr, 0, TAU);
      g.fill();
    }
  }

  pearls(cx: number, cy: number, R: number, n: number, r = 2.8, a = 0.92, a0 = 0, a1 = TAU) {
    const g = this.ctx;
    g.fillStyle = `rgba(255,250,236,${a})`;
    const rr = r * Math.sqrt(this.lwh);
    for (let i = 0; i < n; i++) {
      const an = a0 + ((a1 - a0) * (i + 0.5)) / n;
      g.beginPath();
      g.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, rr, 0, TAU);
      g.fill();
    }
  }

  pearlLine(pts: [number, number][], gap: number, r = 2.5, a = 0.9) {
    const L = arclen(pts);
    const total = L[L.length - 1];
    if (total < 1) return;
    const n = Math.max(1, Math.floor(total / gap));
    const g = this.ctx;
    g.fillStyle = `rgba(255,250,236,${a})`;
    const rr = r * Math.sqrt(this.lwh);
    for (let k = 0; k <= n; k++) {
      const q = alongPath(pts, L, k * gap + (total - n * gap) / 2);
      g.beginPath();
      g.arc(q.x, q.y, rr, 0, TAU);
      g.fill();
    }
  }

  // Real gold leaf laid in staggered squares + seams + red bole + glint mask registration
  leaf(
    path: Path2D,
    box: [number, number, number, number],
    opts: {
      dim?: number;
      lw?: number;
      rimW?: number;
      scale?: number;
      rule?: CanvasFillRule;
      nomask?: boolean;
      screenSpace?: boolean;
      punched?: boolean;
    } = {}
  ) {
    const g = this.ctx;
    const d = opts.dim ?? this.dim;
    const scale = opts.scale ?? 1;
    const rule = opts.rule ?? 'nonzero';
    g.save();
    g.clip(path, rule);
    g.fillStyle = this.goldPat;
    g.fillRect(box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4);

    // Leaf squares + seams + bole corners
    const S = LS * scale;
    const x0 = box[0] - 2;
    const y0 = box[1] - 2;
    const x1 = box[0] + box[2] + 2;
    const y1 = box[1] + box[3] + 2;
    const j0 = Math.floor(y0 / S);
    const j1 = Math.floor(y1 / S);
    const tr = g.getTransform();
    const px = tr.a || tr.b ? 1 / Math.hypot(tr.a, tr.b) : 1;
    const amp = 0.055 + 0.055 * d;

    for (let j = j0; j <= j1; j++) {
      const oy = j * S;
      const ox = rowOff(j) * scale;
      const i0 = Math.floor((x0 + ox) / S);
      const i1 = Math.floor((x1 + ox) / S);
      for (let i = i0; i <= i1; i++) {
        const sx = i * S - ox;
        const tone = leafTone(i, j) - 0.5;
        g.fillStyle =
          tone > 0
            ? `rgba(255,236,170,${(tone * 2 * amp).toFixed(3)})`
            : `rgba(70,38,4,${(-tone * 2.5 * amp).toFixed(3)})`;
        g.fillRect(sx, oy, S, S);

        const th = leafTilt(i, j);
        const cxs = sx + S * 0.5;
        const cys = oy + S * 0.5;
        const gr = g.createLinearGradient(
          cxs - Math.cos(th) * S * 0.6,
          cys - Math.sin(th) * S * 0.6,
          cxs + Math.cos(th) * S * 0.6,
          cys + Math.sin(th) * S * 0.6
        );
        gr.addColorStop(0, 'rgba(255,244,200,0)');
        gr.addColorStop(0.55, `rgba(255,244,200,${(0.08 * (1 - 0.55 * d)).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(80,44,4,0.08)');
        g.fillStyle = gr;
        g.fillRect(sx, oy, S, S);

        // Occasional red bole flake at corner
        if (h2(i * 3 + 7, j * 17 + 2) < 0.16) {
          const R = mulberry(i * 131 + j * 977);
          const bx = sx + (R() < 0.5 ? 0 : S);
          const by = oy + (R() < 0.5 ? 0 : S);
          g.fillStyle = `rgba(132,46,24,${(0.42 + 0.18 * d).toFixed(2)})`;
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU;
            const r = S * (0.03 + R() * 0.045);
            if (k === 0) g.moveTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
            else g.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
          }
          g.fill();
        }
      }
    }

    // Seams: dark line + bright overlap ridge
    const sw = Math.max(Math.min(0.8 * scale, 5 * px), 1.15 * px);
    const so = Math.max(Math.min(1.3 * scale, 8 * px), 1.65 * px);
    g.lineCap = 'butt';
    for (const pass of [0, 1]) {
      g.strokeStyle = pass
        ? `rgba(255,240,190,${(0.42 * (1 - 0.5 * d)).toFixed(2)})`
        : 'rgba(84,44,6,0.62)';
      g.lineWidth = pass ? sw * 0.8 : sw;
      g.beginPath();
      for (let j = j0; j <= j1 + 1; j++) {
        const y = j * S + (pass ? so : 0);
        g.moveTo(x0, y);
        g.lineTo(x1, y);
      }
      for (let j = j0; j <= j1; j++) {
        const oy = j * S;
        const ox = rowOff(j) * scale;
        const i0 = Math.floor((x0 + ox) / S);
        const i1 = Math.floor((x1 + ox) / S);
        for (let i = i0; i <= i1 + 1; i++) {
          const x = i * S - ox + (pass ? so : 0);
          g.moveTo(x, oy);
          g.lineTo(x, oy + S);
        }
      }
      g.stroke();
    }

    // Burnish diagonal sheen
    const k = 1 - 0.72 * d;
    const gr = g.createLinearGradient(box[0], box[1], box[0] + box[2], box[1] + box[3]);
    gr.addColorStop(0, 'rgba(255,240,170,0)');
    gr.addColorStop(0.32, `rgba(255,246,190,${(0.28 * k).toFixed(3)})`);
    gr.addColorStop(0.66, 'rgba(90,50,0,0.2)');
    gr.addColorStop(0.86, `rgba(255,236,160,${(0.22 * k).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(90,50,0,0.2)');
    g.fillStyle = gr;
    g.fillRect(box[0], box[1], box[2], box[3]);

    // Dark night resting state (mirrors blue night)
    if (d > 0) {
      g.fillStyle = `rgba(48,28,10,${(0.38 * d).toFixed(3)})`;
      g.fillRect(box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4);
      g.fillStyle = `rgba(28,42,92,${(0.1 * d).toFixed(3)})`;
      g.fillRect(box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4);
    }

    // Specks
    g.globalAlpha = 0.42;
    g.fillStyle = this.spkPat;
    g.fillRect(box[0], box[1], box[2], box[3]);
    g.globalAlpha = 1;

    // Optional punched diaper dots
    if (opts.punched) {
      const step = 18 * scale;
      g.fillStyle = 'rgba(92,48,8,0.45)';
      for (let py = box[1] + step * 0.5; py < box[1] + box[3]; py += step) {
        const shift = (Math.floor(py / step) % 2) * (step * 0.5);
        for (let px0 = box[0] + shift; px0 < box[0] + box[2]; px0 += step) {
          g.beginPath();
          g.arc(px0, py, 1.5 * scale, 0, TAU);
          g.fill();
        }
      }
    }

    // Inner dark burnish rim
    g.strokeStyle = 'rgba(108,56,6,0.52)';
    g.lineWidth = (opts.rimW ?? 5.5) * this.lwk;
    g.stroke(path);
    g.restore();

    if ((opts.lw ?? 2.4) > 0) this.ink(path, opts.lw ?? 2.4, PAL.INK);

    if (!opts.nomask) {
      this.maskCtx.save();
      this.maskCtx.setTransform(g.getTransform());
      this.maskCtx.fillStyle = opts.screenSpace ? '#ff0000' : '#ffffff';
      this.maskCtx.fill(path, rule);
      this.maskCtx.restore();
    }
  }

  goldStroke(path: Path2D, w: number, opts: { dim?: number; nomask?: boolean; inkW?: number; screenSpace?: boolean } = {}) {
    const g = this.ctx;
    const d = opts.dim ?? this.dim;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if ((opts.inkW ?? 3.2) > 0) {
      g.strokeStyle = PAL.INK;
      g.lineWidth = w + (opts.inkW ?? 3.2) * this.lwk;
      g.stroke(path);
    }
    g.strokeStyle = this.goldPat;
    g.lineWidth = w;
    g.stroke(path);
    g.strokeStyle = `rgba(60,32,6,${(0.2 + 0.45 * d).toFixed(3)})`;
    g.lineWidth = w;
    g.stroke(path);
    g.strokeStyle = `rgba(255,248,210,${(0.52 * (1 - 0.65 * d)).toFixed(3)})`;
    g.lineWidth = Math.max(0.8, w * 0.24);
    g.stroke(path);
    g.restore();

    if (!opts.nomask) {
      this.maskCtx.save();
      this.maskCtx.setTransform(g.getTransform());
      this.maskCtx.strokeStyle = opts.screenSpace ? '#ff0000' : '#ffffff';
      this.maskCtx.lineWidth = w;
      this.maskCtx.lineCap = 'round';
      this.maskCtx.lineJoin = 'round';
      this.maskCtx.stroke(path);
      this.maskCtx.restore();
    }
  }

  // Light ONLY on gold mask, computed per pixel per leaf square tilt (STYLE.md §2)
  glintPass(camM: DOMMatrix, lights: LightSource[], amb = 0.06, glowGain = 0.72) {
    if (!lights.length && amb <= 0) return;
    const W = this.w;
    const H = this.h;
    const mImg = this.maskCtx.getImageData(0, 0, W, H);
    const md = mImg.data;
    const md32 = new Uint32Array(md.buffer);
    const img = this.ctx.getImageData(0, 0, W, H);
    const fd = img.data;
    const GWD = this.glowData;
    GWD.fill(0);
    const QW = W >> 2;

    const inv = camM.inverse();
    const ia = inv.a, ib = inv.b, ic = inv.c, id = inv.d, ie = inv.e, iff = inv.f;
    const Ls = lights.map((L) => ({ ...L, r2: L.r ? L.r * L.r : 0 }));

    let ci = 1e9, cj = 1e9, nx = 1, ny = 0, th = 0, fam = 0, tone = 0, ox = 0;

    for (let y = 0; y < H; y++) {
      const rowP = y * W;
      const qy = (y >> 2) * QW;
      const icY = ic * y + ie;
      const idY = id * y + iff;
      for (let x = 0; x < W; x++) {
        const idx = rowP + x;
        if (md32[idx] === 0) continue;
        const p = idx << 2;
        const A = md[p + 3];
        if (A < 8) continue;

        const wx = ia * x + icY;
        const wy = ib * x + idY;
        const scr = md[p + 1] < 128;
        const fx = scr ? x * 1.15 : wx;
        const fy = scr ? y * 1.15 : wy;

        const j = Math.floor(fy / LS);
        const ro = rowOff(j);
        const i = Math.floor((fx + ro) / LS);
        const gk = scr ? 0.65 : 1.0;

        if (i !== ci || j !== cj) {
          ci = i;
          cj = j;
          ox = ro;
          th = leafTilt(i, j);
          nx = Math.cos(th);
          ny = Math.sin(th);
          const fa = 0.5 + 0.5 * Math.cos(th - 0.9);
          fam = fa * fa * fa * fa;
          tone = leafTone(i, j);
        }

        const lu = (fx + ox) / LS - i - 0.5;
        const lv = fy / LS - j - 0.5;
        const cup = 1 + 0.52 * (lu * nx + lv * ny);
        let R = amb * (0.55 + 0.55 * fam);

        for (let k = 0; k < Ls.length; k++) {
          const L = Ls[k];
          if (L.type === 'r') {
            const dx = wx - L.x;
            const dy = wy - L.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= L.r2) continue;
            const d = Math.sqrt(d2);
            const v = L.a * Math.pow(1 - d / (L.r || 1), 1.35);
            let f = 0.5 + (0.5 * (dx * nx + dy * ny)) / (d + 1e-3);
            f *= f;
            R += v * (0.52 + 0.78 * f);
          } else if (L.type === 'b') {
            const dd = ((wx - L.x) * (L.nx || 1) + (wy - L.y) * (L.ny || 0)) / (L.w || 100);
            if (dd > 3 || dd < -3) continue;
            const v = L.a * Math.exp(-dd * dd);
            let f = 0.5 + 0.5 * Math.cos(dd * 1.9 + th);
            f *= f;
            R += v * (0.48 + 0.8 * f);
          } else {
            const dx = wx - L.x;
            const dy = wy - L.y;
            const dd = (Math.sqrt(dx * dx + dy * dy) - (L.rad || 0)) / (L.w || 60);
            if (dd > 3 || dd < -3) continue;
            const v = L.a * Math.exp(-dd * dd);
            let f = 0.5 + 0.5 * Math.cos(dd * 2.2 + th);
            f *= f;
            R += v * (0.52 + 0.82 * f);
          }
        }

        if (R < 0.005) continue;
        const k = (A / 255) * Math.min(R * cup * gk, 2.2) * (0.9 + 0.2 * tone);
        if (k > 0.55) GWD[qy + (x >> 2)] += k - 0.55;
        // Capped warm burnished gold (never burns out to white)
        const f = 0.82 * (1 - Math.exp(-1.18 * k));
        const r0 = fd[p];
        const g0 = fd[p + 1];
        const b0 = fd[p + 2];
        fd[p] = Math.min(255, r0 * (1 + 0.48 * k) + (250 - r0) * f);
        fd[p + 1] = Math.min(232, g0 * (1 + 0.42 * k) + (204 - g0) * f);
        fd[p + 2] = Math.min(152, b0 * (1 + 0.2 * k) + (98 - b0) * f);
      }
    }
    this.ctx.putImageData(img, 0, 0);

    // Restrained warm halo around the brightest lit gold leaf only
    if (glowGain > 0) {
      const gd = this.glowImg.data;
      for (let i = 0; i < GWD.length; i++) {
        const v = Math.min(1, (GWD[i] / 16) * glowGain);
        gd[i * 4] = 255;
        gd[i * 4 + 1] = 198;
        gd[i * 4 + 2] = 112;
        gd[i * 4 + 3] = 255 * v * v;
      }
      this.glowCtx.putImageData(this.glowImg, 0, 0);
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.filter = 'blur(9px)';
      this.ctx.globalAlpha = 0.48;
      this.ctx.drawImage(this.glowCanvas, 0, 0, W, H);
      this.ctx.filter = 'blur(28px)';
      this.ctx.globalAlpha = 0.42;
      this.ctx.drawImage(this.glowCanvas, 0, 0, W, H);
      this.ctx.restore();
    }

    // Crisp 4-point star flashes on intensely lit gold highlights
    if (this.goldPoints.length > 0) {
      const g = this.ctx;
      g.save();
      g.setTransform(camM);
      g.globalCompositeOperation = 'lighter';
      const z = Math.hypot(camM.a, camM.b) || 1;
      for (const p of this.goldPoints) {
        const v = lightAt(lights, p.x, p.y) * p.k;
        if (v < 0.48) continue;
        const a = clamp((v - 0.48) * 1.35);
        const r = Math.min(p.r * (0.4 + 0.5 * a), 140 / z);
        const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.55);
        rg.addColorStop(0, `rgba(255,246,210,${0.42 * a})`);
        rg.addColorStop(1, 'rgba(255,232,160,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(p.x, p.y, r * 0.55, 0, TAU);
        g.fill();
        g.fillStyle = `rgba(255,250,230,${0.82 * a})`;
        for (const an of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
          const rr = an % (Math.PI / 2) ? r * 0.42 : r;
          g.save();
          g.translate(p.x, p.y);
          g.rotate(an + 0.15);
          g.beginPath();
          g.moveTo(-rr, 0);
          g.quadraticCurveTo(0, -rr * 0.065, rr, 0);
          g.quadraticCurveTo(0, rr * 0.065, -rr, 0);
          g.fill();
          g.restore();
        }
      }
      g.restore();
    }
  }
}

export function lightAt(lights: LightSource[], x: number, y: number): number {
  let v = 0;
  for (const L of lights) {
    if (L.type === 'r') {
      const d = Math.hypot(x - L.x, y - L.y) / (L.r || 1);
      if (d < 1) v += L.a * Math.pow(1 - d, 1.35);
    } else if (L.type === 'b') {
      const d = ((x - L.x) * (L.nx || 1) + (y - L.y) * (L.ny || 0)) / (L.w || 100);
      v += L.a * Math.exp(-d * d);
    } else {
      const d = (Math.hypot(x - L.x, y - L.y) - (L.rad || 0)) / (L.w || 60);
      v += L.a * Math.exp(-d * d);
    }
  }
  return v;
}

export function P2(fn: (p: Path2D) => void): Path2D {
  const p = new Path2D();
  fn(p);
  return p;
}

export function polyPath(pts: [number, number][], close = true): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  if (close) p.closePath();
  return p;
}

export function arclen(pts: [number, number][]): number[] {
  const L = [0];
  for (let i = 1; i < pts.length; i++) {
    L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return L;
}

export function alongPath(pts: [number, number][], L: number[], s: number) {
  const sc = clamp(s, 0, L[L.length - 1]);
  let i = 1;
  while (i < L.length - 1 && L[i] < sc) i++;
  const u = (sc - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  const a = pts[i - 1];
  const b = pts[i];
  return {
    x: lerp(a[0], b[0], u),
    y: lerp(a[1], b[1], u),
    a: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
}

export function starPath(x: number, y: number, r: number, ri = 0.42, rot = 0, n = 8): Path2D {
  return P2((q) => {
    for (let k = 0; k < n * 2; k++) {
      const a = rot + (k * Math.PI) / n - Math.PI / 2;
      const rr = k % 2 ? r * ri : r;
      if (k === 0) q.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else q.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    q.closePath();
  });
}

// Stepped leaning medieval mountain spires (Mount Uhud clusters)
export function spirePts(
  bx: number,
  by: number,
  w: number,
  h: number,
  lean: number,
  R: () => number
): [number, number][] {
  const L: [number, number][] = [];
  const Rt: [number, number][] = [];
  const n = 4 + ((R() * 3) | 0);
  const topW = w * (0.14 + R() * 0.1);
  const tx = bx + lean * h;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(bx - w / 2, tx - topW / 2, u) + (i && i < n ? (R() - 0.5) * w * 0.05 : 0);
    const y = by - h * u;
    if (i > 0 && i < n) {
      const run = w * (0.05 + R() * 0.05);
      L.push([x - run, y + (h / n) * (0.16 + R() * 0.18)]);
      L.push([x - run, y]);
      L.push([x + run * 0.3, y]);
    } else L.push([x, y]);
  }
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(bx + w / 2, tx + topW / 2, u) + (i && i < n ? (R() - 0.5) * w * 0.05 : 0);
    const y = by - h * u;
    if (i > 0 && i < n) {
      const run = w * (0.05 + R() * 0.05);
      Rt.push([x + run, y + (h / n) * (0.16 + R() * 0.18)]);
      Rt.push([x + run, y]);
      Rt.push([x - run * 0.3, y]);
    } else Rt.push([x, y]);
  }
  const top: [number, number][] = [
    [tx - topW * 0.12, by - h - h * 0.03],
    [tx + topW * 0.22, by - h + h * 0.01],
  ];
  return L.concat(top, Rt.reverse());
}
