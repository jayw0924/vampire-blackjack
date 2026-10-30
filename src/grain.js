import { nextRng } from './cards.js';

// A small deterministic film-grain tile, drawn once to a canvas.
export function grainTile(size = 128, seed = 1977) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return '';
  const image = g.createImageData(size, size);
  let state = seed >>> 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const rolled = nextRng(state);
    state = rolled.rngState;
    const v = Math.floor(rolled.roll * 255);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}
