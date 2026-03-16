import { route } from "@fal-ai/server-proxy/nextjs";

// Proxy all fal.ai API requests through our server
// This keeps FAL_KEY on the server and never exposes it to the browser
export const { GET, POST, PUT } = route;
