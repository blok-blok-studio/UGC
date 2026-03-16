import { fal } from "@fal-ai/client";

// Configure fal client to use our server-side proxy
// This ensures the API key never reaches the browser
fal.config({
  proxyUrl: "/api/fal/proxy",
});

export { fal };
