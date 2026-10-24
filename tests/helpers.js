export function cards(...ids) {
  return ids.map((id) => ({ rank: id.slice(0, -1), suit: id.slice(-1) }));
}
