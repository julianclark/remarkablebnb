import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, url }) => {
  const { room } = params;
  
  if (!room) {
    return new Response("Not Found", { status: 404 });
  }

  // Normalized room slugs
  const validRooms = ['two-bedroom-unit', 'guest-room', 'the-unit', 'the-guest-room'];
  if (!validRooms.includes(room)) {
    return new Response("Invalid Room", { status: 404 });
  }

  // Local development fallbacks
  const fallbackMap: Record<string, string> = {
    'two-bedroom-unit': 'demo',
    'the-unit': 'demo',
    'guest-room': 'demo',
    'the-guest-room': 'demo'
  };

  let token = null;
  const kv = locals.runtime?.env?.GO_REDIRECTS;

  if (kv) {
    try {
      token = await kv.get(room);
    } catch (err) {
      console.error("KV read failed: ", err);
    }
  }

  // If no KV token is found, fallback in local dev
  if (!token) {
    token = fallbackMap[room];
  }

  if (token) {
    // Preserve placement tracking parameter if provided
    const src = url.searchParams.get('src');
    const redirectUrl = new URL(`/stay/${token}/check-in`, url.origin);
    if (src) {
      redirectUrl.searchParams.set('src', src);
    }
    
    return Response.redirect(redirectUrl.toString(), 302);
  }

  return new Response("No active stay found for this room.", { status: 404 });
};
