// Medals: six small goals for a single run, kept between visits. They are the reason to run
// again: a clean escape, a bounce on the farmer's hat, dancing past Old Bertha's flames...

export function medalsEarned(summary) {
  return MEDALS.filter((medal) => MEDAL_TESTS[medal.id](summary)).map((medal) => medal.id);
}

// Adds this run's medals to the ones already owned; `fresh` lists the ones won for the first time.
export function mergeMedals(owned, earned) {
  const fresh = earned.filter((id) => !owned.includes(id));
  const all = new Set([...owned, ...earned]);
  return { owned: MEDALS.map((medal) => medal.id).filter((id) => all.has(id)), fresh };
}

export function isMedalId(id) {
  return MEDALS.some((medal) => medal.id === id);
}

export const MEDALS = [
  { id: 'greatEscape', name: 'Great Escape', hint: 'Reach the woods' },
  { id: 'noFeatherLost', name: 'No Feather Lost', hint: 'Escape without a hit' },
  { id: 'hatHopper', name: 'Hat Hopper', hint: "Bounce on the farmer's hat" },
  { id: 'ovenDancer', name: 'Oven Dancer', hint: '5 close calls with the oven' },
  { id: 'ghost', name: 'Ghost', hint: 'Sneak out unseen twice' },
  { id: 'smasher', name: 'Pumpkin Smasher', hint: 'Gobble-dash through 8 things' },
];

const MEDAL_TESTS = {
  greatEscape: (s) => s.outcome === 'escaped',
  noFeatherLost: (s) => s.outcome === 'escaped' && s.hits === 0,
  hatHopper: (s) => (s.hatHops ?? 0) > 0,
  ovenDancer: (s) => (s.ovenCloseCalls ?? 0) >= 5,
  ghost: (s) => (s.sneaks ?? 0) >= 2,
  smasher: (s) => (s.smashes ?? 0) >= 8,
};
