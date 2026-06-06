# Remotion Solar System Workflow

This project builds narrated 3D solar-system videos with Remotion, Three.js, and configurable TTS. It supports English, Chinese, Japanese, and Korean.

## 1. Install

```bash
npm install
python -m pip install edge-tts
```

Google Cloud Text-to-Speech uses the Python standard library only, but it needs an
API key through `GOOGLE_TTS_API_KEY` or `google-tts.key`.

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

The active provider is configured in:

```text
voiceover.config.json
```

You can override it explicitly:

```bash
npm run voiceover:edge
npm run voiceover:gcp
```

Or generate a single language:

```bash
python scripts/generate_voiceover.py --provider gcp --language ja
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

It can use either Edge TTS or Google Cloud Text-to-Speech voices for each language.
The Edge TTS path includes a Windows DNS resolver workaround for `aiohttp`. The GCP
path reads `GOOGLE_TTS_API_KEY` first, then the configured key file, which defaults
to `google-tts.key`.

## 4. Audio Synchronization

The project uses automatic audio synchronization to align text overlays with voiceover timing. The system supports two analysis methods:

### Edge TTS Time Boundary (Recommended)

Edge TTS provides built-in boundary detection with precise timing. This method:
- Uses the TTS engine's internal timing data
- Provides more accurate boundaries
- Works directly with the text content

To sync using Edge TTS:

```bash
# Sentence-level boundaries (default, recommended)
python scripts/sync_audio.py --method edge-tts --boundary SentenceBoundary

# Word-level boundaries (more detailed, but segments may be too short)
python scripts/sync_audio.py --method edge-tts --boundary WordBoundary
```

**Boundary Types:**
- `SentenceBoundary`: Groups text by sentences (recommended for this project)
- `WordBoundary`: Groups text by individual words (more granular)

### Silence Detection (Fallback)

For pre-generated audio files, silence detection analyzes audio patterns:

```bash
python scripts/sync_audio.py --method silence
```

### Configuration File

Audio timing is stored in:

```text
audio-sync.json
```

This file contains:
- FPS setting (default: 30)
- Boundary type used
- Per-language audio configuration
- Segment timing in frames for each planet/section
- Audio duration information
- Edge TTS timing data (when using edge-tts method)

### Manual Timing Adjustment

If automatic detection needs fine-tuning, edit `audio-sync.json` directly:

```json
{
  "languages": {
    "en": {
      "segments": {
        "Sun": { "start": 0, "end": 94 },
        "Mercury": { "start": 94, "end": 294 }
      }
    }
  }
}
```

### Regenerating Audio

After changing narration text, regenerate voiceover and resync:

```bash
# Regenerate voiceover
npm run voiceover

# Resync timing
python scripts/sync_audio.py --method edge-tts

# Preview changes
npm run start
```

### Duration Verification

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

The composition durations are automatically set from `audio-sync.json`. If any voiceover becomes longer, run `python scripts/sync_audio.py` to update timing.

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

The action installs Node and Python dependencies, `ffmpeg`, and Noto CJK fonts, regenerates all voiceovers with the configured provider, typechecks the project, renders all four Remotion videos, uploads the MP4 files as an artifact, and attaches them to the GitHub Release for that tag.

## Skill

A local Codex skill for this workflow is included at:

```text
.codex/skills/remotion-solar-tts/SKILL.md
```

Use it as the reusable agent workflow for future Remotion solar-system narration tasks.
