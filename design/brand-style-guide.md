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

Warm alpenglow palette, pulled from the schist, snow, cedar and alpenglow
of the site itself. Defined once as CSS custom properties (`--color-*`)
and used everywhere via `var()`: never a raw hex in a component.

| Name | Value | Use |
|---|---|---|
| `schist-ink` | `#1a1714` | Dark UI surfaces: footer, TV mode, dark section bands |
| `graphite` | `#262320` | Headings, primary body text |
| `stone-grey` | `#5c564c` | Secondary/body copy, borders on dark (6.5:1 on plaster) |
| `taupe` | `#857c6f` | Muted meta and caption text |
| `plaster` | `#f5f1ea` | Page background (the site is light-mode only) |
| `snow` | `#fffefb` | Card and panel surfaces |
| `hairline` | `#e4dcce` | Borders, dividers |
| `fill` | `#efe7d9` | Fact-pill and chip tinted backgrounds |
| `stone` | `#d9cdb8` | Input borders, decorative fills |
| `larch` | `#b79a6d` | Warm wood, decorative only, never text |
| `cedar` | `#8a6b45` | Deep wood, large text only |
| `ember` | `#99502f` | Primary CTA and default links (5.9:1 on plaster, AA) |
| `link-hover` | `#7f3f24` | Link/CTA hover and press, light surfaces |
| `visited` | `#7a4a3e` | Visited links, never browser purple |
| `ember-dark-hover` | `#c76d47` | Ember CTA hover specifically on dark surfaces |
| `alpenglow` | `#b5613e` | Accent, large display text and icon fills only (~4.4:1) |
| `sun-gold` | `#cf8a3c` | Favourite marks, stars: decorative only, fails contrast (~2.5-2.8:1) as text on light |
| `sun-gold-dark` | `#a86a1f` | AA-safe gold variant for badge text |
| `pine-teal` | `#47716f` | Secondary accent badges (e.g. "Top 1%") |
| `forest` | `#4b6b4a` | Success, positive/nature accent (dogs, outdoors) |
| `cream` | `#f0e6d8` | Text on dark surfaces |
| `cream-muted` | `#b3a795` | Muted text on dark surfaces |

The site never uses dark mode (`.dark` is never toggled): always design
for the light surface (`plaster` background, `graphite` text). Dark section
*bands* using `schist-ink` are fine and used deliberately (e.g. the hot tub
section, roughly 10% of the page); a full dark *page* surface is not, this
is a light-mode site (TV mode is the one dark-by-design exception, and it
is never public).

### Link states

All four states are explicit in `global.css`, from the token palette,
per the design system's ground rules. Focus rings are never removed, only
restyled:

| State | Colour |
|---|---|
| Link | `ember` (#99502F) |
| Hover | `link-hover` (#7F3F24) |
| Visited | `visited` (#7A4A3E, never purple) |
| Focus | 2px `ember` outline (`:focus-visible`), always kept |

## Typography

- Typefaces: **Newsreader** (display serif: headlines, taglines,
  pull-quotes, warm italic) + **Hanken Grotesk** (text and UI, tabular
  numerals for rates and dates). Both self-hosted as subset WOFF2 with
  `font-display: swap`, not loaded from the Google Fonts CDN, so pages
  stay readable on slow ski-field wifi before webfonts arrive.
- Headings (`h1`–`h4`): `font-family: var(--font-serif)`, weight 500,
  `line-height: 1.15`, `letter-spacing: -0.02em`. Small uppercase
  overline-style labels that happen to use an `h2`/`h3` tag (e.g. form
  section headers) get an explicit `font-sans` override to stay in Hanken
  Grotesk.
- Scale actually in use, and the only sizes that should appear anywhere:
  overline `text-sm uppercase tracking-widest` → hero/display headline
  `text-4xl sm:text-5xl font-medium` → section headline `text-3xl
  font-medium` → card/panel title `text-lg font-medium` → tagline italic
  (`font-serif italic`, ember) → lead `text-lg` → body `text-sm` (body
  line-height 1.7) → meta/caption `text-xs`. Don't introduce a new size
  without adding it here and to `/style-guide` first.

## Spacing & layout

Every section shares one wrapper shape:

```html
<section class="py-16 sm:py-20">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">...</div>
</section>
```

Text-heavy pages narrow the inner max-width to `max-w-3xl` or `max-w-4xl`.
Section headers are usually centered: `max-w-2xl mx-auto text-center`, a
`text-3xl font-medium` serif title, one line of `stone-grey` supporting copy.

## Components / patterns

- **Badges**: pill shape, near-opaque white fill (legible over photos),
  color-tinted border + text: `badge-gold`, `badge-ember`, `badge-pine`,
  `badge-forest` variants.
- **Buttons/CTAs**: always paired: primary "Book Direct" (solid `ember`
  fill, white text, rounded-xl, lifts on hover) + secondary "Book on
  Airbnb" (2px `hairline` border, no fill). A one-line honest comparison
  note sits underneath, never omitted: *"Direct is cheaper and personal.
  Airbnb offers AirCover mediation. Choose what works for you."*
- **Cards/panels**: two nesting depths: outer panel `rounded-2xl border
  border-hairline bg-snow p-6`, inner tile `rounded-xl border p-3`.
  Review cards: 5 `sun-gold-dark` stars, quote, then a small bold
  attribution line (name · location · date).
- **Amenity chips**: icon + label pairs in a `rounded-lg` `fill`-tinted
  background, used for room amenity lists.
- Rounded corners throughout: `rounded-lg` (chips) → `rounded-xl` (inner
  tiles, buttons) → `rounded-2xl` (outer cards/panels). No sharp corners
  anywhere in the UI.
- **Icons visible by default**: never hide an icon or action behind hover.
  Stars, arrows and status dots carry meaning, so they render at rest, on
  touch and with a keyboard. Hover only enhances, it never reveals.

## Copy rules

- No em dashes anywhere in site copy. The only exception is verbatim guest
  review quotes, reproduced exactly as written.
- NZ English spelling throughout: favourite, cosy, neighbourhood, colour.
- No exclamation-mark marketing. State the honest fact rather than sell it.
- Real details and real reviews only: never invent tips, stories, years,
  personality traits or reviews. Guest quotes are verbatim and correctly
  attributed. Fabricated "personal" touches are worse than none.

## Imagery rules

- Real photos only, never stock, not even temporarily. A striped
  placeholder with a mono label and the correct aspect ratio is fine while
  a real photo is pending.
- Hero text readability via a gradient scrim (ink-tinted, from
  `schist-ink`) behind the text, never a highlight box.
- Badges over photos are near-opaque pill chips, not translucent glass,
  translucency loses to unpredictable photo content underneath.
- Descriptive alt text on every image. No guest faces without consent.
  Never hand-drawn SVG scenes.

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
