// Where the relic tokens sit on the felt: a short arc that follows the table's rounded corner.
// A laptop-width table carries them along the bottom-left corner; a phone along the top-right,
// out of the way of the cards and the thumb. Pure: sizes in, pixel positions out.
export function relicSpots(count, felt, token, mobile) {
  const { w, h } = felt;
  const r = Math.min(h / 2, w / 2, mobile ? 200 : 240);
  const ring = r - (mobile ? 30 : 34);
  const spots = [];
  for (let i = 0; i < count; i += 1) {
    if (mobile) {
      // more than three tighten the arc so it stays beside the stake panel, never behind it
      const a = (((count <= 3 ? 40 - i * 25 : 52 - i * 16)) * Math.PI) / 180;
      spots.push({
        left: Math.round(w - r + ring * Math.cos(a) - token / 2),
        top: Math.round(r - ring * Math.sin(a) - token / 2),
      });
    } else {
      // up to three ride the bottom-left curve; more tighten and climb the left side, so the last
      // one always stops at the bottom (270deg) before the controls
      const step = count <= 3 ? 30 : 24;
      const start = count <= 3 ? 212 : 272 - step * (count - 1);
      const a = ((start + i * step) * Math.PI) / 180;
      spots.push({
        left: Math.round(r + ring * Math.cos(a) - token / 2),
        top: Math.round(h - r - ring * Math.sin(a) - token / 2),
      });
    }
  }
  return spots;
}
