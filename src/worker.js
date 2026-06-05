import { onRequestPost, onRequestGet } from "./api.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route request if it is matching the /api endpoint
    if (url.pathname === "/api" || url.pathname === "/api/") {
      if (request.method === "POST") {
        // Simulate the Cloudflare Pages Functions 'context' object
        const context = {
          request,
          env,
          waitUntil: (promise) => ctx.waitUntil(promise),
          next: () => new Response("Not Found", { status: 404 })
        };
        return onRequestPost(context);
      } else if (request.method === "GET") {
        const context = {
          request,
          env,
          waitUntil: (promise) => ctx.waitUntil(promise),
          next: () => new Response("Not Found", { status: 404 })
        };
        return onRequestGet(context);
      } else {
        return new Response("Method Not Allowed", { status: 405 });
      }
    }

    // Serve static frontend assets from the './dist' folder for all other routes
    return env.ASSETS.fetch(request);
  }
};
