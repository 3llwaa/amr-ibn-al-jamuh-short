#!/bin/sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE"

echo "1/4 Generating Egyptian Arabic narration & timeline.json..."
python3 scripts/generate_voice.py

echo "2/4 Composing Hijaz/Dorian score, foley & -14 LUFS audio master..."
python3 scripts/compose_audio.py

echo "3/4 Rendering 1080x1920 @ 30fps via Remotion..."
npx remotion render src/index.ts AmrIbnAlJamuhShort out/video-raw.mp4 --crf=18

echo "4/4 Adding subtle archival film grain & muxing final -14 LUFS master..."
ffmpeg -y -loglevel error -i out/video-raw.mp4 -i public/mix.wav \
  -map 0:v:0 -map 1:a:0 \
  -vf "noise=alls=4:allf=t+u" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k \
  amr-ibn-al-jamuh.mp4

npx remotion still src/index.ts AmrIbnAlJamuhShort poster.jpg --frame=1455 --image-format=jpeg --jpeg-quality=92
echo "Built $HERE/amr-ibn-al-jamuh.mp4 and $HERE/poster.jpg"
