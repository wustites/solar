# Remotion Solar System Workflow

This project builds a narrated 3D solar-system video with Remotion, Three.js, and Edge TTS.

## 1. Install

```bash
npm install
python -m pip install edge-tts
```

## 2. Edit The Story

The narration and timing live in:

- `src/narration.ts` for segment timing, labels, descriptions, FPS, and composition duration.
- `public/voiceover/narration.txt` for the spoken script.

Keep the order as Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and finale.

## 3. Generate Voiceover

```bash
npm run voiceover
```

This creates:

```text
public/voiceover/solar-system-introduction.mp3
```

The generator script is:

```text
scripts/generate_voiceover.py
```

It uses Edge TTS with `en-US-AriaNeural` and includes a Windows DNS resolver workaround for `aiohttp`.

## 4. Match Duration

Check the generated MP3 length:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-introduction.mp3
```

Check the Remotion composition length:

```bash
npx remotion compositions src/index.ts
```

The current composition is `SolarSystem`, 30fps, 2340 frames, 78 seconds. If the voiceover becomes longer, update `durationInFrames` in `src/narration.ts`.

## 5. Preview

```bash
npm run start
```

Open Remotion Studio at the shown localhost URL and scrub the timeline. The active narration segment should match the camera focus, planet highlight, and on-screen title.

## 6. Validate

```bash
npm run typecheck
npx remotion compositions src/index.ts
```

Render a still from a mid-video segment:

```bash
npx remotion still src/index.ts SolarSystem out/solar-system-earth-frame.png --frame=780
```

Render a short smoke-test clip:

```bash
npx remotion render src/index.ts SolarSystem out/solar-system-smoke.mp4 --frames=0-90
```

Confirm the smoke-test video has an audio stream:

```bash
ffprobe -v error -show_streams -select_streams a out/solar-system-smoke.mp4
```

## 7. Render Final Video

```bash
npm run render
```

The final output is:

```text
out/solar-system.mp4
```

## 8. GitHub Actions Tag Build

The workflow `.github/workflows/build-on-tag.yml` builds the video when a tag
starting with `v` is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The action installs Node and Python dependencies, regenerates the Edge TTS
voiceover, typechecks the project, renders the Remotion video, uploads the MP4
as an artifact, and attaches it to the GitHub Release for that tag.

## Skill

A local Codex skill for this workflow is included at:

```text
.codex/skills/remotion-solar-tts/SKILL.md
```

Use it as the reusable agent workflow for future Remotion solar-system narration tasks.
