# Remotion Solar System Workflow

This project builds narrated 3D solar-system videos with Remotion, Three.js, and Edge TTS. It supports English, Chinese, Japanese, and Korean.

## 1. Install

```bash
npm install
python -m pip install edge-tts
```

## 2. Edit The Story

The narration, timing, and localized screen text live in:

- `src/narration.ts` for segment timing, labels, descriptions, FPS, composition IDs, and composition duration.
- `public/voiceover/narration.en.txt` for English speech.
- `public/voiceover/narration.zh.txt` for Chinese speech.
- `public/voiceover/narration.ja.txt` for Japanese speech.
- `public/voiceover/narration.ko.txt` for Korean speech.

Keep the order as Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and finale.

## 3. Generate Voiceover

```bash
npm run voiceover
```

This creates ignored generated audio files:

```text
public/voiceover/solar-system-en.mp3
public/voiceover/solar-system-zh.mp3
public/voiceover/solar-system-ja.mp3
public/voiceover/solar-system-ko.mp3
```

The generator script is:

```text
scripts/generate_voiceover.py
```

It uses Edge TTS voices for each language and includes a Windows DNS resolver workaround for `aiohttp`.

## 4. Match Duration

Check generated MP3 lengths:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-en.mp3
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-zh.mp3
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-ja.mp3
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-ko.mp3
```

Check the Remotion composition lengths:

```bash
npx remotion compositions src/index.ts
```

The current compositions are `SolarSystemEN`, `SolarSystemZH`, `SolarSystemJA`, and `SolarSystemKO`, each 30fps, 2340 frames, 78 seconds. If any voiceover becomes longer, update `durationInFrames` in `src/narration.ts`.

## 5. Preview

```bash
npm run start
```

Open Remotion Studio at the shown localhost URL and scrub each language timeline. The active narration segment should match the camera focus, planet highlight, and localized on-screen title.

## 6. Validate

```bash
npm run typecheck
npx remotion compositions src/index.ts
```

Render a still from a mid-video segment:

```bash
npx remotion still src/index.ts SolarSystemEN out/solar-system-earth-frame.png --frame=780
```

Render a short smoke-test clip:

```bash
npx remotion render src/index.ts SolarSystemEN out/solar-system-smoke.mp4 --frames=0-90
```

Confirm the smoke-test video has an audio stream:

```bash
ffprobe -v error -show_streams -select_streams a out/solar-system-smoke.mp4
```

## 7. Render Final Videos

```bash
npm run render
```

The final outputs are:

```text
out/solar-system-en.mp4
out/solar-system-zh.mp4
out/solar-system-ja.mp4
out/solar-system-ko.mp4
```

## 8. GitHub Actions Tag Build

The workflow `.github/workflows/build-on-tag.yml` builds the videos when a tag starting with `v` is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The action installs Node and Python dependencies, `ffmpeg`, and Noto CJK fonts, regenerates all Edge TTS voiceovers, typechecks the project, renders all four Remotion videos, uploads the MP4 files as an artifact, and attaches them to the GitHub Release for that tag.

## Skill

A local Codex skill for this workflow is included at:

```text
.codex/skills/remotion-solar-tts/SKILL.md
```

Use it as the reusable agent workflow for future Remotion solar-system narration tasks.
