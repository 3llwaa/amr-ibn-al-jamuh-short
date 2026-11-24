#!/usr/bin/env python3
"""
Generate Egyptian Arabic narration with edge-tts (ar-EG-ShakirNeural),
trim leading/trailing silence cleanly, build exact timeline.json (single source of truth),
and export subtitles_ar.srt.
"""
import asyncio
import json
import os
import subprocess
import numpy as np
import soundfile as sf
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, "out", "voice")
os.makedirs(VOICE_DIR, exist_ok=True)

VOICE = "ar-EG-ShakirNeural"

LINES = [
    {
        "id": "L01",
        "shot": 1,
        "rate": "+12%",
        "pause_after": 0.35,
        "lines": ["القرآن نزّل آية كاملة تعفيه من الحرب..", "بس هو رفض يقعد في البيت!"],
        "tts": "القرآن نَزِّل آية كاملة تِعفِيه مِن الحَرب، بس هو رَفَض يِقعُد في البيت!",
    },
    {
        "id": "L02",
        "shot": 2,
        "rate": "+10%",
        "pause_after": 0.22,
        "lines": ["في غزوة أُحد، كان في صحابي", "اسمه عمرو بن الجموح.."],
        "tts": "في غَزْوَةِ أُحُد، كان في صَحابي اسمه عَمْرُو بنُ الجَمُوح.",
    },
    {
        "id": "L03",
        "shot": 2,
        "rate": "+10%",
        "pause_after": 0.28,
        "lines": ["راجل كبير في السن، وعنده عرج شديد جداً", "في رجله بيخليه يمشي بصعوبة بالغة."],
        "tts": "راجل كبير في السِنّ، وعنده عَرَج شديد جِدّاً في رِجله بِيخَلِّيه يِمشي بِصعوبة بالِغة.",
    },
    {
        "id": "L04",
        "shot": 3,
        "rate": "+12%",
        "pause_after": 0.30,
        "lines": ["وكان عنده 4 أولاد شباب زي الأسود،", "كلهم خارجين يحاربوا مع النبي ﷺ."],
        "tts": "وكان عنده أربَع أولاد شَباب زَيّ الأسود، كلهم خارجين يِحاربوا مَع النَّبيّ صَلّى اللهُ عليه وسَلَّم.",
    },
    {
        "id": "L05a",
        "shot": 4,
        "rate": "+10%",
        "pause_after": 0.16,
        "lines": ["أولاده منعوه يخرج وقالوا له:", "يا أبانا، الله عذرك.."],
        "tts": "أولاده مَنَعوه يِخرج وقالوا له: يا أبانا، الله عَذَرَك،",
    },
    {
        "id": "L05b",
        "shot": 4,
        "rate": "+4%",
        "pause_after": 0.40,
        "lines": ["ونزلت فيك آية ﴿لَيْسَ عَلَى الْأَعْرَجِ حَرَجٌ﴾،", "إحنا بنكفيك!"],
        "tts": "ونَزَلَت فيك آيَةُ: لَيْسَ عَلَى الْأَعْرَجِ حَرَجٌ، إحنا بِنَكْفِيك!",
    },
    {
        "id": "L06",
        "shot": 5,
        "rate": "+12%",
        "pause_after": 0.42,
        "lines": ["لكن عمرو غضب وراح يشتكي للنبي ﷺ", "وقال كلمة تهز الجبال:"],
        "tts": "لكن عَمْرو غِضِب وراح يِشتكي للنَّبيّ صَلّى اللهُ عليه وسَلَّم وقال كِلمة تِهزّ الجِبال:",
    },
    {
        "id": "L07",
        "shot": 5,
        "rate": "+4%",
        "pause_after": 0.18,
        "lines": ["يا رسول الله، إن بنيّ يريدون", "أن يحبسوني عن هذا الوجه.."],
        "tts": "يا رَسولَ اللهِ، إِنَّ بَنِيَّ يُريدونَ أَنْ يَحْبِسوني عَنْ هَذا الوَجْه،",
    },
    {
        "id": "L08",
        "shot": 5,
        "rate": "+2%",
        "pause_after": 0.65,
        "lines": ["والله إني لأرجو أن أطأ", "بعرجتي هذه في الجنة!"],
        "tts": "واللهِ إِنِّي لَأَرْجُو أَنْ أَطَأَ بِعَرْجَتِي هَذِهِ فِي الْجَنَّة!",
    },
    {
        "id": "L09",
        "shot": 6,
        "rate": "+2%",
        "pause_after": 0.68,
        "lines": ["النبي ﷺ بصّ لأولاده وقالهم:", "«دعوه، لعل الله أن يرزقه الشهادة»."],
        "tts": "النَّبيّ صَلّى اللهُ عليه وسَلَّم بَصّ لِأولاده وقالهم: دَعُوهُ، لَعَلَّ اللَّهَ أَنْ يَرْزُقَهُ الشَّهَادَة.",
    },
    {
        "id": "L10",
        "shot": 7,
        "rate": "+14%",
        "pause_after": 0.16,
        "lines": ["وفعلاً.. نزل عمرو بن الجموح أرض المعركة بسيفه،", "وهو بيعرج وسط السيوف والرماح،"],
        "tts": "وفِعلاً، نِزِل عَمْرُو بنُ الجَمُوح أرض المَعركة بِسيفه، وهو بِيِعرُج وِسط السُّيوف والرِّماح،",
    },
    {
        "id": "L11",
        "shot": 7,
        "rate": "+6%",
        "pause_after": 0.78,
        "lines": ["وقاتل بشجاعة لحد ما استشهد", "في سبيل الله."],
        "tts": "وقاتِل بِشجاعة لَحَدّ ما اسْتُشْهِدَ في سَبيلِ الله.",
    },
    {
        "id": "L12",
        "shot": 8,
        "rate": "+2%",
        "pause_after": 0.58,
        "lines": ["وبعد المعركة، مرّ النبي ﷺ على جثمانه وقال:", "«كأني أنظر إليك تمشي برجلك هذه صحيحة في الجنة»."],
        "tts": "وبَعد المَعركة، مَرّ النَّبيّ صَلّى اللهُ عليه وسَلَّم على جُثمانِه وقال: كَأَنِّي أَنْظُرُ إِلَيْكَ تَمْشِي بِرِجْلِكَ هَذِهِ صَحِيحَةً فِي الْجَنَّة.",
    },
    {
        "id": "L13",
        "shot": 8,
        "rate": "+3%",
        "pause_after": 0.42,
        "lines": ["الأعذار بتصنعها العقول..", "أما الهمم فبتصنعها القلوب."],
        "tts": "الأعذار بِتِصنَعها العُقول، أمّا الهِمَم فَبِتِصنَعها القُلوب.",
    },
    {
        "id": "L14",
        "shot": 8,
        "rate": "+8%",
        "pause_after": 2.00,
        "lines": ["لو القصة لمست قلبك،", "شاركها عشان غيرك يعرفها."],
        "tts": "لو القِصّة لَمَسِت قَلبَك، شارِكها عَشان غيرَك يِعرَفها.",
    },
]


def trim_silence(wav_path: str, sr_target: int = 48000):
    data, sr = sf.read(wav_path, dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    thresh = 0.006
    idx = np.where(np.abs(data) > thresh)[0]
    if len(idx) > 0:
        pad_pre = int(0.03 * sr)
        pad_post = int(0.06 * sr)
        i0 = max(0, idx[0] - pad_pre)
        i1 = min(len(data), idx[-1] + pad_post)
        data = data[i0:i1]
    fade = min(int(0.01 * sr), len(data) // 4)
    if fade > 0:
        data[:fade] *= np.linspace(0, 1, fade)
        data[-fade:] *= np.linspace(1, 0, fade)
    sf.write(wav_path, data, sr, subtype="PCM_16")
    return len(data) / sr


def fmt_srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


async def synth_line(item):
    mp3_path = os.path.join(VOICE_DIR, f"{item['id']}.mp3")
    wav_path = os.path.join(VOICE_DIR, f"{item['id']}.wav")
    last_err = None
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(item["tts"], voice=VOICE, rate=item["rate"])
            await comm.save(mp3_path)
            last_err = None
            break
        except Exception as e:
            last_err = e
            await asyncio.sleep(0.8 * (attempt + 1))
    if last_err is not None:
        raise last_err
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", mp3_path, "-ar", "48000", "-ac", "1", wav_path],
        check=True,
    )
    dur = trim_silence(wav_path)
    return wav_path, dur


async def main():
    print(f"Synthesizing {len(LINES)} lines with {VOICE}...")
    t = 0.65  # 0.65 s opening spark & shamsa flash before first spoken word
    cues = []
    for item in LINES:
        wav_path, dur = await synth_line(item)
        t0 = round(t, 3)
        t1 = round(t + dur, 3)
        print(f"  {item['id']} [shot {item['shot']}]: {t0:6.2f}s -> {t1:6.2f}s (dur {dur:.2f}s)")
        cues.append({
            "id": item["id"],
            "shot": item["shot"],
            "t0": t0,
            "t1": t1,
            "dur": round(dur, 3),
            "sub_end": round(t1 + min(0.32, item["pause_after"] * 0.7), 3),
            "lines": item["lines"],
            "wav": os.path.relpath(wav_path, ROOT),
        })
        t = t1 + item["pause_after"]

    total_dur = round(t, 3)
    fps = 30
    total_frames = int(np.ceil(total_dur * fps))

    # Derive exact shot boundaries from cues
    shot_bounds = {}
    for c in cues:
        s = c["shot"]
        if s not in shot_bounds:
            shot_bounds[s] = {"shot": s, "t0": c["t0"], "t1": c["t1"]}
        else:
            shot_bounds[s]["t1"] = c["t1"]

    shots = []
    sorted_s = sorted(shot_bounds.keys())
    for idx, s in enumerate(sorted_s):
        start = 0.0 if idx == 0 else round((shot_bounds[sorted_s[idx - 1]]["t1"] + shot_bounds[s]["t0"]) / 2.0, 3)
        end = total_dur if idx == len(sorted_s) - 1 else round((shot_bounds[s]["t1"] + shot_bounds[sorted_s[idx + 1]]["t0"]) / 2.0, 3)
        shots.append({"shot": s, "t0": start, "t1": end, "dur": round(end - start, 3)})

    # Special dramatic timestamps for audio/visual sync
    cue_map = {c["id"]: c for c in cues}
    marks = {
        "hook_spark": 0.35,
        "verse_appear": cue_map["L05b"]["t0"],
        "mountains_shake": round(cue_map["L06"]["t0"] + cue_map["L06"]["dur"] * 0.72, 3),
        "silence_before_plea": round(cue_map["L06"]["t1"] + 0.05, 3),
        "plea_climax": cue_map["L08"]["t0"],
        "silence_before_permission": round(cue_map["L08"]["t1"] + 0.06, 3),
        "the_touch": round(cue_map["L09"]["t0"] + cue_map["L09"]["dur"] * 0.42, 3),
        "battle_start": shots[6]["t0"],
        "martyrdom": round(cue_map["L11"]["t0"] + cue_map["L11"]["dur"] * 0.55, 3),
        "paradise_start": shots[7]["t0"],
        "hadith_radiance": round(cue_map["L12"]["t0"] + cue_map["L12"]["dur"] * 0.40, 3),
        "wisdom_plaque": cue_map["L13"]["t0"],
        "pullback_start": round(cue_map["L13"]["t0"] - 0.25, 3),
    }

    timeline = {
        "fps": fps,
        "width": 1080,
        "height": 1920,
        "durationSec": total_dur,
        "durationInFrames": total_frames,
        "voice": VOICE,
        "shots": shots,
        "marks": marks,
        "cues": cues,
    }

    tl_path = os.path.join(ROOT, "src", "timeline.json")
    os.makedirs(os.path.dirname(tl_path), exist_ok=True)
    with open(tl_path, "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=2)

    # Export subtitles_ar.srt
    srt_path = os.path.join(ROOT, "subtitles_ar.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n")
            f.write(f"{fmt_srt_time(c['t0'])} --> {fmt_srt_time(c['sub_end'])}\n")
            f.write("\n".join(c["lines"]) + "\n\n")

    print(f"\nDone! Total duration: {total_dur:.2f}s ({total_frames} frames @ {fps}fps)")
    print(f"Timeline written to {tl_path}")
    print(f"SRT written to {srt_path}")


if __name__ == "__main__":
    asyncio.run(main())
