/**
 * Deep links into our own Airbnb listings.
 *
 * Airbnb accepts check_in / check_out / adults / children / guests, so once a
 * guest has picked dates and party size on our availability calendar we can
 * hand Airbnb a pre-filled booking rather than dropping them on a bare
 * listing page. That matters because we publish no nightly rate: Airbnb is
 * where the live price is read, and the price it shows is only right if the
 * party size travels with the link (extra-guest fees).
 *
 * Built on the vanity /h/<name> URLs from the stays content rather than raw
 * room IDs. Verified 2026-08-25: the vanity URL 302s to /rooms/<id> and
 * carries every query param through intact, so we keep the branded link and
 * one source of truth for the listing address.
 *
 * `guests` is the total Airbnb prices on (adults + children; infants are
 * excluded and we do not ask about them).
 */
export interface AirbnbBookingParams {
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number;
  children?: number;
}

export function airbnbListingUrl(listingUrl: string, params: AirbnbBookingParams = {}): string {
  const url = new URL(listingUrl);
  const adults = Math.max(1, Math.floor(params.adults ?? 1));
  const children = Math.max(0, Math.floor(params.children ?? 0));

  if (params.checkIn) url.searchParams.set('check_in', params.checkIn);
  if (params.checkOut) url.searchParams.set('check_out', params.checkOut);
  url.searchParams.set('adults', String(adults));
  if (children > 0) url.searchParams.set('children', String(children));
  url.searchParams.set('guests', String(adults + children));

  return url.toString();
}
