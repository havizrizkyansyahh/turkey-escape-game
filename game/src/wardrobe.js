// The wardrobe: disguises Tom unlocks by winning medals and then wears on every run. A turkey in
// a pilgrim hat is still a turkey, but Farmer Bramble doesn't have to know that.

export function hatsOwned(medals) {
  return HATS.filter((hat) => medals.includes(hat.medal)).map((hat) => hat.id);
}

// The hat Tom puts on by default: the last one unlocked, in wardrobe order.
export function bestHat(medals) {
  const owned = hatsOwned(medals);
  return owned.length > 0 ? owned[owned.length - 1] : null;
}

// T (or a click on the wardrobe) tries on the next owned hat, then goes bare-headed again.
export function nextHat(current, medals) {
  const options = [null, ...hatsOwned(medals)];
  const index = options.indexOf(current);
  return options[(index + 1) % options.length];
}

export function hatName(id) {
  return HATS.find((hat) => hat.id === id)?.name ?? 'No hat';
}

export function isHatId(id) {
  return HATS.some((hat) => hat.id === id);
}

export const HATS = [
  { id: 'pilgrim', name: 'Pilgrim Hat', medal: 'greatEscape' },
  { id: 'groucho', name: 'Groucho Glasses', medal: 'hatHopper' },
  { id: 'chef', name: "Chef's Toque", medal: 'ovenDancer' },
];
