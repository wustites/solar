# Solar

A Remotion + Three.js animation of a stylized 3D solar system with configurable TTS narration in English, Chinese, Japanese, and Korean.

## Scripts

```bash
npm install
npm run start
npm run voiceover
npm run voiceover:edge
npm run voiceover:gcp
npm run render
```

The main compositions are `SolarSystemEN`, `SolarSystemZH`, `SolarSystemJA`, and `SolarSystemKO`.
`npm run render` renders all four MP4 files into `out/`.
The narration sources are `public/voiceover/narration.{lang}.txt`; `npm run voiceover`
regenerates the ignored MP3 files used by the compositions. The default TTS source,
voices, and GCP key location are configured in `voiceover.config.json`. Use
`npm run voiceover:edge` for Edge TTS or `npm run voiceover:gcp` for Google Cloud
Text-to-Speech. The GCP provider reads `GOOGLE_TTS_API_KEY` first, then
`google-tts.key`.

See `workflow.md` for the full build, narration, validation, and render workflow.
