#!/usr/bin/env python3
"""
Original modal score (Oud, Rebab, Ney, Daff/Bendir, Gold Chimes) + procedural foley
+ speech compression, automatic ducking, and two-pass -14 LUFS mastering.
Reads src/timeline.json as single source of truth.
"""
import json
import os
import subprocess
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def midi_to_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def add_stereo(buf: np.ndarray, mono: np.ndarray, t_sec: float, gain: float = 1.0, pan: float = 0.0):
    start = int(round(t_sec * SR))
    if start >= len(buf) or start + len(mono) <= 0:
        return
    src0 = max(0, -start)
    dst0 = max(0, start)
    n = min(len(mono) - src0, len(buf) - dst0)
    if n <= 0:
        return
    ang = (pan + 1.0) * np.pi / 4.0
    gl = gain * np.cos(ang)
    gr = gain * np.sin(ang)
    seg = mono[src0 : src0 + n]
    buf[dst0 : dst0 + n, 0] += seg * gl
    buf[dst0 : dst0 + n, 1] += seg * gr


def synth_oud(midi: float, dur: float, vel: float = 0.8, seed: int = 1) -> np.ndarray:
    """Karplus-Strong plucked oud string with warm wooden body filter."""
    rng = np.random.default_rng(seed)
    freq = midi_to_hz(midi)
    n_samples = int(SR * dur)
    delay = max(2, int(round(SR / freq)))
    # Warm plucked excitation (low-passed noise burst)
    exc = rng.standard_normal(delay).astype(np.float64)
    b_lp, a_lp = signal.butter(2, min(0.45, (freq * 4.5) / (SR / 2)), btype="low")
    exc = signal.lfilter(b_lp, a_lp, exc)
    exc /= np.max(np.abs(exc)) + 1e-9

    y = np.zeros(n_samples, dtype=np.float64)
    y[:delay] = exc * vel
    damp = 0.9945 if midi < 60 else 0.9925
    # Vectorized block KS loop (fast in numpy via python delay blocks)
    # Process in chunks of delay samples
    idx = delay
    while idx < n_samples:
        chunk = min(delay, n_samples - idx)
        prev = y[idx - delay : idx - delay + chunk]
        prev_shift = np.empty_like(prev)
        prev_shift[0] = y[idx - delay - 1] if idx - delay - 1 >= 0 else prev[0]
        prev_shift[1:] = prev[:-1]
        y[idx : idx + chunk] = damp * (0.58 * prev + 0.42 * prev_shift)
        idx += chunk

    # Subtle body resonance + envelope
    env = np.exp(-np.linspace(0, 3.2, n_samples))
    fade = min(int(0.03 * SR), n_samples // 4)
    env[-fade:] *= np.linspace(1, 0, fade)
    y = y * env
    # High-pass to keep low end clean (skip mud below 75 Hz)
    bh, ah = signal.butter(2, 75.0 / (SR / 2), btype="high")
    y = signal.lfilter(bh, ah, y)
    return y.astype(np.float32)


def synth_ney(midi: float, dur: float, vel: float = 0.65, seed: int = 2) -> np.ndarray:
    """Breathy Middle Eastern reed flute (Ney) with gentle vibrato and air chiff."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi)
    # Gentle pitch scoop + warm vibrato after 0.2s
    vib = 0.008 * np.clip((t - 0.18) / 0.35, 0, 1) * np.sin(2 * np.pi * 5.2 * t)
    scoop = -0.025 * np.exp(-t * 14.0)
    phase = 2 * np.pi * np.cumsum(f0 * (1.0 + vib + scoop)) / SR

    tone = (
        0.72 * np.sin(phase)
        + 0.22 * np.sin(2 * phase + 0.4)
        + 0.08 * np.sin(3 * phase)
    )
    # Breathy air noise bandpassed around 2.2 * f0
    noise = rng.standard_normal(n)
    lo = max(300.0, min(f0 * 1.4, SR * 0.4))
    hi = max(lo + 400.0, min(f0 * 4.5, SR * 0.46))
    bb, ab = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    breath = signal.lfilter(bb, ab, noise) * 0.18

    atk = min(int(0.14 * SR), n // 3)
    rel = min(int(0.22 * SR), n // 3)
    env = np.ones(n)
    env[:atk] = np.sin(np.linspace(0, np.pi / 2, atk)) ** 2
    env[-rel:] = np.cos(np.linspace(0, np.pi / 2, rel)) ** 2
    return ((tone + breath) * env * vel * 0.42).astype(np.float32)


def synth_rebab(midi: float, dur: float, vel: float = 0.55) -> np.ndarray:
    """Warm bowed string (Rebab / medieval fiddle) for emotional sustain."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi)
    vib = 0.006 * np.clip((t - 0.25) / 0.4, 0, 1) * np.sin(2 * np.pi * 4.8 * t)
    phase = 2 * np.pi * np.cumsum(f0 * (1.0 + vib)) / SR
    # Soft saw-like bowed spectrum (rolled off above 4th harmonic)
    y = np.zeros(n)
    for k, amp in [(1, 1.0), (2, 0.55), (3, 0.30), (4, 0.16), (5, 0.08)]:
        y += amp * np.sin(k * phase + k * 0.3)
    b, a = signal.butter(2, [140.0 / (SR / 2), 2600.0 / (SR / 2)], btype="band")
    y = signal.lfilter(b, a, y)
    atk = min(int(0.25 * SR), n // 3)
    rel = min(int(0.35 * SR), n // 3)
    env = np.ones(n)
    env[:atk] = np.linspace(0, 1, atk) ** 1.5
    env[-rel:] = np.linspace(1, 0, rel) ** 1.5
    return (y * env * vel * 0.22).astype(np.float32)


def synth_daff(kind: str = "dum", vel: float = 0.8, seed: int = 3) -> np.ndarray:
    """Frame drum (Daff / Bendir): deep resonant 'dum' or crisp rim 'tak'."""
    rng = np.random.default_rng(seed)
    if kind == "dum":
        dur = 0.42
        n = int(SR * dur)
        t = np.arange(n) / SR
        # Pitch drops slightly from 118 Hz to 76 Hz (warm frame skin, audible on phone speakers via 2nd harmonic)
        f = 76.0 + 44.0 * np.exp(-t * 28.0)
        ph = 2 * np.pi * np.cumsum(f) / SR
        body = np.sin(ph) * np.exp(-t * 7.5) + 0.35 * np.sin(2 * ph) * np.exp(-t * 11.0)
        slap = signal.lfilter(*signal.butter(2, 900.0 / (SR / 2)), rng.standard_normal(n)) * np.exp(-t * 60.0) * 0.28
        return ((body + slap) * vel * 0.58).astype(np.float32)
    else:
        dur = 0.16
        n = int(SR * dur)
        t = np.arange(n) / SR
        rim = np.sin(2 * np.pi * 310.0 * t) * np.exp(-t * 24.0) + 0.45 * np.sin(2 * np.pi * 620.0 * t) * np.exp(-t * 32.0)
        snap = signal.lfilter(*signal.butter(2, [1200 / (SR / 2), 5500 / (SR / 2)], btype="band"), rng.standard_normal(n))
        snap *= np.exp(-t * 45.0) * 0.45
        return ((rim * 0.5 + snap) * vel * 0.42).astype(np.float32)


def synth_gold_bell(midi: float, dur: float = 2.6, vel: float = 0.7) -> np.ndarray:
    """Burnished gold-leaf shimmer bell / hand chime (inharmonic brass partials)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = midi_to_hz(midi)
    partials = [(1.0, 1.0, 1.4), (2.0, 0.55, 2.2), (2.756, 0.32, 3.1), (4.07, 0.18, 4.5), (5.4, 0.08, 6.2)]
    y = np.zeros(n)
    for ratio, amp, dec in partials:
        y += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t * dec)
    atk = int(0.005 * SR)
    y[:atk] *= np.linspace(0, 1, atk)
    return (y * vel * 0.24).astype(np.float32)


def synth_wind(dur: float, seed: int = 10) -> np.ndarray:
    """Soft desert breeze across Mount Uhud."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    b, a = signal.butter(2, [180 / (SR / 2), 680 / (SR / 2)], btype="band")
    w = signal.lfilter(b, a, noise)
    mod = 0.65 + 0.35 * np.sin(2 * np.pi * 0.17 * t + 0.8) * np.sin(2 * np.pi * 0.07 * t)
    return (w * mod * 0.045).astype(np.float32)


def synth_foley_parchment(dur: float = 0.55, seed: int = 20) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    b, a = signal.butter(2, [1100 / (SR / 2), 4800 / (SR / 2)], btype="band")
    y = signal.lfilter(b, a, noise)
    env = np.sin(np.pi * t / dur) ** 1.4 * (0.7 + 0.3 * np.sin(2 * np.pi * 14 * t))
    return (y * env * 0.16).astype(np.float32)


def synth_foley_staff_step(heavy: bool = False, seed: int = 30) -> np.ndarray:
    rng = np.random.default_rng(seed)
    dur = 0.20 if heavy else 0.12
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    if heavy:
        b, a = signal.butter(2, [90 / (SR / 2), 480 / (SR / 2)], btype="band")
        thud = np.sin(2 * np.pi * 115 * t) * np.exp(-t * 25.0)
        grit = signal.lfilter(b, a, noise) * np.exp(-t * 16.0)
        return ((thud * 0.45 + grit * 0.55) * 0.22).astype(np.float32)
    else:
        # Crisp wooden staff tap on stone
        b, a = signal.butter(2, [600 / (SR / 2), 2600 / (SR / 2)], btype="band")
        tap = np.sin(2 * np.pi * 780 * t) * np.exp(-t * 48.0)
        click = signal.lfilter(b, a, noise) * np.exp(-t * 55.0)
        return ((tap * 0.5 + click * 0.5) * 0.20).astype(np.float32)


def synth_foley_sword(kind: str = "draw", seed: int = 40) -> np.ndarray:
    rng = np.random.default_rng(seed)
    if kind == "draw":
        dur = 0.65
        n = int(SR * dur)
        t = np.arange(n) / SR
        f_sweep = np.linspace(1800, 4200, n)
        ph = 2 * np.pi * np.cumsum(f_sweep) / SR
        ring = (np.sin(ph) + 0.5 * np.sin(1.47 * ph) + 0.3 * np.sin(2.31 * ph)) * np.exp(-t * 4.5)
        scrape = signal.lfilter(*signal.butter(2, [2200 / (SR / 2), 7000 / (SR / 2)], btype="band"), rng.standard_normal(n))
        scrape *= np.sin(np.pi * t / dur) * 0.35
        return ((ring * 0.28 + scrape) * 0.22).astype(np.float32)
    else:
        dur = 0.45
        n = int(SR * dur)
        t = np.arange(n) / SR
        clash = (
            np.sin(2 * np.pi * 2450 * t) * np.exp(-t * 8.0)
            + 0.7 * np.sin(2 * np.pi * 3710 * t) * np.exp(-t * 10.5)
            + 0.5 * np.sin(2 * np.pi * 5180 * t) * np.exp(-t * 14.0)
        )
        imp = rng.standard_normal(n) * np.exp(-t * 75.0) * 0.6
        return ((clash * 0.35 + imp * 0.25) * 0.20).astype(np.float32)


def synth_rumble(dur: float = 1.1) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = (
        np.sin(2 * np.pi * 58 * t) * 0.65
        + np.sin(2 * np.pi * 87 * t) * 0.35
        + np.sin(2 * np.pi * 116 * t) * 0.20
    )
    env = np.sin(np.pi * t / dur) ** 1.2 * np.exp(-t * 1.4)
    return (y * env * 0.28).astype(np.float32)


def simple_reverb(stereo: np.ndarray, mix: float = 0.22) -> np.ndarray:
    """Clean Schroeder-style multi-tap desert/mosque hall reverb."""
    out = stereo.copy()
    taps = [(0.029, 0.32), (0.047, 0.26), (0.073, 0.21), (0.111, 0.16), (0.167, 0.11), (0.241, 0.07)]
    wet = np.zeros_like(stereo)
    for dt, g in taps:
        d = int(dt * SR)
        if d < len(stereo):
            wet[d:, 0] += stereo[:-d, 1] * g
            wet[d:, 1] += stereo[:-d, 0] * g
    # Dampen highs in reverb tail
    b, a = signal.butter(2, 3400.0 / (SR / 2), btype="low")
    wet[:, 0] = signal.lfilter(b, a, wet[:, 0])
    wet[:, 1] = signal.lfilter(b, a, wet[:, 1])
    return out + wet * mix


def compress_voice(x: np.ndarray) -> np.ndarray:
    """Smooth dynamic range compressor for clear narration."""
    # High-pass rumble below 85 Hz + warm presence at 2.8 kHz
    bh, ah = signal.butter(2, 85.0 / (SR / 2), btype="high")
    x = signal.lfilter(bh, ah, x)
    # Envelope follower
    abs_x = np.abs(x)
    b_env, a_env = signal.butter(1, 18.0 / (SR / 2), btype="low")
    env = np.maximum(1e-5, signal.lfilter(b_env, a_env, abs_x))
    thresh = 0.14
    ratio = 3.2
    gain = np.where(env > thresh, (thresh * (env / thresh) ** (1.0 / ratio)) / env, 1.0)
    y = x * gain
    # Normalize voice RMS to -17 dBFS
    rms = np.sqrt(np.mean(y[np.abs(y) > 0.01] ** 2) + 1e-9)
    target_rms = 10 ** (-17.0 / 20.0)
    y = y * (target_rms / rms)
    return np.tanh(y * 1.05) / 1.05


def main():
    with open(os.path.join(ROOT, "src", "timeline.json"), "r", encoding="utf-8") as f:
        tl = json.load(f)

    dur = tl["durationSec"]
    n_total = int(np.ceil((dur + 0.1) * SR))
    shots = {s["shot"]: s for s in tl["shots"]}
    marks = tl["marks"]
    cues = tl["cues"]

    # 1. Assemble narration track
    voice_mono = np.zeros(n_total, dtype=np.float64)
    speech_mask = np.zeros(n_total, dtype=np.float64)
    for c in cues:
        w, sr = sf.read(os.path.join(ROOT, c["wav"]), dtype="float32")
        if w.ndim > 1:
            w = w.mean(axis=1)
        i0 = int(round(c["t0"] * SR))
        i1 = min(n_total, i0 + len(w))
        voice_mono[i0:i1] += w[: i1 - i0]
        speech_mask[i0:i1] = 1.0

    voice_comp = compress_voice(voice_mono)

    # Smooth ducking envelope (music ducks ~7 dB under narration, blooms in pauses)
    b_dk, a_dk = signal.butter(2, 2.2 / (SR / 2), btype="low")
    duck_env = np.clip(signal.filtfilt(b_dk, a_dk, speech_mask), 0.0, 1.0)
    music_duck = 1.0 - 0.56 * duck_env

    # Silence dips at the 2 mandatory dramatic silences (DIRECTOR.md §6)
    silence_env = np.ones(n_total, dtype=np.float64)
    for s_time, s_len in [
        (marks["silence_before_permission"], 0.62),
        (marks["martyrdom"] + 0.25, 0.72),
    ]:
        i0 = int(max(0, (s_time - 0.10) * SR))
        i1 = int(min(n_total, (s_time + s_len) * SR))
        if i1 > i0:
            t_seg = np.linspace(0, 1, i1 - i0)
            dip = 1.0 - 0.88 * np.sin(np.pi * t_seg) ** 1.4
            silence_env[i0:i1] *= dip

    # 2. Compose original Hijaz/Dorian score in D
    music = np.zeros((n_total, 2), dtype=np.float64)
    # D Hijaz notes: D3=50, Eb3=51, F#3=54, G3=55, A3=57, Bb3=58, C4=60, D4=62, Eb4=63, F#4=66, G4=67, A4=69
    # S1: Hook — dramatic oud ostinato + shimmer bell on spark
    add_stereo(music, synth_gold_bell(74, 2.8, 0.75), marks["hook_spark"], 0.85, 0.0)
    add_stereo(music, synth_gold_bell(81, 2.4, 0.45), marks["hook_spark"] + 0.14, 0.55, 0.25)
    add_stereo(music, synth_rebab(50, shots[1]["dur"] + 0.8, 0.48), 0.15, 0.75, -0.25)
    for idx, (dt, note) in enumerate([(0.35, 50), (0.85, 57), (1.35, 62), (1.85, 63), (2.35, 62), (2.95, 57), (3.55, 54)]):
        if dt < shots[1]["t1"]:
            add_stereo(music, synth_oud(note, 1.4, 0.75, seed=100 + idx), dt, 0.55, -0.18 if idx % 2 == 0 else 0.18)

    # S2 & S3: Story setup — warm steady Oud pulse + melancholic Rebab + Ney
    t_cur = shots[2]["t0"]
    s23_end = shots[4]["t0"]
    pattern_s2 = [50, 57, 62, 58, 57, 54, 57, 50]
    step = 0
    while t_cur < s23_end - 0.2:
        note = pattern_s2[step % len(pattern_s2)]
        add_stereo(music, synth_oud(note, 1.35, 0.65, seed=200 + step), t_cur, 0.44, -0.22 if step % 2 == 0 else 0.22)
        if step % 4 == 0:
            add_stereo(music, synth_daff("dum", 0.45, seed=250 + step), t_cur, 0.35, 0.0)
        elif step % 4 == 2 and t_cur >= shots[3]["t0"]:
            # Four lions enter: subtle noble daff tak
            add_stereo(music, synth_daff("tak", 0.45, seed=260 + step), t_cur, 0.32, 0.12)
        t_cur += 0.62
        step += 1

    # Soulful Ney melody across S2-S3
    ney_s23 = [
        (shots[2]["t0"] + 0.4, 69, 1.9),
        (shots[2]["t0"] + 2.5, 67, 1.6),
        (shots[2]["t0"] + 4.3, 66, 2.2),
        (shots[3]["t0"] + 0.3, 62, 1.8),
        (shots[3]["t0"] + 2.3, 69, 2.3),
    ]
    for idx, (nt, nm, nd) in enumerate(ney_s23):
        if nt < s23_end:
            add_stereo(music, synth_ney(nm, nd, 0.62, seed=300 + idx), nt, 0.68, 0.20)

    # S4: Sons' plea & Quranic verse — sacred stillness, high harmonic shimmer + gentle oud
    add_stereo(music, synth_rebab(57, shots[4]["dur"] + 0.5, 0.45), shots[4]["t0"], 0.65, -0.2)
    add_stereo(music, synth_gold_bell(74, 3.0, 0.65), marks["verse_appear"], 0.72, -0.15)
    add_stereo(music, synth_gold_bell(78, 2.8, 0.50), marks["verse_appear"] + 0.25, 0.58, 0.15)
    add_stereo(music, synth_oud(50, 2.4, 0.65, seed=401), shots[4]["t0"] + 0.2, 0.46, 0.15)
    add_stereo(music, synth_oud(57, 2.4, 0.65, seed=402), marks["verse_appear"] + 0.05, 0.48, -0.15)

    # S5: Amr's defiance — rising intensity on D & A, dropping cleanly into Silence #1
    s5_t0 = shots[5]["t0"]
    s5_end = marks["silence_before_permission"] - 0.12
    t_cur = s5_t0
    step = 0
    while t_cur < s5_end:
        note = [50, 57, 62, 66, 62, 57][step % 6]
        add_stereo(music, synth_oud(note, 1.1, 0.75, seed=500 + step), t_cur, 0.52, -0.18 if step % 2 == 0 else 0.18)
        if step % 2 == 0 and t_cur < marks["plea_climax"] + 1.4:
            add_stereo(music, synth_daff("dum", 0.55, seed=530 + step), t_cur, 0.42, 0.0)
        t_cur += 0.52
        step += 1
    add_stereo(music, synth_rebab(62, max(1.2, s5_end - marks["plea_climax"]), 0.68), marks["plea_climax"], 0.78, -0.15)
    add_stereo(music, synth_ney(74, 2.4, 0.68, seed=555), marks["plea_climax"] + 0.2, 0.72, 0.22)

    # S6: Prophet's ﷺ permission — Native Move: THE TOUCH! Pure bell chord + noble swell
    touch_t = marks["the_touch"]
    add_stereo(music, synth_gold_bell(74, 3.6, 0.85), touch_t, 0.92, 0.0)
    add_stereo(music, synth_gold_bell(78, 3.4, 0.70), touch_t + 0.18, 0.76, -0.28)
    add_stereo(music, synth_gold_bell(81, 3.2, 0.65), touch_t + 0.36, 0.72, 0.28)
    add_stereo(music, synth_rebab(50, shots[6]["dur"] + 0.6, 0.58), touch_t + 0.05, 0.75, -0.2)
    add_stereo(music, synth_rebab(57, shots[6]["dur"] + 0.4, 0.48), touch_t + 0.20, 0.68, 0.2)
    # J-cut: distant war daff enters 0.7s before Battle of Uhud
    add_stereo(music, synth_daff("dum", 0.55, seed=601), marks["battle_start"] - 0.72, 0.45, 0.0)
    add_stereo(music, synth_daff("tak", 0.45, seed=602), marks["battle_start"] - 0.36, 0.38, 0.15)

    # S7: Battle of Uhud — driving rhythmic Daff acceleration + fierce Oud motif -> brakes into Silence #2 at martyrdom
    b_t0 = marks["battle_start"]
    b_end = marks["martyrdom"] + 0.15
    t_cur = b_t0
    step = 0
    battle_notes = [50, 51, 54, 57, 54, 51, 50, 57]
    while t_cur < b_end:
        # Rhythmic 160 bpm martial pulse
        add_stereo(music, synth_daff("dum" if step % 2 == 0 else "tak", 0.80 if step % 4 == 0 else 0.62, seed=700 + step), t_cur, 0.62, -0.1 if step % 2 == 0 else 0.15)
        add_stereo(music, synth_oud(battle_notes[step % len(battle_notes)], 0.75, 0.85, seed=740 + step), t_cur, 0.58, 0.22 if step % 2 == 0 else -0.22)
        t_cur += 0.36
        step += 1
    add_stereo(music, synth_rebab(62, max(1.0, b_end - b_t0), 0.70), b_t0 + 0.2, 0.70, 0.0)

    # L-cut / J-cut from Martyrdom into S8 Paradise — radiant Picardy-third D Major illumination (D-F#-A-D)!
    p_t0 = marks["martyrdom"] + 0.82
    add_stereo(music, synth_gold_bell(74, 4.2, 0.82), p_t0, 0.85, 0.0)
    add_stereo(music, synth_gold_bell(78, 3.8, 0.68), p_t0 + 0.35, 0.72, -0.3)
    add_stereo(music, synth_gold_bell(81, 3.8, 0.68), p_t0 + 0.70, 0.72, 0.3)
    add_stereo(music, synth_gold_bell(86, 4.5, 0.62), marks["hadith_radiance"], 0.82, 0.0)
    add_stereo(music, synth_gold_bell(78, 3.6, 0.55), marks["wisdom_plaque"], 0.72, -0.25)
    add_stereo(music, synth_gold_bell(81, 4.0, 0.60), marks["wisdom_plaque"] + 0.30, 0.72, 0.25)

    # Lush peaceful Rebab D-major (Picardy third) chord + soaring Ney in Paradise
    p_rem = max(2.0, dur - p_t0 - 0.3)
    add_stereo(music, synth_rebab(50, p_rem, 0.58), p_t0, 0.72, -0.35)
    add_stereo(music, synth_rebab(57, p_rem - 0.3, 0.52), p_t0 + 0.2, 0.65, 0.35)
    add_stereo(music, synth_rebab(66, p_rem - 0.6, 0.44), marks["hadith_radiance"], 0.62, 0.0)
    add_stereo(music, synth_ney(74, 3.0, 0.65, seed=801), marks["hadith_radiance"] + 0.2, 0.72, -0.2)
    add_stereo(music, synth_ney(78, 2.8, 0.62, seed=802), marks["wisdom_plaque"] + 0.2, 0.68, 0.2)
    add_stereo(music, synth_ney(81, 3.5, 0.58, seed=803), dur - 4.0, 0.65, 0.0)

    # Gentle resolving Oud arpeggio in Paradise
    t_cur = p_t0 + 0.5
    arp = [50, 57, 62, 66, 69, 66, 62, 57]
    step = 0
    while t_cur < dur - 1.2:
        add_stereo(music, synth_oud(arp[step % len(arp)], 2.2, 0.56, seed=850 + step), t_cur, 0.42, -0.22 if step % 2 == 0 else 0.22)
        t_cur += 0.85
        step += 1

    # 3. Procedural Foley layer
    foley = np.zeros((n_total, 2), dtype=np.float64)
    # Desert wind ambience across Mount Uhud (S1-S7)
    wind_bed = synth_wind(marks["paradise_start"] + 1.0, seed=11)
    add_stereo(foley, wind_bed, 0.0, 0.70, 0.0)

    # Limping footsteps + staff taps in S2 (asymmetric cadence: tap ... thud)
    t_step = shots[2]["t0"] + 0.35
    k = 0
    while t_step < shots[3]["t0"] - 0.4:
        add_stereo(foley, synth_foley_staff_step(heavy=False, seed=900 + k), t_step, 0.55, -0.15)
        add_stereo(foley, synth_foley_staff_step(heavy=True, seed=920 + k), t_step + 0.28, 0.60, 0.10)
        t_step += 1.08
        k += 1

    # Parchment unfurls on Quranic verse & closing plaque
    add_stereo(foley, synth_foley_parchment(0.55, seed=950), marks["verse_appear"] - 0.15, 0.72, 0.0)
    add_stereo(foley, synth_foley_parchment(0.65, seed=951), marks["wisdom_plaque"] - 0.15, 0.65, 0.0)

    # Tectonic bass tremor on "كلمة تهز الجبال"
    add_stereo(foley, synth_rumble(1.15), marks["mountains_shake"], 0.85, 0.0)

    # Battle sword draw & metallic clashes in S7
    add_stereo(foley, synth_foley_sword("draw", seed=960), marks["battle_start"] + 0.12, 0.80, -0.15)
    for idx, dt in enumerate([1.25, 2.35, 3.40, 4.35]):
        t_cl = marks["battle_start"] + dt
        if t_cl < marks["martyrdom"] - 0.3:
            add_stereo(foley, synth_foley_sword("clash", seed=970 + idx), t_cl, 0.62, -0.3 if idx % 2 == 0 else 0.3)

    # Apply reverb to music, duck under voice, and combine
    music_wet = simple_reverb(music, mix=0.26)
    music_wet *= (music_duck * silence_env)[:, None]
    foley *= silence_env[:, None]

    # Balance: voice clearly forward (~8-10 dB above music)
    mix = np.zeros((n_total, 2), dtype=np.float64)
    mix[:, 0] += voice_comp * 0.95
    mix[:, 1] += voice_comp * 0.95
    mix += music_wet * 0.42
    mix += foley * 0.52

    # Gentle fade out at very end
    fade_out = int(1.2 * SR)
    mix[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)[:, None]

    # Soft safety limiter before ffmpeg two-pass loudnorm
    peak = np.max(np.abs(mix))
    if peak > 0.92:
        mix = mix * (0.92 / peak)

    raw_wav = os.path.join(ROOT, "out", "mix-raw.wav")
    master_wav = os.path.join(ROOT, "public", "mix.wav")
    sf.write(raw_wav, mix.astype(np.float32), SR, subtype="PCM_16")

    # Two-pass ffmpeg loudnorm to -14 LUFS (TP -1.5 dBTP)
    p1 = subprocess.run(
        [
            "ffmpeg", "-y", "-i", raw_wav,
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True, text=True, check=True,
    )
    # Extract JSON block from stderr
    stderr = p1.stderr
    j0 = stderr.rfind("{")
    j1 = stderr.rfind("}") + 1
    stats = json.loads(stderr[j0:j1])

    af2 = (
        f"loudnorm=I=-14:TP=-1.5:LRA=11:"
        f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
        f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
        f"offset={stats['target_offset']}:linear=true"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", raw_wav, "-af", af2, "-ar", str(SR), "-ac", "2", master_wav],
        check=True,
    )
    print(f"Mastered audio written to {master_wav}")
    print(f"Pass-1 measured: I={stats['input_i']} LUFS, TP={stats['input_tp']} dBTP -> normalized to -14.0 LUFS")


if __name__ == "__main__":
    main()
