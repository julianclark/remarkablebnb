import type { ImageMetadata } from 'astro';

// Eagerly import every stay photo so Astro optimises them at build time.
const modules = import.meta.glob<ImageMetadata>('../assets/photos/**/*.{jpeg,jpg,avif,png}', {
  eager: true,
  import: 'default',
});

// Curated, narrative order per room (exterior/view → living → kitchen →
// bedrooms → bathroom → wow shot). Filenames must match those on disk.
const ORDER: Record<string, string[]> = {
  'two-bedroom-unit': [
    'External.jpeg',
    'Masterbed4 view.avif',
    'deck view.avif',
    'Deck.avif',
    'Dininig Area.avif',
    'Dining Area 9.avif',
    'Unit Kitchen.avif',
    'Unit Kitchen2.avif',
    'Master Bedroom.avif',
    'Master Bed 3.avif',
    'Bed 2 wide.avif',
    'Bed 2 View.avif',
    'Bathroom all 2.avif',
    'Bathroom Shower.avif',
    'Aurora.avif',
  ],
  'guest-room': [
    'Bedroom.avif',
    'bedroom2.avif',
    'bedroom3.avif',
    'bedroom deck.avif',
    'view.avif',
    'ensuite.avif',
    'shower.jpeg',
    'lounge.avif',
    'kitchen.avif',
    'Dining.avif',
    'fireplace.avif',
    'External Access.avif',
    'dogs.avif',
  ],
};

// Human-readable captions keyed by the base filename.
function captionFor(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\b(\d+)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GalleryImage {
  image: ImageMetadata;
  alt: string;
}

export function getGallery(slug: string, stayTitle: string): GalleryImage[] {
  const order = ORDER[slug] ?? [];
  const byFilename = new Map<string, ImageMetadata>();
  for (const [path, meta] of Object.entries(modules)) {
    if (!path.includes(`/photos/${slug}/`)) continue;
    const filename = path.split('/').pop()!;
    byFilename.set(filename, meta);
  }

  const result: GalleryImage[] = [];
  for (const filename of order) {
    const meta = byFilename.get(filename);
    if (meta) {
      const caption = captionFor(filename);
      result.push({ image: meta, alt: `${stayTitle} — ${caption}` });
    }
  }
  return result;
}
