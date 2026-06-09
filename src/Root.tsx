import React from 'react';
import {Composition} from 'remotion';
import {fps, languages, locales} from './narration';
import {SolarSystem} from './SolarSystem';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {languages.map((language) => (
        <React.Fragment key={language}>
          <Composition
            id={locales[language].compositionId}
            component={SolarSystem}
            durationInFrames={locales[language].durationInFrames}
            fps={fps}
            width={1920}
            height={1080}
            defaultProps={{language, layout: 'horizontal' as const}}
            calculateMetadata={async () => {
              return {
                durationInFrames: locales[language].durationInFrames,
                fps,
                width: 1920,
                height: 1080,
              };
            }}
          />
          <Composition
            id={`${locales[language].compositionId}Vertical`}
            component={SolarSystem}
            durationInFrames={locales[language].durationInFrames}
            fps={fps}
            width={1080}
            height={1920}
            defaultProps={{language, layout: 'vertical' as const}}
            calculateMetadata={async () => {
              return {
                durationInFrames: locales[language].durationInFrames,
                fps,
                width: 1080,
                height: 1920,
              };
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
};
