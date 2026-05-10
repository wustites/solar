import React from 'react';
import {Composition} from 'remotion';
import {durationInFrames, fps} from './narration';
import {SolarSystem} from './SolarSystem';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SolarSystem"
      component={SolarSystem}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
};
