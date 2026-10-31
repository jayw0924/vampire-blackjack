// Art comes from a manifest (assets/art/manifest.json: id, type, variant, files,
// sizes, alt, decorative). Anything the manifest does not list is simply absent,
// and the page falls back to a CSS placeholder.
export const ART_BASE = 'assets/art/';

export async function loadArt(fetchFn = globalThis.fetch, base = ART_BASE) {
  try {
    const res = await fetchFn(`${base}manifest.json`);
    if (!res.ok) return { base, entries: [] };
    const entries = await res.json();
    return { base, entries: Array.isArray(entries) ? entries : [] };
  } catch {
    return { base, entries: [] };
  }
}

export function findArt(art, type, id, variant = null) {
  return art.entries.find((e) => e.type === type && e.id === id && (variant === null || e.variant === variant)) || null;
}

// Pick a file of one size and extension from an entry, e.g. ('512x768', 'webp').
export function artFile(art, entry, size, ext) {
  if (!entry) return null;
  const hit = entry.files.find((f) => f.endsWith(`-${size}.${ext}`) || (ext === 'ico' && f.endsWith('.ico')));
  return hit ? `${art.base}${hit}` : null;
}

export function portraitSrc(art, bossId, mood) {
  const entry = findArt(art, 'portrait', bossId, mood) || findArt(art, 'portrait', bossId, 'neutral');
  return artFile(art, entry, '512x768', 'webp');
}

export function relicFiles(art, id) {
  const entry = findArt(art, 'relic', id);
  if (!entry) return null;
  return {
    webp1: artFile(art, entry, '48', 'webp'),
    webp2: artFile(art, entry, '96', 'webp'),
    png1: artFile(art, entry, '48', 'png'),
    png2: artFile(art, entry, '96', 'png'),
    big: artFile(art, entry, '200', 'webp'),
  };
}

export function backdropSrc(art, floor) {
  return artFile(art, findArt(art, 'backdrop', `floor-${floor}`), '1920x1080', 'webp');
}

export function cardBackSrc(art) {
  return artFile(art, findArt(art, 'card', 'back'), '250x350', 'webp');
}
