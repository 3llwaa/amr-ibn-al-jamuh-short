import React, { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { GildedCtx } from './engine/gildedKit';
import { H, W, renderFrame } from './engine/scenes';

let fontsLoadedPromise: Promise<void> | null = null;

function ensureArabicFonts(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise;
  fontsLoadedPromise = (async () => {
    const specs: [string, string, string][] = [
      ['Amiri', staticFile('fonts/Amiri-Regular.ttf'), '400'],
      ['Amiri', staticFile('fonts/Amiri-Bold.ttf'), '700'],
      ['AmiriQuran', staticFile('fonts/AmiriQuran.ttf'), '400'],
      ['AmiriQuran', staticFile('fonts/AmiriQuran.ttf'), '700'],
    ];
    await Promise.all(
      specs.map(async ([family, url, weight]) => {
        const ff = new FontFace(family, `url(${url})`, { weight });
        const loaded = await ff.load();
        document.fonts.add(loaded);
      })
    );
    await document.fonts.ready;
  })();
  return fontsLoadedPromise;
}

export const AmrShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gcRef = useRef<GildedCtx | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading Amiri Arabic calligraphy fonts'));

  useEffect(() => {
    ensureArabicFonts()
      .then(() => {
        setFontsReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error('Font load error:', err);
        setFontsReady(true);
        continueRender(handle);
      });
  }, [handle]);

  useEffect(() => {
    if (!fontsReady || !canvasRef.current) return;
    if (!gcRef.current) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      gcRef.current = new GildedCtx(ctx, W, H);
    }
    renderFrame(gcRef.current, frame / fps);
  }, [frame, fps, fontsReady]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#121d5c' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
};
