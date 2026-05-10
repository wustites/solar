export type NarrationSegment = {
  name: string;
  start: number;
  end: number;
  title: string;
  description: string;
};

export const fps = 30;
export const durationInFrames = 2340;

export const narrationSegments: NarrationSegment[] = [
  {
    name: 'Sun',
    start: 0,
    end: 360,
    title: 'The Sun',
    description: 'A glowing star at the center, holding the solar system together with gravity.'
  },
  {
    name: 'Mercury',
    start: 360,
    end: 540,
    title: 'Mercury',
    description: 'The smallest planet, racing closest to the Sun across a scorched orbit.'
  },
  {
    name: 'Venus',
    start: 540,
    end: 720,
    title: 'Venus',
    description: 'A bright world wrapped in thick clouds and an intense greenhouse atmosphere.'
  },
  {
    name: 'Earth',
    start: 720,
    end: 900,
    title: 'Earth',
    description: 'Our blue home, with liquid water, a protective atmosphere, and one Moon.'
  },
  {
    name: 'Mars',
    start: 900,
    end: 1200,
    title: 'Mars',
    description: 'The red planet, marked by dust, canyons, volcanoes, and ancient river valleys.'
  },
  {
    name: 'Jupiter',
    start: 1200,
    end: 1455,
    title: 'Jupiter',
    description: 'The giant of the planets, massive enough to shape the paths around it.'
  },
  {
    name: 'Saturn',
    start: 1455,
    end: 1635,
    title: 'Saturn',
    description: 'A golden gas giant encircled by broad, icy rings.'
  },
  {
    name: 'Uranus',
    start: 1635,
    end: 1845,
    title: 'Uranus',
    description: 'A cold blue-green planet tilted dramatically onto its side.'
  },
  {
    name: 'Neptune',
    start: 1845,
    end: 2055,
    title: 'Neptune',
    description: 'A deep blue world with fierce winds, orbiting in the distant dark.'
  },
  {
    name: 'Finale',
    start: 2055,
    end: 2340,
    title: 'The Solar System',
    description: 'One star, eight planets, and countless smaller worlds moving together in space.'
  }
];

export const narrationText = `From the Sun, we begin our tour of the solar system.

The Sun is our star: a glowing sphere of hot plasma whose gravity holds every planet in orbit.

Closest to the Sun is Mercury, the smallest planet, moving quickly through intense heat and long cold nights.

Next is Venus, bright in our sky, wrapped in thick clouds and a powerful greenhouse atmosphere.

Then comes Earth, our blue home, with liquid water, living systems, and one steady Moon.

Beyond Earth is Mars, the red planet, with dust storms, ancient river valleys, and the tallest volcano in the solar system.

Farther out is Jupiter, the largest planet, a giant world with storms, bands of clouds, and many moons.

Then Saturn appears, famous for its wide icy rings and soft golden color.

Next is Uranus, a cold blue-green ice giant, tilted so far that it seems to roll around the Sun.

At the edge of the major planets is Neptune, deep blue and windy, circling in the distant dark.

Together they form our solar system: one star, eight planets, moons, rings, asteroids, comets, and the quiet rhythm of orbit.`;
