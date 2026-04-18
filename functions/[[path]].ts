import { app, startServer } from "../server.ts";
import { httpServerHandler } from "cloudflare:node";
import { createServer } from "node:http";

let initialized = false;
let handler: any;

export async function onRequest(context: any) {
  const { request, env, next } = context;

  // Sync environment variables
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  if (env.BETTER_AUTH_SECRET) process.env.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET;
  if (env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  if (env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  
  process.env.CF_PAGES = "1";

  if (!initialized) {
    await startServer();
    const server = createServer(app);
    handler = httpServerHandler(server);
    initialized = true;
  }

  // Handle static assets fallback if needed, 
  // though Pages usually handles this automatically for files in the root.
  
  return await handler.fetch(request, env, context);
}
