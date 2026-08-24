import { getEntry } from 'astro:content';

/**
 * Facts that appear in more than one place (contact details, check-in/out
 * times, hot tub limits, the direct-booking discount). Edited in
 * src/content/site-facts.json, read through here so nothing re-states them
 * inline.
 */
export async function getSiteFacts() {
  const entry = await getEntry('siteFacts', 'default');
  if (!entry) throw new Error('site-facts.json is missing the "default" row');
  return entry.data;
}
