import React from 'react';
import { Composition } from 'remotion';
import timeline from './timeline.json';
import { AmrShort } from './AmrShort';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AmrIbnAlJamuhShort"
      component={AmrShort}
      durationInFrames={timeline.durationInFrames}
      fps={timeline.fps}
      width={timeline.width}
      height={timeline.height}
    />
  );
};
