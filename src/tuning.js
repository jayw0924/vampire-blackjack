// Every number a run is balanced on. tools/sim.mjs measures these; change them there first.
export const TUNING = {
  startBlood: 20,
  maxRelics: 6,
  bite: { cost: 2 },
  // hands: hands until dawn. quota: blood needed to take the stair.
  // tax: blood the hunger takes, every `taxEvery` hands. bonus: blood the stair gives on arrival.
  floors: {
    steward: { hands: 12, quota: 24, tax: 1, taxEvery: 2, bonus: 0 },
    lamia: { hands: 10, quota: 36, tax: 1, taxEvery: 1, bonus: 4 },
    vesper: { hands: 8, quota: 48, tax: 1, taxEvery: 1, bonus: 4 },
  },
};
