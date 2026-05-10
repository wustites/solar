---
name: remotion-solar-tts
description: Build or update narrated Remotion videos that combine Three.js solar-system visuals with Edge TTS voiceover. Use when Codex needs to scaffold, modify, validate, or render a Remotion composition with a Sun-to-planets narration timeline, generated MP3 narration, static Remotion audio assets, and smoke-test renders.
---

# Remotion Solar TTS

## Workflow

1. Inspect the project shape with `rg --files`, `package.json`, `src/Root.tsx`, and `src/SolarSystem.tsx`.
2. Keep the composition timeline in `src/narration.ts`; define `fps`, `durationInFrames`, and ordered narration segments there.
3. Keep visual sequencing deterministic. Drive camera motion, highlights, labels, and planet positions from `useCurrentFrame()` instead of timers or runtime randomness.
4. Store voiceover source text in `public/voiceover/narration.txt`.
5. Generate narration with `npm run voiceover`, which runs `scripts/generate_voiceover.py` and writes `public/voiceover/solar-system-introduction.mp3`.
6. Add the MP3 to the composition with Remotion `<Audio src={staticFile(...)} />`.
7. Validate with `npm run typecheck` and `npx remotion compositions src/index.ts`.
8. Render a still from at least one mid-sequence segment and a short video smoke test before considering the workflow complete.

## Edge TTS

Prefer the project script over invoking `edge-tts` directly:

```bash
npm run voiceover
```

The script forces aiohttp through the Windows system DNS resolver because `edge-tts` can fail on Windows when `aiodns` cannot contact DNS servers.

If the narration text changes, regenerate the MP3 and compare the audio duration with the Remotion duration:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-introduction.mp3
npx remotion compositions src/index.ts
```

Set `durationInFrames` to cover the MP3 duration plus a small tail.

## Render Checks

Use these commands for fast confidence:

```bash
npm run typecheck
npx remotion compositions src/index.ts
npx remotion still src/index.ts SolarSystem out/solar-system-check.png --frame=780
npx remotion render src/index.ts SolarSystem out/solar-system-smoke.mp4 --frames=0-90
```

Check the smoke render has audio:

```bash
ffprobe -v error -show_streams -select_streams a out/solar-system-smoke.mp4
```

Use `npm run render` for the final video.
