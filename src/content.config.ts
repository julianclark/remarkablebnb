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

// Single source of truth for facts repeated across pages: contact details,
// check-in/out times, the direct-booking discount, hot tub limits. Anything
// that appears in more than one place belongs here, not inline in a template,
// so a change lands everywhere at once. The discount is also imported by the
// pricing code (calendar, stay page, enquiry estimate) so the published
// percentage and the arithmetic can never disagree.
const siteFacts = defineCollection({
  loader: file('./src/content/site-facts.json'),
  schema: z.object({
    id: z.string(),
    hostNames: z.string(),
    email: z.string(),
    locationLabel: z.string(),
    checkInTime: z.string(),
    checkOutTime: z.string(),
    directDiscountPercent: z.number(),
    googleReviewUrl: z.string().url(),
    hotTub: z.object({
      maxPeople: z.number(),
      tempRange: z.string(),
      rules: z.string(),
    }),
  }),
});

// Standalone prose pages (terms, contact) — the body is markdown so the whole
// document is editable without touching a component. `sections` in the body
// are plain h2s; the template supplies only chrome (badge, heading, intro).
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    slug: z.string(),
    badge: z.string().optional(),
    heading: z.string(),
    intro: z.string().optional(),
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

// Guest hub copy behind /stay/{token}/*: the extras offer, both checkout
// variants (airbnb vs direct/repeat), and the expired-stay page. Markdown
// bodies so host-voice copy is edited as prose, never as JSX.
const guestCopy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guest' }),
  schema: z.object({
    slug: z.string(),
    heading: z.string(),
    icon: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    ctaNote: z.string().optional(),
  }),
});

// Homepage section headings and intro paragraphs. The cards under each of
// these already come from JSON (segments, locationRows, faqs...); this puts
// the headings above them on the same footing.
const homeHeadings = defineCollection({
  loader: file('./src/content/home/headings.json'),
  schema: z.object({
    id: z.string(),
    badge: z.string().optional(),
    heading: z.string(),
    intro: z.string().default(''),
    footnote: z.string().default(''),
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
    // Cross-link to the companion guide, rendered top and bottom. Data-driven
    // so the pair isn't hardcoded in two near-identical page components.
    sibling: z.object({ slug: z.string(), label: z.string(), prompt: z.string() }).optional(),
    // Italic host-voice tagline shown under the H1, used by eat-and-drink /
    // things-to-do (Claude Build Brief 7). Optional: older guide stubs don't set it.
    tagline: z.string().optional(),
    askUsText: z.string().optional(),
    extraBoxTitle: z.string().optional(),
    extraBoxText: z.string().optional(),
    // extraBoxText sometimes names a booking/savings tool (First Table);
    // this renders as a small "Website" pill next to the box rather than
    // an inline link inside the prose (Claude Build Brief 9, Priority 2).
    extraBoxLink: z.object({ href: z.string(), label: z.string() }).optional(),
    // Short practical bullets shown near the top of a guide (Claude Build
    // Brief 9, Priority 4). A bullet may carry its own external link
    // (e.g. Bookme), rendered as a pill, never inline in the text.
    quickTips: z.array(z.object({
      text: z.string(),
      link: z.object({ href: z.string(), label: z.string() }).optional(),
    })).optional(),
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
    slug: z.enum(['hosts', 'dogs', 'hot-tub']),
    badge: z.string(),
    heading: z.string(),
    photoAlt: z.string(),
    signoffLine: z.string().optional(),
    signoffNames: z.string().optional(),
    // Hot tub band only: it's a feature section with a CTA rather than a
    // hosts-style prose block.
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
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
      // External link, shown as a small "Website" fact pill, never inline
      // in the host note. Selective by design (Claude Build Brief 9,
      // Priority 2): only where a guest needs the link to act.
      website: z.object({ href: z.string(), label: z.string().default('Website') }).optional(),
    })).default([]),
    linkOut: z.object({ href: z.string(), label: z.string() }).optional(),
    todoSection: z.string().optional(),
  }),
});

// Homepage "Who we're great for" cards.
const segments = defineCollection({
  loader: file('./src/content/home/segments.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    icon: z.string(),
    title: z.string(),
    copy: z.string(),
    reviewId: z.string().optional(),
  }),
});

// Homepage "Location & getting around" distance/travel-time facts.
const locationRows = defineCollection({
  loader: file('./src/content/home/location-rows.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    icon: z.string(),
    label: z.string(),
    detail: z.string(),
  }),
});

// Homepage host tips (short, first-person, real), shown alongside the
// location facts.
const hostTips = defineCollection({
  loader: file('./src/content/home/host-tips.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    icon: z.string(),
    title: z.string(),
    copy: z.string(),
  }),
});

// Homepage "Why book with us" bullet list of direct-booking extras.
const bookDirectExtras = defineCollection({
  loader: file('./src/content/home/book-direct-extras.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    icon: z.string(),
    text: z.string(),
  }),
});

// Homepage hero. Swap these values (and the image at /public/images/hero.jpg)
// to re-theme the hero by season, e.g. winter snow imagery + ski messaging vs
// summer trails/sunsets/hot-tub. Same layout and palette either way.
const hero = defineCollection({
  loader: file('./src/content/home/hero.json'),
  schema: z.object({
    id: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    kicker: z.string(),
    heading: z.string(),
    subcopy: z.string(),
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

export const collections = {
  stays,
  guides,
  manual,
  faqs,
  reviews,
  siteFacts,
  pages,
  guestCopy,
  homeSections,
  homeHeadings,
  guideSections,
  segments,
  locationRows,
  hostTips,
  bookDirectExtras,
  hero,
};
