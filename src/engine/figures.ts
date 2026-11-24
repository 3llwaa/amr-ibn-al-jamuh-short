import {
  GildedCtx,
  PAL,
  P2,
  TAU,
  clamp,
  lerp,
  mulberry,
  polyPath,
  spirePts,
  starPath,
} from './gildedKit';

// ------------------------------------------------------------------
// 1. Ornate Islamic Illuminated Shamsa (Sunburst Medallion)
// ------------------------------------------------------------------
export function drawShamsa(
  gc: GildedCtx,
  cx: number,
  cy: number,
  R: number,
  rot = 0,
  raysLit = 1,
  dimOverride?: number
) {
  const g = gc.ctx;
  const nPetals = 12;

  // Radiating fine gold needles around outer rim
  if (raysLit > 0.02) {
    const nRays = 24;
    for (let i = 0; i < nRays; i++) {
      const a = rot * 0.5 + (i * TAU) / nRays;
      const long = i % 2 === 0;
      const r0 = R * 0.96;
      const r1 = R * (long ? 1.38 : 1.18) * (0.4 + 0.6 * raysLit);
      const rayP = P2((q) => {
        q.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        q.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      });
      gc.goldStroke(rayP, long ? 4.2 : 2.6, { dim: dimOverride, inkW: 2.0 });
      if (long && raysLit > 0.4) {
        const tx = cx + Math.cos(a) * (r1 + 10);
        const ty = cy + Math.sin(a) * (r1 + 10);
        const tip = P2((q) => q.arc(tx, ty, 5.5, 0, TAU));
        gc.leaf(tip, [tx - 8, ty - 8, 16, 16], { dim: dimOverride, lw: 1.6, rimW: 2 });
        if (i % 4 === 0) gc.pushFlash(tx, ty, 55, 0.9);
      }
    }
  }

  // Outer scalloped gold rosette (12 pointed ogive lobes)
  const outer = P2((q) => {
    for (let i = 0; i < nPetals; i++) {
      const a0 = rot + (i * TAU) / nPetals;
      const am = rot + ((i + 0.5) * TAU) / nPetals;
      const a1 = rot + ((i + 1) * TAU) / nPetals;
      const x0 = cx + Math.cos(a0) * R * 0.84;
      const y0 = cy + Math.sin(a0) * R * 0.84;
      const xm = cx + Math.cos(am) * R * 1.06;
      const ym = cy + Math.sin(am) * R * 1.06;
      const x1 = cx + Math.cos(a1) * R * 0.84;
      const y1 = cy + Math.sin(a1) * R * 0.84;
      if (i === 0) q.moveTo(x0, y0);
      q.quadraticCurveTo(
        cx + Math.cos(a0 + 0.14) * R * 0.99,
        cy + Math.sin(a0 + 0.14) * R * 0.99,
        xm,
        ym
      );
      q.quadraticCurveTo(
        cx + Math.cos(a1 - 0.14) * R * 0.99,
        cy + Math.sin(a1 - 0.14) * R * 0.99,
        x1,
        y1
      );
    }
    q.closePath();
  });
  gc.leaf(outer, [cx - R * 1.15, cy - R * 1.15, R * 2.3, R * 2.3], {
    dim: dimOverride,
    lw: 3.0,
    rimW: 7,
    punched: true,
  });

  // Lapis ultramarine ring with white-lead pearls
  const lapisRing = P2((q) => q.arc(cx, cy, R * 0.78, 0, TAU));
  gc.shape(lapisRing, PAL.ULTRA, PAL.ULTRA_D, 12, 2.8);
  gc.pearls(cx, cy, R * 0.72, 36, 3.0, 0.94);

  // Vermilion inner band
  const vermRing = P2((q) => q.arc(cx, cy, R * 0.62, 0, TAU));
  gc.shape(vermRing, PAL.VERM, PAL.VERM_D, 10, 2.6);

  // 12-pointed geometric gold star inside
  const innerStar = starPath(cx, cy, R * 0.57, 0.62, rot, 12);
  gc.leaf(innerStar, [cx - R * 0.6, cy - R * 0.6, R * 1.2, R * 1.2], {
    dim: dimOverride,
    lw: 2.6,
    rimW: 5,
  });

  // Verdigris core + central gold boss
  const core = P2((q) => q.arc(cx, cy, R * 0.30, 0, TAU));
  gc.shape(core, PAL.VERDI, PAL.VERDI_D, 8, 2.4);
  gc.pearls(cx, cy, R * 0.24, 16, 2.4, 0.92);

  const boss = starPath(cx, cy, R * 0.18, 0.52, -rot, 8);
  gc.leaf(boss, [cx - R * 0.22, cy - R * 0.22, R * 0.44, R * 0.44], {
    dim: dimOverride,
    lw: 2.0,
    rimW: 3,
  });
  gc.pushFlash(cx, cy, R * 0.95, 1.15);

  // Subtle decorative gold triads inside lapis band
  g.save();
  for (let i = 0; i < 12; i++) {
    const a = rot + ((i + 0.5) * TAU) / 12;
    gc.triad(cx + Math.cos(a) * R * 0.67, cy + Math.sin(a) * R * 0.67, 2.0, 0.85, a);
  }
  g.restore();
}

// ------------------------------------------------------------------
// 2. Scalloped Miniature Cloud (Traditional Illumination Motif)
// ------------------------------------------------------------------
export function drawScallopedCloud(
  gc: GildedCtx,
  x: number,
  y: number,
  sc = 1,
  fill = PAL.LILAC,
  rim = PAL.LILAC_D,
  goldTrim = false
) {
  const p = P2((q) => {
    q.moveTo(x - 110 * sc, y + 18 * sc);
    q.bezierCurveTo(x - 135 * sc, y + 12 * sc, x - 125 * sc, y - 22 * sc, x - 86 * sc, y - 20 * sc);
    q.bezierCurveTo(x - 84 * sc, y - 56 * sc, x - 36 * sc, y - 62 * sc, x - 22 * sc, y - 34 * sc);
    q.bezierCurveTo(x - 8 * sc, y - 74 * sc, x + 52 * sc, y - 68 * sc, x + 58 * sc, y - 26 * sc);
    q.bezierCurveTo(x + 96 * sc, y - 36 * sc, x + 126 * sc, y - 4 * sc, x + 98 * sc, y + 16 * sc);
    q.bezierCurveTo(x + 52 * sc, y + 28 * sc, x - 52 * sc, y + 28 * sc, x - 110 * sc, y + 18 * sc);
    q.closePath();
  });
  gc.shape(p, fill, rim, 9, 2.4);
  gc.hiLine(
    [
      [x - 76 * sc, y - 22 * sc],
      [x - 45 * sc, y - 42 * sc],
      [x - 18 * sc, y - 28 * sc],
    ],
    2.2,
    0.85
  );
  gc.hiLine(
    [
      [x + 2 * sc, y - 48 * sc],
      [x + 36 * sc, y - 46 * sc],
      [x + 52 * sc, y - 24 * sc],
    ],
    2.2,
    0.85
  );
  gc.triad(x - 12 * sc, y - 4 * sc, 2.2 * sc, 0.8);
  gc.triad(x + 38 * sc, y + 2 * sc, 2.0 * sc, 0.78);

  if (goldTrim) {
    const tail = P2((q) => {
      q.moveTo(x - 102 * sc, y + 14 * sc);
      q.bezierCurveTo(x - 148 * sc, y + 24 * sc, x - 165 * sc, y + 2 * sc, x - 195 * sc, y + 10 * sc);
    });
    gc.goldStroke(tail, 4.5 * sc, { inkW: 2.0 });
  }
}

// ------------------------------------------------------------------
// 3. Stepped Leaning Medieval Mountain Clusters (Mount Uhud)
// ------------------------------------------------------------------
export interface MountainCluster {
  x: number;
  w: number;
  h: number;
  lean: number;
  sub: number;
}

export function drawUhudRange(
  gc: GildedCtx,
  baseY: number,
  seed: number,
  clusters: MountainCluster[],
  fill: string,
  rim: string,
  withGoldVeins = false,
  shakeX = 0
) {
  const R = mulberry(seed);
  for (const cl of clusters) {
    // Draw flanking secondary spires first, then main tall spire
    const parts: { bx: number; w: number; h: number; lean: number }[] = [];
    for (let s = 0; s < cl.sub; s++) {
      const side = s % 2 === 0 ? -1 : 1;
      const frac = 0.56 + R() * 0.24;
      parts.push({
        bx: cl.x + shakeX + side * cl.w * (0.34 + R() * 0.16),
        w: cl.w * (0.55 + R() * 0.15),
        h: cl.h * frac,
        lean: cl.lean + side * (0.06 + R() * 0.08),
      });
    }
    parts.push({ bx: cl.x + shakeX, w: cl.w, h: cl.h, lean: cl.lean });

    for (const part of parts) {
      const pts = spirePts(part.bx, baseY, part.w, part.h, part.lean, R);
      const path = polyPath(pts, true);
      gc.shape(path, fill, rim, 12, 2.8);

      // White-lead highlight along sunward flank
      const hiPts = pts.slice(1, Math.min(8, Math.floor(pts.length / 2)));
      gc.hiLine(hiPts, 2.2, 0.72);

      // White-lead rock triads (STYLE.md §1: reads as painted, never flat vector)
      gc.triad(part.bx + part.lean * part.h * 0.35, baseY - part.h * 0.42, 2.6, 0.72);
      gc.triad(part.bx - part.w * 0.14, baseY - part.h * 0.22, 2.4, 0.65);

      if (withGoldVeins && part.h > 260) {
        const crest = P2((q) => {
          const mid = Math.floor(pts.length / 2);
          const pA = pts[Math.max(0, mid - 3)];
          const pB = pts[mid];
          const pC = pts[Math.min(pts.length - 1, mid + 2)];
          q.moveTo(pA[0], pA[1]);
          q.lineTo(pB[0], pB[1]);
          q.lineTo(pC[0], pC[1]);
        });
        gc.goldStroke(crest, 4.5, { inkW: 2.0 });
      }
    }
  }
}

// ------------------------------------------------------------------
// 4. Starry Ultramarine Sky (Gold-leaf 8-point stars that flash with light)
// ------------------------------------------------------------------
export function drawGoldStars(
  gc: GildedCtx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  count: number,
  seed: number,
  t: number
) {
  const R = mulberry(seed);
  for (let i = 0; i < count; i++) {
    const sx = lerp(x0, x1, R());
    const sy = lerp(y0, y1, R());
    const r = 6 + R() * 14;
    const isBig = r > 13;
    if (isBig) {
      const p = starPath(sx, sy, r, 0.36, R() * TAU, 8);
      gc.leaf(p, [sx - r - 2, sy - r - 2, r * 2 + 4, r * 2 + 4], { lw: 1.4, rimW: 2 });
      gc.pushFlash(sx, sy, r * 3.8, 0.85);
    } else {
      const p = starPath(sx, sy, r, 0.42, R() * TAU, 4);
      gc.leaf(p, [sx - r - 2, sy - r - 2, r * 2 + 4, r * 2 + 4], { lw: 1.1, rimW: 1.5 });
      if (i % 3 === 0) {
        gc.ctx.fillStyle = `rgba(255,250,234,${(0.55 + 0.25 * Math.sin(t * 2 + i)).toFixed(2)})`;
        gc.ctx.beginPath();
        gc.ctx.arc(sx + r * 1.4, sy - r * 0.6, 2.0, 0, TAU);
        gc.ctx.fill();
      }
    }
  }
}

// ------------------------------------------------------------------
// 5. Pointed Islamic Archway (Medina Courtyard / Sanctuary Gate)
// ------------------------------------------------------------------
export function drawMedinaArch(
  gc: GildedCtx,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  fillInterior = PAL.ULTRA_D
) {
  const hw = w / 2;
  const springY = baseY - h * 0.56;
  const topY = baseY - h;

  // Outer rectangular stone-sandstone / coral frame
  const outerBox = P2((q) => {
    q.rect(cx - hw - 44, topY - 46, w + 88, h + 46);
  });
  gc.shape(outerBox, PAL.CORAL, PAL.CORAL_D, 14, 3.0);

  // Gilded spandrels (triangles above pointed arch)
  const spandrelL = P2((q) => {
    q.moveTo(cx - hw - 26, topY - 26);
    q.lineTo(cx, topY - 26);
    q.lineTo(cx, topY);
    q.quadraticCurveTo(cx - hw * 0.72, topY + h * 0.14, cx - hw, springY);
    q.lineTo(cx - hw - 26, springY);
    q.closePath();
  });
  const spandrelR = P2((q) => {
    q.moveTo(cx + hw + 26, topY - 26);
    q.lineTo(cx, topY - 26);
    q.lineTo(cx, topY);
    q.quadraticCurveTo(cx + hw * 0.72, topY + h * 0.14, cx + hw, springY);
    q.lineTo(cx + hw + 26, springY);
    q.closePath();
  });
  gc.leaf(spandrelL, [cx - hw - 30, topY - 30, hw + 35, h * 0.5 + 35], { lw: 2.4, punched: true });
  gc.leaf(spandrelR, [cx - 5, topY - 30, hw + 35, h * 0.5 + 35], { lw: 2.4, punched: true });

  // Pointed arch interior cutout
  const arch = P2((q) => {
    q.moveTo(cx - hw, baseY);
    q.lineTo(cx - hw, springY);
    q.quadraticCurveTo(cx - hw * 0.72, topY + h * 0.14, cx, topY);
    q.quadraticCurveTo(cx + hw * 0.72, topY + h * 0.14, cx + hw, springY);
    q.lineTo(cx + hw, baseY);
    q.closePath();
  });
  gc.shape(arch, fillInterior, PAL.ULTRA_NIGHT, 12, 3.2);

  // Gold arch moulding + white-lead pearls along outer frame
  const archRim = P2((q) => {
    q.moveTo(cx - hw, baseY);
    q.lineTo(cx - hw, springY);
    q.quadraticCurveTo(cx - hw * 0.72, topY + h * 0.14, cx, topY);
    q.quadraticCurveTo(cx + hw * 0.72, topY + h * 0.14, cx + hw, springY);
    q.lineTo(cx + hw, baseY);
  });
  gc.goldStroke(archRim, 10, { inkW: 3.0 });

  gc.pearlLine(
    [
      [cx - hw - 34, topY - 36],
      [cx + hw + 34, topY - 36],
    ],
    22,
    3.0
  );
  gc.triad(cx - hw * 0.65, topY + 28, 3.0);
  gc.triad(cx + hw * 0.65, topY + 28, 3.0);
}

// ------------------------------------------------------------------
// 6. Radiant Prophetic Light Arch (Respectful Non-Figurative Illumination)
// ------------------------------------------------------------------
export function drawRadiantPropheticArch(
  gc: GildedCtx,
  cx: number,
  cy: number,
  R: number,
  intensity: number,
  t: number
) {
  const g = gc.ctx;
  // Soft warm descending beam inside deep ultramarine (never washing out the sky)
  if (intensity > 0.05) {
    g.save();
    const beam = g.createLinearGradient(cx, cy, cx, cy + R * 5.2);
    beam.addColorStop(0, `rgba(248,214,126,${(0.32 * intensity).toFixed(3)})`);
    beam.addColorStop(0.55, `rgba(232,184,84,${(0.14 * intensity).toFixed(3)})`);
    beam.addColorStop(1, 'rgba(232,184,84,0)');
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(cx - R * 0.55, cy + R * 0.2);
    g.lineTo(cx + R * 0.55, cy + R * 0.2);
    g.lineTo(cx + R * 2.4, cy + R * 5.2);
    g.lineTo(cx - R * 2.4, cy + R * 5.2);
    g.closePath();
    g.fill();
    g.restore();
  }

  // Ornate pointed aureole behind shamsa
  const halo = P2((q) => {
    q.moveTo(cx, cy - R * 1.48);
    q.bezierCurveTo(cx + R * 1.35, cy - R * 0.72, cx + R * 1.35, cy + R * 0.95, cx, cy + R * 1.32);
    q.bezierCurveTo(cx - R * 1.35, cy + R * 0.95, cx - R * 1.35, cy - R * 0.72, cx, cy - R * 1.48);
    q.closePath();
  });
  gc.shape(halo, PAL.LAPIS_D, PAL.ULTRA_D, 12, 3.0);
  gc.goldStroke(halo, 7, { dim: Math.max(0.05, 0.7 - intensity * 0.65) });

  drawShamsa(gc, cx, cy, R * 0.88, t * 0.12, intensity, Math.max(0.05, 0.65 - intensity * 0.6));
}

// ------------------------------------------------------------------
// 7. Botanical Motifs (Date Palm & Illuminated Cypress)
// ------------------------------------------------------------------
export function drawCypress(gc: GildedCtx, x: number, baseY: number, h: number, w: number, goldFruit = false) {
  // Trunk
  const trunk = P2((q) => {
    q.moveTo(x - w * 0.14, baseY);
    q.lineTo(x - w * 0.08, baseY - h * 0.22);
    q.lineTo(x + w * 0.08, baseY - h * 0.22);
    q.lineTo(x + w * 0.14, baseY);
    q.closePath();
  });
  gc.shape(trunk, PAL.WOOD, PAL.WOOD_D, 5, 2.2);

  // Flame-shaped cypress crown
  const crown = P2((q) => {
    q.moveTo(x, baseY - h);
    q.bezierCurveTo(x + w * 0.75, baseY - h * 0.68, x + w * 0.65, baseY - h * 0.22, x, baseY - h * 0.16);
    q.bezierCurveTo(x - w * 0.65, baseY - h * 0.22, x - w * 0.75, baseY - h * 0.68, x, baseY - h);
    q.closePath();
  });
  gc.shape(crown, PAL.VERD, PAL.VERD_D, 11, 2.6);
  gc.hiLine(
    [
      [x - w * 0.25, baseY - h * 0.34],
      [x - w * 0.32, baseY - h * 0.56],
      [x - w * 0.12, baseY - h * 0.82],
    ],
    2.2,
    0.78
  );

  // White-lead leaf triads
  gc.triad(x - w * 0.12, baseY - h * 0.62, 2.5);
  gc.triad(x + w * 0.16, baseY - h * 0.42, 2.5);
  gc.triad(x - w * 0.06, baseY - h * 0.28, 2.3);

  if (goldFruit) {
    const spots: [number, number][] = [
      [x - w * 0.18, baseY - h * 0.5],
      [x + w * 0.14, baseY - h * 0.66],
      [x + w * 0.04, baseY - h * 0.36],
    ];
    for (const [fx, fy] of spots) {
      const fp = P2((q) => q.arc(fx, fy, 7.5, 0, TAU));
      gc.leaf(fp, [fx - 10, fy - 10, 20, 20], { lw: 1.6, rimW: 2 });
      gc.pushFlash(fx, fy, 36, 0.75);
    }
  }
}

export function drawDatePalm(gc: GildedCtx, x: number, baseY: number, h: number, lean = 0.08) {
  const tx = x + lean * h;
  const ty = baseY - h;
  const trunk = P2((q) => {
    q.moveTo(x - 14, baseY);
    q.quadraticCurveTo(x + lean * h * 0.45 - 10, baseY - h * 0.5, tx - 8, ty);
    q.lineTo(tx + 8, ty);
    q.quadraticCurveTo(x + lean * h * 0.45 + 10, baseY - h * 0.5, x + 14, baseY);
    q.closePath();
  });
  gc.shape(trunk, PAL.WOOD, PAL.WOOD_D, 6, 2.4);

  // Fronds (flat painted leaves + white-lead ribs)
  const angles = [-2.65, -2.15, -1.65, -1.1, -0.55, -0.15];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const len = 78 + (i % 2) * 18;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len + 26;
    const mx = tx + Math.cos(a) * len * 0.55;
    const my = ty + Math.sin(a) * len * 0.55 - 12;
    const frond = P2((q) => {
      q.moveTo(tx, ty);
      q.quadraticCurveTo(mx, my - 14, ex, ey);
      q.quadraticCurveTo(mx, my + 12, tx, ty);
      q.closePath();
    });
    gc.shape(frond, i % 2 === 0 ? PAL.VERD : PAL.VERDI, PAL.VERD_D, 5, 2.0);
    gc.hiLine(
      [
        [tx, ty],
        [mx, my],
        [ex, ey],
      ],
      1.6,
      0.65
    );
  }
  // Small golden date clusters
  for (const dx of [-12, 12]) {
    const dp = P2((q) => q.arc(tx + dx, ty + 16, 8, 0, TAU));
    gc.leaf(dp, [tx + dx - 10, ty + 6, 20, 20], { lw: 1.5, rimW: 2 });
  }
}

// ------------------------------------------------------------------
// 8. Amr ibn al-Jamuh (Illuminated Miniature Figure — Vermilion Hero)
// ------------------------------------------------------------------
export interface AmrOpts {
  x: number;
  y: number;
  scale?: number;
  dir?: 1 | -1; // 1 = facing right, -1 = facing left
  mode: 'staff' | 'plea' | 'battle' | 'kneel';
  walkPhase?: number; // continuous phase for limping gait
  armLift?: number; // 0..1
  swordFlash?: number;
}

export function drawAmr(gc: GildedCtx, o: AmrOpts) {
  const g = gc.ctx;
  const sc = o.scale ?? 1.0;
  const dir = o.dir ?? 1;
  const ph = o.walkPhase ?? 0;

  // Authentic asymmetric limp kinematics:
  // When walking, one half of the stride dips and leans heavily onto his wooden staff
  const limpCycle = Math.sin(ph);
  const limpDip = o.mode === 'staff' || o.mode === 'battle' ? Math.max(0, limpCycle) * 14 : 0;
  const torsoTilt =
    o.mode === 'staff'
      ? 0.14 + Math.max(0, limpCycle) * 0.11
      : o.mode === 'battle'
      ? 0.18 + Math.sin(ph) * 0.06
      : o.mode === 'plea'
      ? -0.05
      : 0.25;

  g.save();
  g.translate(o.x, o.y + limpDip * sc);
  g.scale(dir * sc, sc);

  // Soft ground shadow oval (flat ink wash, never soft gradient)
  const sh = P2((q) => q.ellipse(0, 6 - limpDip, 56, 12, 0, 0, TAU));
  g.fillStyle = 'rgba(20,16,32,0.42)';
  g.fill(sh);

  // Back leg (the severely limping leg — slightly shorter, bent back with sandal)
  const backStep = o.mode === 'staff' || o.mode === 'battle' ? -24 + Math.sin(ph + 0.6) * 12 : -18;
  const frontStep = o.mode === 'staff' || o.mode === 'battle' ? 22 - Math.sin(ph) * 20 : 18;
  const backLift = o.mode === 'staff' || o.mode === 'battle' ? Math.max(0, -Math.cos(ph)) * 10 : 0;

  const legBack = P2((q) => {
    q.moveTo(-14, -76);
    q.quadraticCurveTo(backStep - 12, -42, backStep, -12 - backLift);
    q.lineTo(backStep + 22, -8 - backLift);
    q.quadraticCurveTo(backStep + 10, -40, 4, -76);
    q.closePath();
  });
  gc.shape(legBack, PAL.WOOD_D, PAL.INK, 5, 2.4);

  const legFront = P2((q) => {
    q.moveTo(-4, -76);
    q.lineTo(frontStep - 8, -8);
    q.lineTo(frontStep + 24, -4);
    q.lineTo(14, -76);
    q.closePath();
  });
  gc.shape(legFront, PAL.WOOD, PAL.WOOD_D, 5, 2.4);

  // Apply dignified torso lean around hips (-85)
  g.save();
  g.translate(0, -82);
  g.rotate(torsoTilt);

  // Flowing inner robe (deep lapis/ochre under-tunic)
  const tunic = P2((q) => {
    q.moveTo(-36, -118);
    q.lineTo(32, -118);
    q.quadraticCurveTo(46, -42, 48, 42);
    q.quadraticCurveTo(0, 52, -46, 42);
    q.quadraticCurveTo(-48, -36, -36, -118);
    q.closePath();
  });
  gc.shape(tunic, PAL.LAPIS, PAL.LAPIS_D, 11, 2.8);

  // Hero's Vermilion Cloak (STYLE.md §3: vermilion is for the hero!)
  const cloak = P2((q) => {
    q.moveTo(-38, -122);
    q.quadraticCurveTo(8, -134, 34, -116);
    q.quadraticCurveTo(38, -50, 26, 26);
    q.quadraticCurveTo(-8, 36, -56, 38);
    q.quadraticCurveTo(-68, -28, -50, -96);
    q.closePath();
  });
  gc.shape(cloak, PAL.VERM, PAL.VERM_D, 12, 3.0);

  // White-lead highlights & gilded hem on cloak
  gc.hiLine(
    [
      [-32, -112],
      [-46, -48],
      [-48, 22],
    ],
    2.4,
    0.85
  );
  const hem = P2((q) => {
    q.moveTo(-54, 32);
    q.quadraticCurveTo(-8, 30, 24, 21);
  });
  gc.goldStroke(hem, 7, { inkW: 2.2 });
  gc.pearlLine(
    [
      [-48, 20],
      [-14, 18],
      [18, 12],
    ],
    14,
    2.4
  );

  // Gold shoulder collar band
  const collar = P2((q) => {
    q.moveTo(-26, -118);
    q.quadraticCurveTo(4, -104, 28, -116);
  });
  gc.goldStroke(collar, 8, { inkW: 2.2 });

  // Head & elder silver beard (respectful classical manuscript face — never hooded like a monk!)
  const head = P2((q) => q.ellipse(6, -148, 23, 27, 0.06, 0, TAU));
  gc.shape(head, '#d8b08a', '#a87c58', 7, 2.6);

  // Silver-white elder beard
  const beard = P2((q) => {
    q.moveTo(-8, -138);
    q.quadraticCurveTo(10, -134, 29, -144);
    q.quadraticCurveTo(32, -116, 12, -104);
    q.quadraticCurveTo(-6, -108, -10, -126);
    q.closePath();
  });
  gc.shape(beard, PAL.WHITE, '#bfb49e', 6, 2.4);
  gc.hiLine(
    [
      [4, -128],
      [12, -112],
    ],
    1.8,
    0.9
  );

  // Eye & resolute eyebrow
  g.fillStyle = PAL.INK;
  g.beginPath();
  g.arc(17, -152, 3.0, 0, TAU);
  g.fill();
  g.strokeStyle = PAL.INK;
  g.lineWidth = 3.2;
  g.lineCap = 'round';
  g.beginPath();
  const browTilt = o.mode === 'plea' || o.mode === 'battle' ? 4 : 0;
  g.moveTo(9, -161 - browTilt * 0.5);
  g.lineTo(24, -159 + browTilt);
  g.stroke();

  // White wrapped Arab turban with gilded fillet & pearl dots
  const turban = P2((q) => {
    q.ellipse(2, -172, 31, 20, -0.1, 0, TAU);
  });
  gc.shape(turban, PAL.WHITE, '#c2b69f', 8, 2.6);
  const turbFold = P2((q) => {
    q.moveTo(-26, -170);
    q.quadraticCurveTo(2, -184, 30, -168);
  });
  gc.goldStroke(turbFold, 6.5, { inkW: 2.0 });
  gc.hiLine(
    [
      [-18, -182],
      [4, -187],
      [20, -180],
    ],
    2.2,
    0.9
  );

  // Front arm + held prop (wooden staff, raised plea hand, or curved sword)
  const lift = o.armLift ?? 0;
  if (o.mode === 'staff') {
    // Arm gripping tall carved wooden staff planted into the road
    const staffX = 56 - Math.sin(ph) * 8;
    const staff = P2((q) => {
      q.moveTo(staffX - 5, -135);
      q.lineTo(staffX + 5, -135);
      q.lineTo(staffX + 10, 84);
      q.lineTo(staffX + 1, 84);
      q.closePath();
    });
    gc.shape(staff, PAL.WOOD, PAL.WOOD_D, 4, 2.4);
    gc.hiLine(
      [
        [staffX - 1, -128],
        [staffX + 3, 76],
      ],
      1.6,
      0.65
    );

    const arm = P2((q) => {
      q.moveTo(10, -104);
      q.quadraticCurveTo(32, -88, staffX, -76);
      q.lineTo(staffX - 2, -58);
      q.quadraticCurveTo(24, -68, -2, -86);
      q.closePath();
    });
    gc.shape(arm, PAL.VERM, PAL.VERM_D, 7, 2.6);
    const hand = P2((q) => q.arc(staffX + 1, -68, 9, 0, TAU));
    gc.shape(hand, '#d8b08a', '#a87c58', 3, 2.2);
  } else if (o.mode === 'plea') {
    // Left staff steady behind, right arm lifted fervently toward radiant light
    const staff = P2((q) => {
      q.moveTo(-48, -130);
      q.lineTo(-39, -130);
      q.lineTo(-34, 84);
      q.lineTo(-43, 84);
      q.closePath();
    });
    gc.shape(staff, PAL.WOOD, PAL.WOOD_D, 4, 2.4);

    const hx = lerp(46, 68, lift);
    const hy = lerp(-86, -158, lift);
    const arm = P2((q) => {
      q.moveTo(12, -106);
      q.quadraticCurveTo(42, -104, hx, hy);
      q.lineTo(hx - 12, hy + 16);
      q.quadraticCurveTo(28, -82, 0, -84);
      q.closePath();
    });
    gc.shape(arm, PAL.VERM, PAL.VERM_D, 7, 2.6);
    const hand = P2((q) => q.ellipse(hx + 2, hy - 2, 10, 8, -0.5, 0, TAU));
    gc.shape(hand, '#d8b08a', '#a87c58', 3, 2.2);
  } else if (o.mode === 'battle') {
    // Raised arm wielding gleaming curved Arab sword (saif) with burnished gold hilt!
    const swing = Math.sin(ph * 1.4) * 0.25;
    const hx = 58;
    const hy = -132 + swing * 40;
    const arm = P2((q) => {
      q.moveTo(12, -108);
      q.quadraticCurveTo(38, -106, hx, hy);
      q.lineTo(hx - 10, hy + 18);
      q.quadraticCurveTo(26, -84, 0, -86);
      q.closePath();
    });
    gc.shape(arm, PAL.VERM, PAL.VERM_D, 7, 2.6);

    // Sword drawn cleanly from hand
    g.save();
    g.translate(hx + 4, hy + 4);
    g.rotate(-0.62 + swing);
    // Curved steel blade with gold fuller & white-lead edge
    const blade = P2((q) => {
      q.moveTo(0, -6);
      q.quadraticCurveTo(75, -24, 154, -42);
      q.quadraticCurveTo(90, -2, 0, 8);
      q.closePath();
    });
    gc.shape(blade, '#d8dee6', '#7b8799', 6, 2.4);
    gc.hiLine(
      [
        [10, -4],
        [82, -20],
        [144, -38],
      ],
      2.4,
      0.95
    );
    // Gold crossguard & pommel
    const guard = P2((q) => {
      q.moveTo(-6, -24);
      q.lineTo(6, -24);
      q.lineTo(8, 24);
      q.lineTo(-6, 24);
      q.closePath();
    });
    gc.leaf(guard, [-10, -28, 22, 56], { lw: 2.0, rimW: 2 });
    if ((o.swordFlash ?? 0) > 0.2) {
      gc.pushFlash(o.x + dir * (hx + 80) * sc, o.y - 210 * sc, 75, 1.1);
    }
    g.restore();

    const hand = P2((q) => q.arc(hx + 2, hy + 6, 9.5, 0, TAU));
    gc.shape(hand, '#d8b08a', '#a87c58', 3, 2.2);
  }

  g.restore(); // end torso lean
  g.restore(); // end Amr transform
}

// ------------------------------------------------------------------
// 9. One of the 4 Tall Lion-Hearted Sons (Verdigris & Azure Warriors)
// ------------------------------------------------------------------
export interface SonOpts {
  x: number;
  y: number;
  scale?: number;
  dir?: 1 | -1;
  cloakCol: string;
  cloakRim: string;
  hasBanner?: boolean;
  bannerWave?: number;
  shieldRaised?: number; // 0..1
  armOut?: number; // 0..1 blocking gesture
}

export function drawSon(gc: GildedCtx, o: SonOpts) {
  const g = gc.ctx;
  const sc = o.scale ?? 1.0;
  const dir = o.dir ?? 1;

  g.save();
  g.translate(o.x, o.y);
  g.scale(dir * sc, sc);

  // Ground shadow
  g.fillStyle = 'rgba(20,16,32,0.42)';
  g.beginPath();
  g.ellipse(0, 6, 52, 11, 0, 0, TAU);
  g.fill();

  // Tall sturdy boots & legs
  const legL = P2((q) => {
    q.rect(-22, -88, 18, 86);
  });
  const legR = P2((q) => {
    q.rect(8, -88, 18, 86);
  });
  gc.shape(legL, PAL.WOOD_D, PAL.INK, 5, 2.4);
  gc.shape(legR, PAL.WOOD, PAL.WOOD_D, 5, 2.4);

  // Tall spear / lance behind shoulder
  const spear = P2((q) => {
    q.moveTo(-42, 4);
    q.lineTo(-34, 4);
    q.lineTo(-32, -310);
    q.lineTo(-40, -310);
    q.closePath();
  });
  gc.shape(spear, PAL.WOOD, PAL.WOOD_D, 3, 2.2);
  const tip = P2((q) => {
    q.moveTo(-36, -356);
    q.lineTo(-24, -308);
    q.lineTo(-48, -308);
    q.closePath();
  });
  gc.leaf(tip, [-50, -360, 30, 56], { lw: 2.0, rimW: 2 });

  if (o.hasBanner) {
    const wv = Math.sin(o.bannerWave ?? 0) * 14;
    const flag = P2((q) => {
      q.moveTo(-38, -305);
      q.quadraticCurveTo(-92, -300 + wv, -142, -286 - wv * 0.5);
      q.lineTo(-116, -264 - wv * 0.3);
      q.lineTo(-140, -242 + wv * 0.4);
      q.quadraticCurveTo(-88, -248 + wv * 0.7, -38, -252);
      q.closePath();
    });
    gc.shape(flag, PAL.VERM, PAL.VERM_D, 8, 2.4);
    gc.pearlLine(
      [
        [-44, -278],
        [-106, -268],
      ],
      16,
      2.2
    );
  }

  // Broad heroic tunic + draped mantle with rounded organic medieval shoulders
  const body = P2((q) => {
    q.moveTo(-18, -218);
    q.lineTo(18, -218);
    q.quadraticCurveTo(44, -216, 46, -186);
    q.lineTo(50, -56);
    q.quadraticCurveTo(0, -42, -50, -56);
    q.lineTo(-46, -186);
    q.quadraticCurveTo(-44, -216, -18, -218);
    q.closePath();
  });
  gc.shape(body, o.cloakCol, o.cloakRim, 12, 2.8);

  // Draped shoulder mantle & neck
  const mantle = P2((q) => {
    q.moveTo(-36, -206);
    q.quadraticCurveTo(0, -184, 38, -206);
    q.quadraticCurveTo(44, -186, 36, -168);
    q.quadraticCurveTo(0, -158, -38, -172);
    q.closePath();
  });
  gc.shape(mantle, o.cloakRim, PAL.INK, 5, 2.2);

  gc.hiLine(
    [
      [-34, -196],
      [-40, -68],
    ],
    2.2,
    0.8
  );

  // Gold belt & hem
  const belt = P2((q) => q.roundRect(-45, -138, 90, 14, 5));
  gc.leaf(belt, [-48, -140, 96, 18], { lw: 2.0, rimW: 2 });
  gc.pearlLine(
    [
      [-42, -62],
      [42, -62],
    ],
    15,
    2.4
  );

  // Neck
  const neck = P2((q) => q.roundRect(-10, -226, 20, 18, 4));
  gc.shape(neck, '#c99c74', '#9a6e4a', 3, 2.0);

  // Youthful head & helmet/turban
  const head = P2((q) => q.ellipse(4, -246, 22, 25, 0, 0, TAU));
  gc.shape(head, '#d8ad84', '#a67954', 7, 2.5);
  // Short dark beard
  const beard = P2((q) => {
    q.moveTo(-10, -236);
    q.quadraticCurveTo(10, -228, 26, -240);
    q.quadraticCurveTo(22, -218, 4, -216);
    q.quadraticCurveTo(-12, -220, -10, -236);
    q.closePath();
  });
  gc.shape(beard, PAL.INK, PAL.INK, 2, 1.5);
  g.fillStyle = PAL.INK;
  g.beginPath();
  g.arc(14, -250, 2.8, 0, TAU);
  g.fill();

  // Conical gilded Arab helmet wrapped with turban cloth
  const helm = P2((q) => {
    q.moveTo(-24, -260);
    q.quadraticCurveTo(4, -308, 30, -260);
    q.closePath();
  });
  gc.leaf(helm, [-28, -312, 62, 56], { lw: 2.4, rimW: 4 });
  const wrap = P2((q) => q.ellipse(3, -262, 28, 10, 0, 0, TAU));
  gc.shape(wrap, PAL.WHITE, '#bdb09a', 4, 2.2);

  // Round illuminated warrior shield OR outstretched protective hand
  if ((o.armOut ?? 0) > 0.15) {
    const ext = o.armOut ?? 1;
    const arm = P2((q) => {
      q.moveTo(22, -196);
      q.quadraticCurveTo(38, -194, 22 + 62 * ext, -182);
      q.lineTo(22 + 62 * ext, -162);
      q.quadraticCurveTo(36, -170, 14, -172);
      q.closePath();
    });
    gc.shape(arm, o.cloakCol, o.cloakRim, 6, 2.4);
    const palm = P2((q) => q.ellipse(26 + 64 * ext, -174, 8, 14, 0.1, 0, TAU));
    gc.shape(palm, '#d8ad84', '#a67954', 3, 2.2);
  } else {
    const sy = -148 - (o.shieldRaised ?? 0) * 28;
    const shield = P2((q) => q.arc(28, sy, 42, 0, TAU));
    gc.shape(shield, PAL.VERM, PAL.VERM_D, 10, 2.8);
    gc.pearls(28, sy, 33, 18, 2.4);
    const boss = P2((q) => q.arc(28, sy, 15, 0, TAU));
    gc.leaf(boss, [11, sy - 17, 34, 34], { lw: 2.2, rimW: 3 });
  }

  g.restore();
}

// ------------------------------------------------------------------
// 10. Illuminated Manuscript Border (Grows from Corners in S8 Pull-back)
// ------------------------------------------------------------------
export function drawOrnateBorder(gc: GildedCtx, W: number, H: number, progress: number) {
  const p = clamp(progress);
  if (p <= 0.01) return;
  const g = gc.ctx;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);

  const m = 28; // outer margin
  const bw = 42; // border width

  // Outer vermilion frame + inner gold leaf band drawn progressively from corners
  const hSpan = (W / 2 - m) * p;
  const vSpan = (H / 2 - m) * p;

  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];

  for (const [cx, cy, sx, sy] of corners) {
    // Horizontal arm
    const hArm = P2((q) => {
      q.rect(sx > 0 ? cx : cx - hSpan, sy > 0 ? cy : cy - bw, hSpan, bw);
    });
    gc.shape(hArm, PAL.VERM, PAL.VERM_D, 8, 2.6);

    // Vertical arm
    const vArm = P2((q) => {
      q.rect(sx > 0 ? cx : cx - bw, sy > 0 ? cy : cy - vSpan, bw, vSpan);
    });
    gc.shape(vArm, PAL.VERM, PAL.VERM_D, 8, 2.6);

    // Inner gold strip along border
    const hGold = P2((q) => {
      q.rect(sx > 0 ? cx + 10 : cx - hSpan, sy > 0 ? cy + 12 : cy - 28, Math.max(0, hSpan - 10), 16);
    });
    gc.leaf(hGold, [0, 0, W, H], { lw: 1.8, rimW: 2, screenSpace: true });

    const vGold = P2((q) => {
      q.rect(sx > 0 ? cx + 12 : cx - 28, sy > 0 ? cy + 10 : cy - vSpan, 16, Math.max(0, vSpan - 10));
    });
    gc.leaf(vGold, [0, 0, W, H], { lw: 1.8, rimW: 2, screenSpace: true });

    // Ornate corner gold medallion
    const mx = cx + sx * (bw * 0.5);
    const my = cy + sy * (bw * 0.5);
    const med = starPath(mx, my, 28 * p, 0.58, 0, 8);
    gc.leaf(med, [mx - 32, my - 32, 64, 64], { lw: 2.2, rimW: 3, screenSpace: true });
    gc.pearls(mx, my, 12 * p, 8, 2.2);
  }

  g.restore();
}
