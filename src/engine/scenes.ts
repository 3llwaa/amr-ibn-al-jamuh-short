import timelineData from '../timeline.json';
import {
  GildedCtx,
  LightSource,
  PAL,
  P2,
  TAU,
  clamp,
  eio,
  eo,
  lerp,
  mulberry,
  popS,
  seg,
  ss,
  starPath,
} from './gildedKit';
import {
  MountainCluster,
  drawAmr,
  drawCypress,
  drawDatePalm,
  drawGoldStars,
  drawMedinaArch,
  drawOrnateBorder,
  drawRadiantPropheticArch,
  drawScallopedCloud,
  drawShamsa,
  drawSon,
  drawUhudRange,
} from './figures';

export const W = timelineData.width; // 1080
export const H = timelineData.height; // 1920
export const FPS = timelineData.fps; // 30
export const DUR = timelineData.durationSec;
export const MARKS = timelineData.marks;
export const SHOTS = timelineData.shots;
export const CUES = timelineData.cues;

const UHUD_FAR: MountainCluster[] = [
  { x: 160, w: 300, h: 480, lean: 0.14, sub: 2 },
  { x: 540, w: 380, h: 560, lean: -0.08, sub: 3 },
  { x: 920, w: 310, h: 490, lean: -0.15, sub: 2 },
];

const UHUD_NEAR: MountainCluster[] = [
  { x: 110, w: 280, h: 330, lean: 0.18, sub: 2 },
  { x: 460, w: 320, h: 380, lean: 0.06, sub: 2 },
  { x: 860, w: 300, h: 350, lean: -0.16, sub: 2 },
];

function camMatrix(cx: number, cy: number, z: number, rot = 0): DOMMatrix {
  return new DOMMatrix()
    .translate(W / 2, H / 2)
    .rotate((rot * 180) / Math.PI)
    .scale(z)
    .translate(-cx, -cy);
}

// ------------------------------------------------------------------
// Ground Path & Landscape Helpers
// ------------------------------------------------------------------
function drawPaintedGround(gc: GildedCtx, yTop: number, h: number, fill = '#63473a', rim = '#3f2a20') {
  const path = P2((q) => {
    q.moveTo(-260, yTop);
    q.quadraticCurveTo(W * 0.25, yTop - 22, W * 0.5, yTop - 4);
    q.quadraticCurveTo(W * 0.78, yTop + 16, W + 260, yTop - 10);
    q.lineTo(W + 260, yTop + h);
    q.lineTo(-260, yTop + h);
    q.closePath();
  });
  gc.shape(path, fill, rim, 14, 3.0);
  gc.hiLine(
    [
      [-180, yTop + 6],
      [W * 0.3, yTop - 8],
      [W * 0.7, yTop + 12],
      [W + 180, yTop - 2],
    ],
    2.4,
    0.58
  );
  // Scattered painted pebbles & white-lead triads
  const R = mulberry(44);
  for (let i = 0; i < 16; i++) {
    const px = -120 + R() * (W + 240);
    const py = yTop + 34 + R() * (h * 0.45);
    gc.triad(px, py, 2.2, 0.52);
  }
}

function drawVellumCartouche(
  gc: GildedCtx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  open: number,
  titleLine: string,
  subLine?: string,
  fontTitle = '700 44px AmiriQuran, Amiri, serif'
) {
  if (open <= 0.02) return;
  const g = gc.ctx;
  const hw = (w / 2) * open;
  const hh = h / 2;

  // Pointed gilded cartouche frame
  const outer = P2((q) => {
    q.moveTo(cx - hw - 32 * open, cy);
    q.quadraticCurveTo(cx - hw - 8 * open, cy - hh, cx - hw + 28 * open, cy - hh);
    q.lineTo(cx + hw - 28 * open, cy - hh);
    q.quadraticCurveTo(cx + hw + 8 * open, cy - hh, cx + hw + 32 * open, cy);
    q.quadraticCurveTo(cx + hw + 8 * open, cy + hh, cx + hw - 28 * open, cy + hh);
    q.lineTo(cx - hw + 28 * open, cy + hh);
    q.quadraticCurveTo(cx - hw - 8 * open, cy + hh, cx - hw - 32 * open, cy);
    q.closePath();
  });
  gc.leaf(outer, [cx - hw - 40, cy - hh - 8, hw * 2 + 80, h + 16], { lw: 3.0, rimW: 6, screenSpace: true });

  // Inner vellum writing field
  const ihw = Math.max(8, hw - 16 * open);
  const ihh = hh - 16;
  const inner = P2((q) => {
    q.moveTo(cx - ihw - 18 * open, cy);
    q.quadraticCurveTo(cx - ihw, cy - ihh, cx - ihw + 20 * open, cy - ihh);
    q.lineTo(cx + ihw - 20 * open, cy - ihh);
    q.quadraticCurveTo(cx + ihw, cy - ihh, cx + ihw + 18 * open, cy);
    q.quadraticCurveTo(cx + ihw, cy + ihh, cx + ihw - 20 * open, cy + ihh);
    q.lineTo(cx - ihw + 20 * open, cy + ihh);
    q.quadraticCurveTo(cx - ihw, cy + ihh, cx - ihw - 18 * open, cy);
    q.closePath();
  });
  gc.shape(inner, PAL.VELL, PAL.VELL_D, 9, 2.6);

  // Vellum texture specks
  g.save();
  g.clip(inner);
  g.globalAlpha = 0.4;
  g.fillStyle = gc.spkPat;
  g.fillRect(cx - hw, cy - hh, hw * 2, h);
  g.globalAlpha = 1.0;

  // Right-to-left calligraphic pen-wipe reveal for Arabic
  const wipe = eo(clamp((open - 0.15) / 0.85));
  const rx = cx + ihw + 24 - (ihw * 2 + 48) * wipe;
  g.beginPath();
  g.rect(rx, cy - ihh - 10, (ihw * 2 + 48) * wipe, ihh * 2 + 20);
  g.clip();

  g.direction = 'rtl';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = PAL.INK;
  g.font = fontTitle;
  g.fillText(titleLine, cx, subLine ? cy - 20 : cy + 4);
  if (subLine) {
    g.font = '700 35px Amiri, serif';
    g.fillStyle = PAL.VERM_D;
    g.fillText(subLine, cx, cy + 40);
  }
  g.restore();

  // White-lead pearl accents at left & right pointed tips
  if (open > 0.6) {
    gc.triad(cx - hw - 12, cy, 2.5);
    gc.triad(cx + hw + 12, cy, 2.5);
  }
}

// ------------------------------------------------------------------
// Fixed-Place Bottom Arabic Vellum Speech Scroll (STYLE.md §4)
// Never moves sideways, never changes width — pen-wiped Right-to-Left
// ------------------------------------------------------------------
function drawArabicBanderole(gc: GildedCtx, t: number) {
  let cur = null as (typeof CUES)[number] | null;
  let idx = -1;
  for (let i = 0; i < CUES.length; i++) {
    const c = CUES[i];
    if (t >= c.t0 - 0.22 && t <= c.sub_end + 0.30) {
      cur = c;
      idx = i;
      break;
    }
  }
  if (!cur) return;

  const prev = idx > 0 ? CUES[idx - 1] : null;
  const next = idx < CUES.length - 1 ? CUES[idx + 1] : null;
  const joinedIn = prev !== null && cur.t0 - prev.sub_end < 0.75;
  const joinedOut = next !== null && next.t0 - cur.sub_end < 0.75;

  const open =
    (joinedIn ? 1 : eo(seg(t, cur.t0 - 0.22, cur.t0 + 0.10))) *
    (joinedOut ? 1 : 1 - ss(seg(t, cur.sub_end + 0.04, cur.sub_end + 0.30)));
  if (open <= 0.01) return;

  const g = gc.ctx;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);

  // Fixed position & fixed width for the entire film (STYLE.md §4)
  const cx = W / 2;
  const cy = 1668;
  const hw = 432 * open;
  const h = 152;

  // Ribbon swallow-tails on left & right
  for (const sd of [-1, 1]) {
    const ex = cx + sd * hw;
    const tail = P2((q) => {
      q.moveTo(ex - sd * 6, cy - h / 2 + 24);
      q.lineTo(ex + sd * 56, cy - h / 2 + 34);
      q.lineTo(ex + sd * 34, cy + 4);
      q.lineTo(ex + sd * 62, cy + h / 2 + 18);
      q.lineTo(ex - sd * 6, cy + h / 2 - 6);
      q.closePath();
    });
    gc.shape(tail, '#d9c69d', '#a68f63', 8, 3.0);

    const fold = P2((q) => {
      q.moveTo(ex - sd * 3, cy + h / 2 - 6);
      q.lineTo(ex - sd * 3, cy + h / 2 + 16);
      q.lineTo(ex + sd * 24, cy + h / 2 + 3);
      q.closePath();
    });
    gc.shape(fold, '#86704c', '#5e4c32', 4, 2.2);
  }

  // Main gently curved vellum banderole
  const band = P2((q) => {
    q.moveTo(cx - hw, cy - h / 2);
    q.bezierCurveTo(cx - hw * 0.4, cy - h / 2 - 12, cx + hw * 0.4, cy - h / 2 + 10, cx + hw, cy - h / 2);
    q.lineTo(cx + hw, cy + h / 2);
    q.bezierCurveTo(cx + hw * 0.4, cy + h / 2 + 10, cx - hw * 0.4, cy + h / 2 - 12, cx - hw, cy + h / 2);
    q.closePath();
  });
  gc.shape(band, PAL.VELL, PAL.VELL_D, 11, 3.2);

  // Subtle vermilion top & bottom rule lines inside the scroll
  g.save();
  g.clip(band);
  g.globalAlpha = 0.45;
  g.fillStyle = gc.spkPat;
  g.fillRect(cx - hw, cy - h, hw * 2, h * 2);
  g.globalAlpha = 0.65;
  g.strokeStyle = PAL.VERM;
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(cx - hw + 18, cy - h / 2 + 12);
  g.lineTo(cx + hw - 18, cy - h / 2 + 12);
  g.moveTo(cx - hw + 18, cy + h / 2 - 12);
  g.lineTo(cx + hw - 18, cy + h / 2 - 12);
  g.stroke();
  g.restore();

  // White-lead top highlight
  g.strokeStyle = 'rgba(255,252,238,0.82)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(cx - hw + 14, cy - h / 2 + 6);
  g.lineTo(cx + hw - 14, cy - h / 2 + 6);
  g.stroke();

  // Draw Arabic text with Right-to-Left pen wipe
  const drawLines = (lines: string[], wipe: number, alpha: number) => {
    g.save();
    g.globalAlpha = alpha * clamp((open - 0.18) / 0.32);
    g.clip(band);
    const fullW = hw * 2;
    const startX = cx + hw - fullW * wipe;
    g.beginPath();
    g.rect(startX, cy - h, fullW * wipe, h * 2);
    g.clip();

    g.direction = 'rtl';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = PAL.INK;
    // Dynamically fit slightly long lines cleanly inside the 820px safe area
    const maxLineW = 810;
    const drawSingle = (txt: string, yPos: number, isQuote: boolean) => {
      let sz = isQuote ? 39 : 37;
      g.font = `700 ${sz}px Amiri, serif`;
      while (g.measureText(txt).width > maxLineW && sz > 28) {
        sz -= 1;
        g.font = `700 ${sz}px Amiri, serif`;
      }
      g.fillStyle = isQuote ? PAL.VERM_D : PAL.INK;
      g.fillText(txt, cx, yPos);
    };

    if (lines.length === 1) {
      drawSingle(lines[0], cy + 2, lines[0].includes('﴿') || lines[0].includes('«'));
    } else {
      drawSingle(lines[0], cy - 24, lines[0].includes('﴿') || lines[0].includes('«'));
      drawSingle(lines[1], cy + 28, lines[1].includes('﴿') || lines[1].includes('«'));
    }
    g.restore();
  };

  if (joinedIn && prev && t < cur.t0) {
    const fadeOut = 1 - ss(seg(t, cur.t0 - 0.22, cur.t0 - 0.02));
    drawLines(prev.lines, 1, fadeOut);
  }
  if (t >= cur.t0) {
    const wipe = eo(seg(t, cur.t0, cur.t0 + 0.42));
    drawLines(cur.lines, wipe, 1);
  }

  g.restore();
}

// ------------------------------------------------------------------
// Soft Scalloped Cloud Transition Wipe between Shots (No Blank Frames)
// ------------------------------------------------------------------
function drawTransitionCloud(gc: GildedCtx, t: number) {
  for (let i = 1; i < SHOTS.length; i++) {
    const cut = SHOTS[i].t0;
    const dt = Math.abs(t - cut);
    if (dt < 0.28) {
      const p = 1 - dt / 0.28; // peaks at 1.0 on cut
      const sweepX = lerp(-240, W + 240, seg(t, cut - 0.28, cut + 0.28));
      const g = gc.ctx;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 0.85 * ss(p);
      drawScallopedCloud(gc, sweepX, H * 0.34, 3.6, PAL.LAPIS_D, PAL.ULTRA_D, true);
      drawScallopedCloud(gc, W - sweepX, H * 0.62, 3.8, PAL.ULTRA, PAL.ULTRA_D, true);
      g.restore();
    }
  }
}

// ------------------------------------------------------------------
// MAIN DETERMINISTIC FRAME RENDERER: renderFrame(gc, t)
// ------------------------------------------------------------------
export function renderFrame(gc: GildedCtx, t: number) {
  // Determine active shot (1..8)
  let shotIdx = 0;
  for (let i = 0; i < SHOTS.length; i++) {
    if (t >= SHOTS[i].t0) shotIdx = i;
  }
  const S = SHOTS[shotIdx];
  const u = clamp((t - S.t0) / Math.max(0.01, S.dur)); // 0..1 normalized shot progress

  // Default frame setup
  let dim = 0.68;
  let amb = 0.08;
  let glowGain = 0.72;
  let camX = W / 2;
  let camY = H / 2;
  let camZ = 1.0;
  let camRot = 0;
  const lights: LightSource[] = [];

  // Pre-compute camera & lighting per shot
  if (S.shot === 1) {
    // S1: Hook — exponential pull-out from dark gilded shamsa + raking diagonal flash
    dim = lerp(0.86, 0.42, eo(seg(t, MARKS.hook_spark, MARKS.hook_spark + 1.8)));
    camZ = lerp(1.52, 1.0, eio(u));
    camY = lerp(690, 880, eio(u));
    const sweep = lerp(-500, W + 600, eio(seg(t, MARKS.hook_spark, S.t1)));
    lights.push({ type: 'b', x: sweep, y: 740, nx: 0.78, ny: 0.62, w: 220, a: 1.55 });
    lights.push({ type: 'r', x: W / 2, y: 690, r: 520, a: 0.9 * eo(seg(t, MARKS.hook_spark, 2.2)) });
  } else if (S.shot === 2) {
    // S2: Amr & Mount Uhud — lateral tracking following Amr's slow limp
    dim = 0.62;
    camZ = lerp(1.04, 1.12, u);
    camX = lerp(W * 0.56, W * 0.44, eio(u));
    camY = lerp(940, 980, u);
    lights.push({ type: 'r', x: W * 0.52, y: 420, r: 780, a: 0.72 });
    lights.push({ type: 'b', x: lerp(-200, W + 300, u), y: 800, nx: 0.85, ny: 0.52, w: 280, a: 0.75 });
  } else if (S.shot === 3) {
    // S3: Four Lions — upward crane & slight push-in as banners unfurl
    dim = 0.55;
    camZ = lerp(0.96, 1.08, eio(u));
    camY = lerp(1040, 910, eio(u));
    const rX = lerp(120, W - 100, eio(u));
    lights.push({ type: 'r', x: rX, y: 580, r: 640, a: 1.05 });
    lights.push({ type: 'r', x: W / 2, y: 300, r: 620, a: 0.65 });
  } else if (S.shot === 4) {
    // S4: Sons' plea & Quranic verse cartouche — push into pointed Medina arch
    dim = lerp(0.62, 0.35, eo(seg(t, MARKS.verse_appear, MARKS.verse_appear + 1.4)));
    camZ = lerp(0.98, 1.08, eio(u));
    camY = lerp(960, 890, eio(u));
    const vFlash = eo(seg(t, MARKS.verse_appear, MARKS.verse_appear + 1.5));
    lights.push({ type: 'r', x: W / 2, y: 460, r: 580, a: 0.55 + 1.15 * vFlash });
    if (t >= MARKS.verse_appear) {
      const bx = lerp(W + 180, -180, eio(seg(t, MARKS.verse_appear, S.t1)));
      lights.push({ type: 'b', x: bx, y: 460, nx: 0.92, ny: 0.38, w: 210, a: 1.35 });
    }
  } else if (S.shot === 5) {
    // S5: Amr's Defiance before Radiant Prophetic Arch + Uhud shakes on "تهز الجبال"
    const pleaProg = eo(seg(t, MARKS.plea_climax, S.t1));
    dim = lerp(0.65, 0.25, pleaProg);
    camZ = lerp(1.0, 1.13, eio(u));
    camY = lerp(940, 875, eio(u));
    const shakeEnv = Math.exp(-Math.pow((t - (MARKS.mountains_shake + 0.35)) / 0.45, 2));
    camX = W / 2 + Math.sin(t * 58) * 14 * shakeEnv;
    camRot = Math.sin(t * 44) * 0.008 * shakeEnv;
    lights.push({ type: 'r', x: W / 2, y: 370, r: 780, a: 0.85 + 0.95 * pleaProg });
    lights.push({ type: 'r', x: W / 2, y: 1120, r: 520, a: 0.35 + 1.05 * pleaProg });
  } else if (S.shot === 6) {
    // S6: Prophet's ﷺ permission — Native Move: THE TOUCH (2 concentric expanding gold rings!)
    const touchU = seg(t, MARKS.the_touch, S.t1);
    dim = lerp(0.82, 0.24, eo(clamp(touchU * 2.2)));
    camZ = lerp(1.06, 0.98, eio(touchU));
    camY = 930;
    if (touchU <= 0.01) {
      // Breath of stillness before The Touch
      lights.push({ type: 'r', x: W / 2, y: 380, r: 420, a: 0.45 });
    } else {
      // TWO concentric golden light rings spreading outward from the shamsa (capped to preserve leaf squares!)
      const rad1 = lerp(60, 1480, eo(touchU));
      const rad2 = lerp(20, 1180, eo(clamp((touchU - 0.14) / 0.86)));
      lights.push({ type: 'o', x: W / 2, y: 390, rad: rad1, w: 110, a: 1.32 * (1 - touchU * 0.35) });
      if (touchU > 0.14) {
        lights.push({ type: 'o', x: W / 2, y: 390, rad: rad2, w: 96, a: 1.12 * (1 - touchU * 0.25) });
      }
      lights.push({ type: 'r', x: W / 2, y: 390, r: 780, a: 0.92 * eo(touchU) });
      amb = 0.14 * eo(touchU);
      glowGain = 0.52;
    }
  } else if (S.shot === 7) {
    // S7: Battle of Uhud -> sudden deceleration into solemn vertical light at martyrdom
    const martU = seg(t, MARKS.martyrdom, S.t1);
    dim = lerp(0.55, 0.32, martU);
    const battleRun = eio(seg(t, S.t0, MARKS.martyrdom));
    camZ = lerp(1.08, 1.02, martU);
    camX = lerp(W * 0.44, W * 0.56, battleRun);
    camY = lerp(950, 910, martU);
    camRot = (1 - martU) * Math.sin(t * 14) * 0.012;
    if (martU < 0.15) {
      lights.push({ type: 'r', x: W * 0.52 + Math.sin(t * 9) * 140, y: 980, r: 480, a: 1.15 });
    }
    // Descending tranquil shaft of light at martyrdom
    if (martU > 0.01) {
      lights.push({ type: 'b', x: W / 2, y: 900, nx: 1, ny: 0, w: lerp(40, 180, eo(martU)), a: 1.35 * eo(martU) });
      lights.push({ type: 'r', x: W / 2, y: 1120, r: 540, a: 0.95 * eo(martU) });
    }
  } else {
    // S8: Paradise Garden + Straight Golden Footsteps + Grand Final Pull-Back & Border
    const pullU = eio(seg(t, MARKS.pullback_start, S.t1 - 1.5));
    const hadithU = eo(seg(t, MARKS.hadith_radiance, MARKS.wisdom_plaque));
    dim = lerp(0.45, 0.18, clamp(hadithU + pullU * 0.5));
    amb = lerp(0.14, 0.24, pullU);
    glowGain = 0.58;
    camZ = lerp(1.16, 0.94, pullU);
    camY = lerp(1080, 940, eio(seg(t, S.t0, MARKS.wisdom_plaque)));
    lights.push({ type: 'r', x: W / 2, y: 420, r: 820, a: 1.05 + 0.3 * hadithU });
    lights.push({ type: 'r', x: W / 2, y: 1160, r: 640, a: 0.85 + 0.35 * hadithU });
    // Final slow raking band of light crossing every gold square in the finished miniature
    const rake = lerp(-300, W + 400, eio(seg(t, MARKS.wisdom_plaque, S.t1)));
    lights.push({ type: 'b', x: rake, y: 900, nx: 0.72, ny: 0.69, w: 260, a: 1.15 });
  }

  // Begin Frame
  gc.beginFrame(dim);
  const M = camMatrix(camX, camY, camZ, camRot);
  gc.setZoom(camZ);
  gc.ctx.setTransform(M);

  // ==================================================================
  // DRAW ACTIVE SHOT WORLD
  // ==================================================================
  if (S.shot === 1) {
    renderShot1(gc, t, u);
  } else if (S.shot === 2) {
    renderShot2(gc, t, u);
  } else if (S.shot === 3) {
    renderShot3(gc, t, u);
  } else if (S.shot === 4) {
    renderShot4(gc, t, u);
  } else if (S.shot === 5) {
    renderShot5(gc, t, u, S);
  } else if (S.shot === 6) {
    renderShot6(gc, t, S);
  } else if (S.shot === 7) {
    renderShot7(gc, t, S);
  } else {
    renderShot8(gc, t, u, S);
  }

  // Screen-space ornate border in Shot 8 pull-back (included in gold glint mask!)
  if (S.shot === 8) {
    const borderP = eio(seg(t, MARKS.pullback_start, MARKS.pullback_start + 2.4));
    drawOrnateBorder(gc, W, H, borderP);
  }

  // ==================================================================
  // LIGHT-ONLY-ON-GOLD GLINT PASS (THE SIGNATURE OF GILDED ILLUMINATION)
  // ==================================================================
  gc.glintPass(M, lights, amb, glowGain);

  // Screen-space calligraphic cartouches drawn crisply after glintPass
  gc.ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.shot === 1) {
    const titleOpen = eo(seg(t, 0.85, 1.75));
    drawVellumCartouche(gc, W / 2, 1345, 760, 168, titleOpen, 'عَمْرُو بْنُ الْجَمُوحِ', 'قِصَّةٌ مِنْ غَزْوَةِ أُحُد', '700 48px Amiri, serif');
  } else if (S.shot === 4 && t >= MARKS.verse_appear - 0.15) {
    const vOpen = eo(seg(t, MARKS.verse_appear - 0.15, MARKS.verse_appear + 0.75));
    drawVellumCartouche(gc, W / 2, 430, 860, 188, vOpen, '﴿ لَيْسَ عَلَى الْأَعْرَجِ حَرَجٌ ﴾', 'سورة الفتح — آية ١٧', '700 46px AmiriQuran, Amiri, serif');
  } else if (S.shot === 8 && t >= MARKS.wisdom_plaque - 0.2) {
    const pOpen = eo(seg(t, MARKS.wisdom_plaque - 0.2, MARKS.wisdom_plaque + 0.85));
    drawVellumCartouche(
      gc,
      W / 2,
      850,
      820,
      204,
      pOpen,
      'الأعذار تصنعها العقول..',
      'أما الهمم فتصنعها القلوب',
      '700 46px Amiri, serif'
    );
  }

  // Painted scalloped-cloud transitions
  drawTransitionCloud(gc, t);

  // Fixed-place, fixed-width bottom Arabic vellum speech scroll
  drawArabicBanderole(gc, t);
}

type ShotBound = { shot: number; t0: number; t1: number; dur: number };

// ------------------------------------------------------------------
// SHOT 1: HOOK — Dark Illuminated Shamsa Igniting + Curved Sword
// ------------------------------------------------------------------
function renderShot1(gc: GildedCtx, t: number, u: number) {
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA_NIGHT);
  drawGoldStars(gc, -120, 80, W + 120, 1480, 38, 101, t);

  // Subtle geometric quatrefoil framing arches in background
  const frameArch = P2((q) => {
    q.moveTo(110, 1580);
    q.lineTo(110, 520);
    q.quadraticCurveTo(150, 220, W / 2, 130);
    q.quadraticCurveTo(W - 150, 220, W - 110, 520);
    q.lineTo(W - 110, 1580);
  });
  gc.goldStroke(frameArch, 12, { inkW: 3.4 });

  // Central grand Islamic Shamsa — dark until hook_spark ignites it!
  const raysLit = eo(seg(t, MARKS.hook_spark, MARKS.hook_spark + 1.6));
  drawShamsa(gc, W / 2, 690, 250, t * 0.14, raysLit);

  // Scalloped clouds flanking the shamsa
  drawScallopedCloud(gc, 200 - u * 40, 1020, 1.05, PAL.LILAC, PAL.LILAC_D, true);
  drawScallopedCloud(gc, 890 + u * 40, 340, 0.95, PAL.LILAC, PAL.LILAC_D, false);

  // Illuminated Arab sword & wooden staff crossed below shamsa (symbolizing limp vs valor!)
  const g = gc.ctx;
  g.save();
  g.translate(W / 2, 1110);

  // Wooden staff angled left-to-right
  g.save();
  g.rotate(-0.24);
  const staff = P2((q) => q.roundRect(-240, -10, 480, 20, 8));
  gc.shape(staff, PAL.WOOD, PAL.WOOD_D, 6, 2.8);
  gc.hiLine([[-220, -3], [220, -3]], 2.0, 0.72);
  g.restore();

  // Curved gilded-hilt Arab sword angled right-to-left
  g.save();
  g.rotate(0.22);
  const blade = P2((q) => {
    q.moveTo(-180, -8);
    q.quadraticCurveTo(40, -34, 265, -24);
    q.quadraticCurveTo(60, 12, -180, 12);
    q.closePath();
  });
  gc.shape(blade, '#dfe5ec', '#7c889a', 7, 2.8);
  gc.hiLine([[-160, -4], [55, -22], [245, -20]], 2.4, 0.95);
  const hilt = P2((q) => q.roundRect(-270, -12, 92, 24, 6));
  gc.leaf(hilt, [-276, -18, 104, 36], { lw: 2.4, rimW: 3 });
  const guard = P2((q) => q.roundRect(-186, -44, 18, 88, 6));
  gc.leaf(guard, [-190, -48, 26, 96], { lw: 2.4, rimW: 3 });
  gc.pushFlash(-176, 0, 85, 1.15);
  g.restore();

  g.restore();
}

// ------------------------------------------------------------------
// SHOT 2: AMR IBN AL-JAMUH & MOUNT UHUD — Empathic Limping Walk
// ------------------------------------------------------------------
function renderShot2(gc: GildedCtx, t: number, u: number) {
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA);
  drawGoldStars(gc, -200, 60, W + 200, 760, 32, 202, t);

  // Scalloped clouds drifting gently behind Mount Uhud
  drawScallopedCloud(gc, 260 + u * 60, 310, 1.15, PAL.LILAC, PAL.LILAC_D, true);
  drawScallopedCloud(gc, 820 - u * 45, 430, 0.9, PAL.LILAC, PAL.LILAC_D, false);

  // Layered stepped spires of Mount Uhud (far lilac-rose, near coral-ochre)
  drawUhudRange(gc, 1140, 211, UHUD_FAR, PAL.ROSE, PAL.ROSE_D, true);
  drawUhudRange(gc, 1240, 222, UHUD_NEAR, PAL.CORAL, PAL.CORAL_D, false);

  // Medina date palms & small sandstone village domes in midground
  drawDatePalm(gc, 175, 1270, 220, 0.10);
  drawDatePalm(gc, 915, 1260, 235, -0.08);
  drawCypress(gc, 290, 1275, 165, 58, false);

  // Stone road ground plane
  drawPaintedGround(gc, 1255, 760, '#725544', '#4a3326');

  // Uneven footprints behind Amr on the stone road (showing his labored limp!)
  const amrX = lerp(810, 310, u);
  for (let i = 0; i < 6; i++) {
    const fx = 840 - i * 86;
    if (fx > amrX + 42) {
      const dragged = i % 2 === 1;
      const fp = P2((q) => q.ellipse(fx, 1392 + (dragged ? 10 : -4), dragged ? 22 : 13, 6, dragged ? 0.14 : 0, 0, TAU));
      gc.ctx.fillStyle = 'rgba(36,22,14,0.45)';
      gc.ctx.fill(fp);
    }
  }

  // Amr ibn al-Jamuh walking right-to-left leaning heavily on his wooden staff
  drawAmr(gc, {
    x: amrX,
    y: 1388,
    scale: 1.48,
    dir: -1,
    mode: 'staff',
    walkPhase: t * 3.1,
  });
}

// ------------------------------------------------------------------
// SHOT 3: HIS FOUR LION-HEARTED SONS — Marching to Uhud
// ------------------------------------------------------------------
function renderShot3(gc: GildedCtx, t: number, u: number) {
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA);
  drawGoldStars(gc, -150, 60, W + 150, 740, 34, 303, t);
  drawScallopedCloud(gc, 760 - u * 50, 290, 1.1, PAL.LILAC, PAL.LILAC_D, true);

  drawUhudRange(gc, 1130, 311, UHUD_FAR, PAL.ROSE, PAL.ROSE_D, true);
  drawUhudRange(gc, 1245, 322, UHUD_NEAR, PAL.CORAL, PAL.CORAL_D, false);
  drawPaintedGround(gc, 1260, 760, '#725544', '#4a3326');

  // 4 Tall Heroic Sons arrayed cleanly across the stage with spears, shields & banners!
  const sonsCfg = [
    { x: 215, y: 1360, sc: 1.26, col: PAL.VERDI, rim: PAL.VERDI_D, banner: true, phase: 0.0 },
    { x: 430, y: 1390, sc: 1.32, col: PAL.AZUR, rim: PAL.AZUR_D, banner: false, phase: 1.2 },
    { x: 650, y: 1395, sc: 1.34, col: PAL.VERDI, rim: PAL.VERDI_D, banner: true, phase: 2.4 },
    { x: 865, y: 1365, sc: 1.28, col: PAL.AZUR, rim: PAL.AZUR_D, banner: false, phase: 3.6 },
  ];

  for (let i = 0; i < sonsCfg.length; i++) {
    const s = sonsCfg[i];
    const enter = popS(seg(u, i * 0.07, i * 0.07 + 0.35), 1.3);
    drawSon(gc, {
      x: s.x,
      y: s.y + (1 - enter) * 45,
      scale: s.sc,
      dir: -1,
      cloakCol: s.col,
      cloakRim: s.rim,
      hasBanner: s.banner,
      bannerWave: t * 4.2 + s.phase,
      shieldRaised: 0.35 + 0.25 * Math.sin(t * 2 + i),
    });
  }
}

// ------------------------------------------------------------------
// SHOT 4: SONS BLOCKING THE ARCHWAY & QURANIC VERSE CARTOUCHE
// ------------------------------------------------------------------
function renderShot4(gc: GildedCtx, t: number, u: number) {
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA_NIGHT);
  drawGoldStars(gc, -120, 40, W + 120, 620, 28, 404, t);

  // Grand pointed Medina Courtyard Arch framing the emotional confrontation
  drawMedinaArch(gc, W / 2, 1380, 740, 1010, PAL.ULTRA_D);
  drawGoldStars(gc, 240, 460, 840, 960, 14, 409, t);

  // Courtyard tiled stone floor
  drawPaintedGround(gc, 1360, 660, '#6c5040', '#453024');

  // Two protective sons on the left gently raising their palms to stop their father
  const blockArm = eo(seg(u, 0.05, 0.35));
  drawSon(gc, {
    x: 265,
    y: 1385,
    scale: 1.24,
    dir: 1,
    cloakCol: PAL.AZUR,
    cloakRim: PAL.AZUR_D,
    armOut: blockArm * 0.85,
  });
  drawSon(gc, {
    x: 435,
    y: 1410,
    scale: 1.34,
    dir: 1,
    cloakCol: PAL.VERDI,
    cloakRim: PAL.VERDI_D,
    armOut: blockArm,
  });

  // Amr ibn al-Jamuh on the right — steadfast in vermilion cloak, refusing to stay home
  drawAmr(gc, {
    x: lerp(790, 735, eio(u)),
    y: 1415,
    scale: 1.44,
    dir: -1,
    mode: 'staff',
    walkPhase: 0.5,
  });
}

// ------------------------------------------------------------------
// SHOT 5: AMR'S DEFIANCE BEFORE THE RADIANT ARCH ("تهز الجبال")
// ------------------------------------------------------------------
function renderShot5(gc: GildedCtx, t: number, _u: number, S: ShotBound) {
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA_NIGHT);
  drawGoldStars(gc, -150, 60, W + 150, 980, 40, 505, t);

  // Subtle mountain vibration on "وقال كلمة تهز الجبال"
  const shakeEnv = Math.exp(-Math.pow((t - (MARKS.mountains_shake + 0.35)) / 0.45, 2));
  const shakeX = Math.sin(t * 62) * 18 * shakeEnv;

  drawUhudRange(gc, 1260, 511, UHUD_FAR, PAL.ROSE, PAL.ROSE_D, true, shakeX);
  drawUhudRange(gc, 1345, 522, UHUD_NEAR, PAL.CORAL, PAL.CORAL_D, false, -shakeX * 0.7);
  drawPaintedGround(gc, 1345, 680, '#6a4c3d', '#442e22');

  // Upper Radiant Prophetic Light Arch (respectful non-figurative shamsa & beam)
  const pleaGlow = 0.45 + 0.55 * eo(seg(t, MARKS.plea_climax - 1.5, S.t1));
  drawRadiantPropheticArch(gc, W / 2, 375, 165, pleaGlow, t);

  // Amr ibn al-Jamuh stepping forward with passionate raised arm!
  const armLift = eo(seg(t, MARKS.mountains_shake + 0.5, MARKS.plea_climax + 1.2));
  drawAmr(gc, {
    x: W / 2 - 20,
    y: 1425,
    scale: 1.62,
    dir: 1,
    mode: 'plea',
    armLift,
  });
}

// ------------------------------------------------------------------
// SHOT 6: PERMISSION & NATIVE MOVE: THE TOUCH (Concentric Gold Rings)
// ------------------------------------------------------------------
function renderShot6(gc: GildedCtx, t: number, S: ShotBound) {
  const touchU = seg(t, MARKS.the_touch, S.t1);
  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA_NIGHT);
  drawGoldStars(gc, -140, 50, W + 140, 1200, 44, 606, t);

  // Symmetrical grand gilded archway framing the decision
  drawMedinaArch(gc, W / 2, 1410, 820, 1180, PAL.ULTRA);
  drawGoldStars(gc, 200, 320, 880, 1150, 20, 612, t);
  drawPaintedGround(gc, 1385, 640, '#694d3d', '#422d22');

  // Radiant Shamsa at apex — fires THE TOUCH rings at MARKS.the_touch!
  const burst = 0.35 + 0.65 * eo(touchU);
  drawRadiantPropheticArch(gc, W / 2, 395, 170, burst, t);

  // Visual thin gold-leaf ring ripples spreading cleanly across the painting
  if (touchU > 0.01 && touchU < 0.98) {
    const r1 = lerp(70, 1260, eo(touchU));
    const ring1 = P2((q) => q.arc(W / 2, 395, r1, 0, TAU));
    gc.ctx.save();
    gc.ctx.globalAlpha = clamp(1 - touchU * 0.9);
    gc.goldStroke(ring1, 6, { inkW: 0 });
    gc.ctx.restore();
  }

  // Sons part respectfully to left & right when The Touch strikes!
  const part = eio(touchU) * 185;
  drawSon(gc, {
    x: 270 - part,
    y: 1405,
    scale: 1.24,
    dir: 1,
    cloakCol: PAL.VERDI,
    cloakRim: PAL.VERDI_D,
    hasBanner: true,
    bannerWave: t * 3.2,
  });
  drawSon(gc, {
    x: 810 + part,
    y: 1405,
    scale: 1.24,
    dir: -1,
    cloakCol: PAL.AZUR,
    cloakRim: PAL.AZUR_D,
    hasBanner: true,
    bannerWave: t * 3.2 + 1.5,
  });

  // Amr centered beneath the golden beam — road to martyrdom opens before him
  drawAmr(gc, {
    x: W / 2,
    y: 1425,
    scale: 1.54,
    dir: 1,
    mode: 'plea',
    armLift: lerp(0.85, 0.35, eo(touchU)),
  });
}

// ------------------------------------------------------------------
// SHOT 7: BATTLE OF UHUD -> TRANQUIL MARTYRDOM
// ------------------------------------------------------------------
function renderShot7(gc: GildedCtx, t: number, S: ShotBound) {
  const martU = seg(t, MARKS.martyrdom, S.t1);
  const fightIntensity = 1 - eo(martU);

  gc.fillUltramarineGround(-400, -400, W + 800, H + 800, PAL.ULTRA_NIGHT);
  drawGoldStars(gc, -180, 60, W + 180, 740, 32, 707, t);

  // Dramatic dark-coral & vermilion-rimmed spires of Mount Uhud
  drawUhudRange(gc, 1180, 711, UHUD_FAR, PAL.VERM_D, PAL.INK, true);
  drawUhudRange(gc, 1280, 722, UHUD_NEAR, PAL.CORAL_D, PAL.INK, false);

  // Swirling scalloped battle dust clouds (calm as martyrdom arrives)
  const dustX = (t - S.t0) * 95 * fightIntensity;
  drawScallopedCloud(gc, 200 + (dustX % 380), 960, 1.3, PAL.ROSE, PAL.ROSE_D, false);
  drawScallopedCloud(gc, 860 - (dustX % 340), 860, 1.15, PAL.CORAL, PAL.CORAL_D, false);

  drawPaintedGround(gc, 1280, 740, '#5a3a2e', '#362018');

  // Crossing enemy spears & steel lances from left & right edges (withdraw cleanly at martyrdom!)
  const g = gc.ctx;
  const spearPull = eo(martU) * 380;
  for (let i = 0; i < 6; i++) {
    const fromRight = i % 2 === 0;
    const baseY = 760 + i * 95;
    const jab = Math.sin(t * 9.5 + i * 1.4) * 36 * fightIntensity;
    g.save();
    g.translate(fromRight ? W + 60 + spearPull : -60 - spearPull, baseY);
    g.rotate(fromRight ? -0.35 + i * 0.05 : 0.32 - i * 0.04);
    const sx = fromRight ? -460 - jab : 460 + jab;
    const shaft = P2((q) => {
      q.moveTo(0, -5);
      q.lineTo(sx, -4);
      q.lineTo(sx, 4);
      q.lineTo(0, 5);
      q.closePath();
    });
    gc.shape(shaft, PAL.WOOD, PAL.WOOD_D, 3, 2.2);
    const head = P2((q) => {
      const d = fromRight ? -1 : 1;
      q.moveTo(sx + d * 56, 0);
      q.lineTo(sx, -12);
      q.lineTo(sx, 12);
      q.closePath();
    });
    gc.shape(head, '#d8dfe8', '#687488', 4, 2.2);
    g.restore();
  }

  if (martU < 0.35) {
    // Amr charging bravely forward with raised sword despite his limp!
    const chargeX = lerp(330, 560, eio(seg(t, S.t0, MARKS.martyrdom)));
    drawAmr(gc, {
      x: chargeX,
      y: 1390,
      scale: 1.54,
      dir: 1,
      mode: 'battle',
      walkPhase: t * 5.6,
      swordFlash: 0.9,
    });
  } else {
    // Tranquil martyrdom moment: graceful tapered golden beam descending onto Amr's resting gilded sword & cloak
    const calm = eo(seg(martU, 0.35, 1.0));
    g.save();
    const shaftGrad = g.createLinearGradient(W / 2, 140, W / 2, 1400);
    shaftGrad.addColorStop(0, `rgba(248,216,130,${(0.36 * calm).toFixed(3)})`);
    shaftGrad.addColorStop(0.65, `rgba(232,184,84,${(0.16 * calm).toFixed(3)})`);
    shaftGrad.addColorStop(1, 'rgba(232,184,84,0)');
    g.fillStyle = shaftGrad;
    g.beginPath();
    g.moveTo(W / 2 - 46 * calm, 120);
    g.lineTo(W / 2 + 46 * calm, 120);
    g.lineTo(W / 2 + 245 * calm, 1400);
    g.lineTo(W / 2 - 245 * calm, 1400);
    g.closePath();
    g.fill();
    g.restore();

    // Small 8-point gold star shining quietly at the top of the martyrdom beam
    const topStar = starPath(W / 2, 230, 32 * calm, 0.38, t * 0.2, 8);
    gc.leaf(topStar, [W / 2 - 40, 190, 80, 80], { lw: 1.8, rimW: 2 });
    gc.pushFlash(W / 2, 230, 75, 1.0);

    // Resting vermilion cloak & sword planted serenely on the hill of Uhud
    const cloakRest = P2((q) => {
      q.moveTo(W / 2 - 110, 1380);
      q.quadraticCurveTo(W / 2 - 20, 1315, W / 2 + 105, 1378);
      q.quadraticCurveTo(W / 2, 1405, W / 2 - 110, 1380);
      q.closePath();
    });
    gc.shape(cloakRest, PAL.VERM, PAL.VERM_D, 10, 2.8);
    gc.pearlLine(
      [
        [W / 2 - 80, 1370],
        [W / 2, 1352],
        [W / 2 + 75, 1370],
      ],
      18,
      2.6
    );

    // Curved sword planted upright in honor, gilded hilt glowing
    const blade = P2((q) => {
      q.moveTo(W / 2 - 8, 1360);
      q.quadraticCurveTo(W / 2 - 22, 1200, W / 2 - 4, 1085);
      q.quadraticCurveTo(W / 2 + 12, 1210, W / 2 + 8, 1360);
      q.closePath();
    });
    gc.shape(blade, '#e0e6ee', '#7b8799', 6, 2.6);
    const guard = P2((q) => q.roundRect(W / 2 - 44, 1076, 88, 18, 6));
    gc.leaf(guard, [W / 2 - 48, 1072, 96, 26], { lw: 2.2, rimW: 2 });
    const grip = P2((q) => q.roundRect(W / 2 - 11, 1004, 22, 74, 5));
    gc.leaf(grip, [W / 2 - 15, 1000, 30, 82], { lw: 2.2, rimW: 2 });
    gc.pushFlash(W / 2, 1082, 95, 1.2);
  }
}

// ------------------------------------------------------------------
// SHOT 8: PARADISE GARDEN — STRAIGHT GOLDEN FOOTSTEPS + GRAND PULL-BACK
// ------------------------------------------------------------------
function renderShot8(gc: GildedCtx, t: number, u: number, S: ShotBound) {
  // Deep ultramarine starry Paradise sky (never washed out — gold carries the radiance!)
  gc.fillUltramarineGround(-450, -450, W + 900, H + 900, PAL.ULTRA);
  drawGoldStars(gc, -200, 60, W + 200, 1180, 56, 808, t);

  // Heavenly gilded shamsa sun at top center
  const radiance = 0.55 + 0.45 * eo(seg(t, MARKS.hadith_radiance, MARKS.wisdom_plaque));
  drawRadiantPropheticArch(gc, W / 2, 360, 175, radiance, t);

  // Scalloped golden-trimmed clouds parting symmetrically
  drawScallopedCloud(gc, 180 - u * 30, 520, 1.05, PAL.LILAC, PAL.LILAC_D, true);
  drawScallopedCloud(gc, 900 + u * 30, 520, 1.05, PAL.LILAC, PAL.LILAC_D, true);

  // Distant stepped emerald hills
  drawUhudRange(gc, 1180, 811, UHUD_FAR, PAL.VERDI, PAL.VERDI_D, true);

  // Paradise Garden emerald meadow
  drawPaintedGround(gc, 1165, 840, PAL.VERD, PAL.VERD_D);

  // Twin azure streams flanking a central emerald-and-pearl garden walkway!
  for (const sd of [-1, 1]) {
    const stream = P2((q) => {
      q.moveTo(W / 2 + sd * 92, 1175);
      q.bezierCurveTo(W / 2 + sd * 170, 1300, W / 2 + sd * 210, 1440, W / 2 + sd * 320, 1640);
      q.lineTo(W / 2 + sd * 410, 1640);
      q.bezierCurveTo(W / 2 + sd * 290, 1440, W / 2 + sd * 235, 1300, W / 2 + sd * 135, 1175);
      q.closePath();
    });
    gc.shape(stream, PAL.AZUR, PAL.AZUR_D, 8, 2.6);
  }

  // Central illuminated Paradise path (deep lapis-emerald carpet bordered with white-lead pearls)
  const walkPath = P2((q) => {
    q.moveTo(W / 2 - 52, 1165);
    q.lineTo(W / 2 + 52, 1165);
    q.lineTo(W / 2 + 165, 1630);
    q.lineTo(W / 2 - 165, 1630);
    q.closePath();
  });
  gc.shape(walkPath, PAL.LAPIS_D, PAL.ULTRA_D, 10, 2.8);
  gc.pearlLine(
    [
      [W / 2 - 52, 1170],
      [W / 2 - 158, 1615],
    ],
    24,
    2.8
  );
  gc.pearlLine(
    [
      [W / 2 + 52, 1170],
      [W / 2 + 158, 1615],
    ],
    24,
    2.8
  );

  // Illuminated cypress trees with burnished GOLD-LEAF FRUIT flanking the garden!
  drawCypress(gc, 155, 1345, 315, 108, true);
  drawCypress(gc, 295, 1265, 235, 82, true);
  drawCypress(gc, 925, 1345, 315, 108, true);
  drawCypress(gc, 785, 1265, 235, 82, true);

  // THE EMOTIONAL ECHO: Distinct heel+sole footprints walking straight & whole in burnished gold leaf!
  // ("كأني أنظر إليك تمشي برجلك هذه صحيحة في الجنة")
  const stepsProg = eo(seg(t, S.t0 + 0.5, MARKS.wisdom_plaque));
  const nSteps = 8;
  for (let i = 0; i < nSteps; i++) {
    const sp = clamp(stepsProg * nSteps - i);
    if (sp <= 0.02) continue;
    const frac = i / (nSteps - 1);
    const side = i % 2 === 0 ? -1 : 1;
    const sx = W / 2 + side * lerp(44, 18, frac);
    const sy = lerp(1530, 1190, frac);
    const sc = lerp(1.16, 0.56, frac) * popS(sp, 1.1);
    // Sole + separate heel for an unmistakable upright human footprint!
    const sole = P2((q) => {
      q.ellipse(sx, sy - 9 * sc, 14 * sc, 20 * sc, side * 0.05, 0, TAU);
    });
    const heel = P2((q) => {
      q.ellipse(sx - side * 2 * sc, sy + 18 * sc, 10 * sc, 11 * sc, 0, 0, TAU);
    });
    gc.leaf(sole, [sx - 20 * sc, sy - 34 * sc, 40 * sc, 46 * sc], { lw: 2.0, rimW: 2 });
    gc.leaf(heel, [sx - 16 * sc, sy + 4 * sc, 32 * sc, 30 * sc], { lw: 2.0, rimW: 2 });
    if (i >= 3) {
      gc.pushFlash(sx, sy, 48 * sc, 0.9);
    }
  }
}
