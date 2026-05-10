import React from 'react';
import {Composition} from 'remotion';
import {fps, languages, locales} from './narration';
import {SolarSystem} from './SolarSystem';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {languages.map((language) => (
        <Composition
          key={language}
          id={locales[language].compositionId}
          component={SolarSystem}
          durationInFrames={locales[language].durationInFrames}
          fps={fps}
          width={1920}
          height={1080}
          defaultProps={{language}}
        />
      ))}
    </>
  );
};
