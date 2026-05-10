# Solar

A Remotion + Three.js animation of a stylized 3D solar system with Edge TTS narration in English, Chinese, Japanese, and Korean.

## Scripts

```bash
npm install
npm run start
npm run voiceover
npm run render
```

The main compositions are `SolarSystemEN`, `SolarSystemZH`, `SolarSystemJA`, and `SolarSystemKO`.
`npm run render` renders all four MP4 files into `out/`.
The narration sources are `public/voiceover/narration.{lang}.txt`; `npm run voiceover`
regenerates the ignored Edge TTS MP3 files used by the compositions.

See `workflow.md` for the full build, narration, validation, and render workflow.
