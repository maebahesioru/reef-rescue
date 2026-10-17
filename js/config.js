'use strict';

/* Reef Rescue — game configuration, level table and educational data.
   Plain browser script (no modules, no dependencies). */

const CONFIG = {
  W: 960,
  H: 540,
  SURFACE_Y: 64,          // water surface line
  SEABED_Y: 508,
  PLAY_TOP: 100,          // player minimum y (below the surface)
  PLAY_BOTTOM: 496,       // player maximum y (above the seabed)
  REFILL_ZONE: 40,        // px below the surface where oxygen refills
  PLAYER_ACCEL: 1550,
  PLAYER_MAX: 330,
  PLAYER_DRAG: 4.4,
  PLAYER_R: 16,
  OXY_MAX: 100,
  OXY_DRAIN: 2.0,         // per second at level 1
  OXY_REFILL: 36,         // per second at the surface
  OXY_BONUS_PER_LEVEL: 25,
  HURT_OXY: 12,
  HURT_SCORE: 25,
  INVULN_TIME: 1.6,
  COMBO_WINDOW: 3.0,
  MAX_LEVEL: 5,
};

/* One entry per level: stronger current, denser plastic, more wildlife. */
const LEVELS = [
  { target: 12, current: 22, maxItems: 7,  spawnEvery: 1.60, creatures: 2, drainMult: 1.00 },
  { target: 16, current: 30, maxItems: 9,  spawnEvery: 1.40, creatures: 3, drainMult: 1.10 },
  { target: 20, current: 38, maxItems: 11, spawnEvery: 1.20, creatures: 4, drainMult: 1.22 },
  { target: 25, current: 46, maxItems: 13, spawnEvery: 1.05, creatures: 5, drainMult: 1.34 },
  { target: 30, current: 55, maxItems: 15, spawnEvery: 0.90, creatures: 6, drainMult: 1.46 },
];

/* Item types. weight = grams per item. co2 = estimated g CO2e avoided per gram
   of this material when recycled (rough, from commonly cited figures). */
const GARBAGE_TYPES = [
  { id: 'bottle', name: 'Plastic bottle', points: 10, weight: 25,  co2: 2.0, r: 14, color: '#56B4E9' },
  { id: 'bag',    name: 'Plastic bag',    points: 15, weight: 8,   co2: 1.8, r: 15, color: '#F0E442' },
  { id: 'straw',  name: 'Straw',          points: 5,  weight: 1,   co2: 1.9, r: 10, color: '#E69F00' },
  { id: 'can',    name: 'Drink can',      points: 10, weight: 15,  co2: 9.0, r: 12, color: '#CC79A7' },
  { id: 'net',    name: 'Ghost net',      points: 25, weight: 400, co2: 2.2, r: 24, color: '#009E73' },
];

const CREATURE_TYPES = [
  { id: 'fish',      name: 'reef fish',  r: 14, speed: 70 },
  { id: 'turtle',    name: 'sea turtle', r: 20, speed: 42 },
  { id: 'jellyfish', name: 'jellyfish',  r: 18, speed: 26 },
];

/* Educational facts shown on the dive report. Approximate figures from
   commonly cited published research. */
const FACTS = {
  bottle: 'A plastic bottle can take up to 450 years to break down at sea — it just turns into microplastics.',
  bag: 'Sea turtles often mistake floating plastic bags for jellyfish, their favourite food.',
  straw: 'Plastic straws are among the top 10 items found at ocean cleanups around the world.',
  can: 'Aluminium is endlessly recyclable: a recycled can needs about 95% less energy than a new one.',
  net: 'Ghost nets — lost fishing gear — make up roughly 46% of the Great Pacific Garbage Patch by mass.',
  general: [
    'About 11 million tonnes of plastic enter the ocean every year — a garbage truck every minute.',
    'By 2050, ocean plastic could outweigh all the fish in the sea (projected estimate).',
    'Ocean plastic injures or kills over a million seabirds and 100,000 marine mammals every year.',
    'Recycling one plastic bottle saves enough energy to light a room for about 3 hours.',
  ],
};
