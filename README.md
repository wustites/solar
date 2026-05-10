# Solar

A Remotion + Three.js animation of a stylized 3D solar system.

## Scripts

```bash
npm install
npm run start
npm run voiceover
npm run render
```

The main composition is `SolarSystem` and renders to `out/solar-system.mp4`.
The narration source is `public/voiceover/narration.txt`; `npm run voiceover`
regenerates the Edge TTS MP3 used by the composition.

See `workflow.md` for the full build, narration, validation, and render workflow.
