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
    directOnly: z.boolean().default(false),
    guestFavourite: z.boolean().default(false),
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

export const collections = { stays, guides, manual, faqs };
