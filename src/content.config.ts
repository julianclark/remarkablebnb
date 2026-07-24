import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const stays = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stays' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    tagline: z.string(),
    type: z.enum(['unit', 'room', 'house']),
    bedrooms: z.number(),
    bathrooms: z.number(),
    beds: z.array(z.object({
      type: z.string(),
      count: z.number(),
    })),
    maxGuests: z.number(),
    // Short, honest at-a-glance facts shown as pills on cards + detail pages.
    facts: z.array(z.string()).default([]),
    amenities: z.array(z.string()),
    airbnbUrl: z.string().url(),
    airbnbListingId: z.string(),
    // One-time fee, applies whether booked direct or via Airbnb.
    cleaningFee: z.number(),
    directOnly: z.boolean().default(false),
    guestFavourite: z.boolean().default(false),
    // Airbnb's "top X% of eligible listings" distinction, when they have one.
    topPercent: z.number().optional(),
    rating: z.number().optional(),
    reviewCount: z.number().optional(),
    heroImage: z.string(),
    heroAlt: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    searchThemes: z.array(z.string()),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    icon: z.string(),
    draft: z.boolean().default(true),
    seoTitle: z.string(),
    seoDescription: z.string(),
    // Italic host-voice tagline shown under the H1, used by eat-and-drink /
    // things-to-do (Claude Build Brief 7). Optional: older guide stubs don't set it.
    tagline: z.string().optional(),
    askUsText: z.string().optional(),
    extraBoxTitle: z.string().optional(),
    extraBoxText: z.string().optional(),
    guestTypes: z.array(z.object({
      type: z.string(),
      note: z.string(),
    })).optional(),
  }),
});

// Homepage "Meet your hosts" / "Meet Rocket & Luna" sections. Markdown body
// is the prose (paragraphs + a blockquote for the highlighted callout);
// frontmatter carries the small structured bits (badge, heading, photo alt,
// sign-off) the template renders around it.
const homeSections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/home' }),
  schema: z.object({
    slug: z.enum(['hosts', 'dogs']),
    badge: z.string(),
    heading: z.string(),
    photoAlt: z.string(),
    signoffLine: z.string().optional(),
    signoffNames: z.string().optional(),
  }),
});

// Structured entry cards for the /guides/eat-and-drink and
// /guides/things-to-do pages (Claude Build Brief 7). One flat file, each
// section tagged with which guide it belongs to, same pattern as
// faqs.json/reviews.json below.
const guideSections = defineCollection({
  loader: file('./src/content/guide-sections.json'),
  schema: z.object({
    id: z.string(),
    guide: z.enum(['eat-and-drink', 'things-to-do']),
    order: z.number(),
    title: z.string(),
    intro: z.string().default(''),
    entries: z.array(z.object({
      name: z.string(),
      tier: z.enum(['proven', 'research']),
      meta: z.array(z.string()).default([]),
      note: z.string(),
      todo: z.string().optional(),
    })).default([]),
    linkOut: z.object({ href: z.string(), label: z.string() }).optional(),
    todoSection: z.string().optional(),
  }),
});

const manual = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/manual' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    icon: z.string(),
    order: z.number(),
  }),
});

const faqs = defineCollection({
  loader: file('./src/content/faqs.json'),
  schema: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    order: z.number(),
  }),
});

const reviews = defineCollection({
  loader: file('./src/content/reviews.json'),
  schema: z.object({
    id: z.string(),
    stay: z.enum(['guest-room', 'two-bedroom-unit']),
    name: z.string(),
    date: z.string(),
    location: z.string().default(''),
    quote: z.string(),          // English text shown (translation for non-English reviews)
    original: z.string().default(''), // non-English source, shown above the translation
    themes: z.array(z.enum(['dogs', 'hot-tub', 'ski', 'families'])).default([]),
  }),
});

export const collections = { stays, guides, manual, faqs, reviews, homeSections, guideSections };
