# CLAUDE.md — Remarkable BnB guest hub

## What this is
Direct-booking site + guest hub for stays at Holly & Julian's home in
Hanley's Farm (edge of Jack's Point, Queenstown, under The Remarkables):
- "Two Bedroom Unit": 2BR unit with its own entrance
- "Guest Room": private queen room with ensuite inside the house
- Later: "The Whole House": 3BR/2BA combo, sold direct-only

## Brand & voice
- Personal hosts, not a property company. First-person plural ("we",
  "our home"). Holly & Julian named and visible.
- Positioning: destination stay. Mountains, snow, Remarkables access,
  Jack's Point golf walking distance. NOT Queenstown CBD.
- Tagline: "Remarkable BnB, under The Remarkables."
- 5-star hosting record is the proof point. Specific, warm, never
  salesy. No exclamation-mark marketing copy.

## Pricing tiers
- Airbnb: full rate + Airbnb service fee
- Book Direct: 10% off Airbnb rate, no service fees
- Returning Guest: 15% off Airbnb rate, no service fees. Never publish
  this percentage publicly, keep repeat-stay copy qualitative.
- Always honest: direct is cheaper and personal; Airbnb offers
  AirCover and platform mediation. Let guests choose.

## Stack
- Astro + Tailwind v4. Content collections (markdown) for ALL copy,
  guides, and stay descriptions. No copy hardcoded in components.
- Cloudflare Pages. Pages Functions / Workers for dynamic routes.
- Cloudflare D1: stays, tokens, extras offers, cached iCal blocks.
  KV only for the /go/{room} redirect pointers.
- Scheduled Worker: poll both Airbnb iCal feeds every 30 min; publish
  our own iCal feed for Airbnb to import.
- No login system. No client-side framework unless unavoidable.

## Airbnb listings
- Two Bedroom Unit: https://www.airbnb.co.nz/h/remarkablebnb
  (ID: 1546885102092776257)
- Guest Room: https://www.airbnb.co.nz/h/remarkablebnb-guest
  (ID: 1547499256999390723)

## Routes
- Public: / , /stays/* , /guides/{snow,local,booking-tips} ,
  /reviews , /contact
- /go/{room}: 302 to the active stay token for that room
- /stay/{token}/{check-in,manual,rules,extras,checkout}: confirmed
  guests only. Token = short random slug keyed to a D1 stay row:
  { room, source: airbnb|direct|repeat, checkIn, checkOut,
    hotTubOffered: boolean }.
  Valid 3 days before check-in until 7 days after checkout; then show
  a friendly "this stay has ended" page (410).
- /stay/{token}/tv: TV mode. Dark, huge type, wifi code, snow report,
  weather. Auto-cycles panels. Zero interaction required.

## Behaviour rules
- Checkout page adapts to token source: airbnb -> "save our details",
  repeat/direct -> returning-guest rate.
- Hot tub is an offer, not an amenity: show on /extras only when
  hotTubOffered is true for that stay. Request -> host confirms ->
  Stripe Payment Link. Never imply it is always available; never list
  it in public amenities.
- Every stay page has two booking CTAs: "Book direct" (primary) and
  "Book on Airbnb" (secondary, official listing link). Honest framing:
  direct = 10% off + personal; Airbnb = platform protection.
- Stay page copy is rewritten from the Airbnb listings, never pasted
  verbatim (duplicate content). Target searches Airbnb can't own.
- Never expose guest names or booking data in URLs or client JS.
- Track placements with ?src= (door, folder, wifi-card, tv).

## Quality bars
- Mobile-first; every guest page readable one-handed on a phone.
- Lighthouse 95+ on guest pages (they load on ski-field wifi).
- schema.org VacationRental + FAQPage on public pages.
- Every page works with JS disabled except TV mode.

## Build order
1. Public shell: home + stays + contact (static, deployable day one)
2. Guest hub pages with one manually-created D1 stay row
3. /go/{room} redirects + admin CLI script to create/activate stays
4. iCal poller + availability display on stay pages
5. Enquiry form (Resend email to hosts). No payments yet.
6. Extras flow: hot tub offer flag, request, Stripe Payment Link
7. TV mode
8. Guides content (snow, local, booking-tips) + SEO markup
