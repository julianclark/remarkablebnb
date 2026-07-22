import { handle } from '@astrojs/cloudflare/handler';
import { syncAirbnbCalendars } from './lib/airbnb-sync';

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(syncAirbnbCalendars(env));
  },
};
