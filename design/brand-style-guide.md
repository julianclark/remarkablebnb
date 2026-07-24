# Remarkable BnB: brand & style guide

Direct-booking site + guest hub for stays at Holly & Julian's home in Hanley's
Farm, on the edge of Jack's Point, Queenstown, under The Remarkables ski
field. This doc is the portable version of the live reference at
`/style-guide` on the site: paste it into a Claude Design conversation (or
any design tool) to brief it on the brand before asking it to build screens.

## Who we are

- Personal hosts, not a property company. First-person plural ("we", "our
  home"). Holly & Julian are named and visible, not hidden behind a brand.
- Positioning: a **destination stay**: mountains, snow, Remarkables ski
  access, Jack's Point golf course walking distance. Not Queenstown CBD.
- Tagline: **"Remarkable BnB, under The Remarkables."**
- Proof point: a 5-star hosting record. Specific and warm, never salesy,
  no exclamation-mark marketing copy.
- Always honest: direct booking is cheaper and more personal; Airbnb offers
  AirCover and platform mediation. Let guests choose: never disparage
  Airbnb, never oversell direct.

## Color

Mountain-inspired palette, defined once as CSS custom properties
(`--color-*`) and used everywhere via `var()`: never a raw hex in a
component.

| Name | Value | Use |
|---|---|---|
| `slate-deep` | `#1e293b` | Body text, headings, dark section backgrounds |
| `slate-mid` | `#334155` | Secondary/muted text, borders on dark surfaces |
| `stone-warm` | `#d6cfc7` | Warm neutral accents on dark backgrounds |
| `stone-light` | `#e7e5e0` | Card borders, section dividers, subtle fills |
| `snow` | `#fafaf9` | Page background (the site is light-mode only) |
| `alpine` | `#3b82f6` | Primary brand accent: links, primary CTA |
| `alpine-dark` | `#2563eb` | Primary CTA hover/active state |
| `gold` | `#d97706` | Borders, decorative fills, large text only: fails contrast (~3:1) as small text on snow |
| `gold-dark` | `#92400e` | Gold as text-xs/text-sm (review stars, badge text, host tip labels): ~6.8:1 on snow |
| `forest` | `#166534` / `#22c55e` (light) | Positive/nature accent (dogs, outdoors) |

The site never uses dark mode (`.dark` is never toggled): always design
for the light surface (`snow` background, `slate-deep` text). Dark section
*bands* using `slate-deep` are fine and used deliberately (e.g. the hot tub
section); a full dark *page* surface is not: this is a light-mode site.

### Link states

All four states are explicit in `global.css`, from the token palette:
`alpine` sits close to default browser link blue, which is only acceptable
because nothing is left to fall back to browser-default blue or purple:

| State | Colour |
|---|---|
| Link | `alpine` |
| Hover | `alpine-dark` |
| Visited | `alpine-dark` (never purple) |
| Focus | 2px `alpine` outline (`:focus-visible`) |

## Typography

- Typeface: **Inter** (system-ui fallback), loaded at 400/500/600/700/800.
- Headings (`h1`–`h4`): bold, `line-height: 1.2`, `letter-spacing: -0.02em`.
- Scale actually in use, and the only sizes that should appear anywhere:
  kicker `text-sm uppercase tracking-widest` → hero headline `text-4xl
  sm:text-5xl font-extrabold` → section headline `text-3xl font-bold` →
  card/panel title `text-lg font-bold` → lead `text-lg` → body `text-sm`
  (body line-height 1.7) → meta/caption `text-xs`. Don't introduce a new
  size without adding it here and to `/style-guide` first.

## Spacing & layout

Every section shares one wrapper shape:

```html
<section class="py-16 sm:py-20">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">...</div>
</section>
```

Text-heavy pages narrow the inner max-width to `max-w-3xl` or `max-w-4xl`.
Section headers are usually centered: `max-w-2xl mx-auto text-center`, a
`text-3xl font-bold` title, one line of `slate-mid` supporting copy.

## Components / patterns

- **Badges**: pill shape, near-opaque white fill (legible over photos),
  color-tinted border + text: gold, alpine, forest variants.
- **Buttons/CTAs**: always paired: primary "Book Direct" (solid `alpine`
  fill, white text, rounded-xl, lifts on hover) + secondary "Book on
  Airbnb" (2px `stone-light` border, no fill). A one-line honest comparison
  note sits underneath, never omitted: *"Direct is cheaper and personal.
  Airbnb offers AirCover mediation. Choose what works for you."*
- **Cards/panels**: two nesting depths: outer panel `rounded-2xl border
  border-stone-light bg-white p-6`, inner tile `rounded-xl border p-3`.
  Review cards: 5 gold stars, quote, then a small bold attribution line
  (name · location · date).
- **Amenity chips**: icon + label pairs in a `rounded-lg` tinted
  background, used for room amenity lists.
- Rounded corners throughout: `rounded-lg` (chips) → `rounded-xl` (inner
  tiles, buttons) → `rounded-2xl` (outer cards/panels). No sharp corners
  anywhere in the UI.

## Copy rules

- No em dashes anywhere in site copy. The only exception is verbatim guest
  review quotes, reproduced exactly as written.
- NZ English spelling throughout: favourite, cosy, neighbourhood, colour.
- No exclamation-mark marketing. State the honest fact rather than sell it.
- Real details and real reviews only: never invent tips, stories, years,
  personality traits or reviews. Guest quotes are verbatim and correctly
  attributed. Fabricated "personal" touches are worse than none.

## Imagery rules

- Real photos only, never stock, not even temporarily. A styled placeholder
  with the correct aspect ratio is fine while a real photo is pending.
- Hero text readability via a gradient scrim behind the text, never a
  highlight box.
- Badges over photos are near-opaque pill chips, not translucent glass,
  translucency loses to unpredictable photo content underneath.

## What to avoid

- Exclamation marks, hype language, generic "luxury villa" stock-photo
  styling: this is a personal home, not a resort.
- Implying the hot tub is a standard amenity: it's an upsell offer shown
  only to specific confirmed guests, never listed publicly.
- Publishing the returning-guest discount percentage.
- A full dark-mode page surface (dark section bands are fine), or any UI
  that isn't usable one-handed on a phone: guest-hub pages get used on
  ski-field wifi.
- Raw hex values in components: tokens only, `var(--color-*)`.

## Source of truth

This file is a manually-curated snapshot. The live, always-current version
is the site itself:
- `src/styles/global.css`: the `@theme` token block (colors, spacing).
- `src/components/*.astro`: real markup for badges, CTAs, cards, chips.
- `/style-guide`: a rendered page that shows all of the above live (not
  linked in navigation, not indexed by search engines).

If this doc and the site ever disagree, the site wins: refresh this file
from it rather than the other way round.
