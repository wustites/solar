---
name: remotion-solar-tts
description: Build or update narrated multilingual Remotion videos that combine Three.js solar-system visuals with Edge TTS voiceover. Use when Codex needs to scaffold, modify, validate, or render English, Chinese, Japanese, or Korean Remotion compositions with a Sun-to-planets narration timeline, generated MP3 narration, static Remotion audio assets, and smoke-test renders.
---

# Remotion Solar TTS

## Workflow

1. Inspect the project shape with `rg --files`, `package.json`, `src/Root.tsx`, and `src/SolarSystem.tsx`.
2. Keep the composition timeline and localized screen text in `src/narration.ts`; define `fps`, `durationInFrames`, language metadata, composition IDs, and ordered narration segments there.
3. Keep visual sequencing deterministic. Drive camera motion, highlights, labels, and planet positions from `useCurrentFrame()` instead of timers or runtime randomness.
4. Store voiceover source text in `public/voiceover/narration.{lang}.txt`.
5. Generate narration with `npm run voiceover`, which runs `scripts/generate_voiceover.py` and writes ignored MP3 files such as `public/voiceover/solar-system-en.mp3`.
6. Add each MP3 to the matching composition with Remotion `<Audio src={staticFile(...)} />`.
7. Validate with `npm run typecheck` and `npx remotion compositions src/index.ts`.
8. Render a still from at least one mid-sequence segment and a short video smoke test before considering the workflow complete.

## Edge TTS

Prefer the project script over invoking `edge-tts` directly:

```bash
npm run voiceover
```

The script forces aiohttp through the Windows system DNS resolver because `edge-tts` can fail on Windows when `aiodns` cannot contact DNS servers.

If narration text changes, regenerate the MP3 files and compare each audio duration with the Remotion duration:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/voiceover/solar-system-en.mp3
npx remotion compositions src/index.ts
```

Check each generated language MP3 and set `durationInFrames` to cover the longest duration plus a small tail.

## Render Checks

Use these commands for fast confidence:

```bash
npm run typecheck
npx remotion compositions src/index.ts
npx remotion still src/index.ts SolarSystemEN out/solar-system-check.png --frame=780
npx remotion render src/index.ts SolarSystemEN out/solar-system-smoke.mp4 --frames=0-90
```

Check the smoke render has audio:

```bash
ffprobe -v error -show_streams -select_streams a out/solar-system-smoke.mp4
```

Use `npm run render` for all final language videos.
