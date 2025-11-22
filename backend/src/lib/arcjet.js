import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

import { ENV } from "./env.js";

// Only initialize Arcjet if key is provided
let aj = null;

if (ENV.ARCJET_KEY) {
  try {
    aj = arcjet({
      key: ENV.ARCJET_KEY,
      rules: [
        // Shield protects your app from common attacks e.g. SQL injection
        shield({ mode: "LIVE" }),
        // Create a bot detection rule
        detectBot({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
          // Block all bots except the following
          allow: [
            "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
            // Uncomment to allow these other common bot categories
            // See the full list at https://arcjet.com/bot-list
            //"CATEGORY:MONITOR", // Uptime monitoring services
            //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
          ],
        }),
        // Create a token bucket rate limit. Other algorithms are supported.
        slidingWindow({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
          max: 100,
          interval: 60,
        }),
      ],
    });
    console.log("Arcjet initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Arcjet:", error);
    aj = null;
  }
} else {
  console.log("Arcjet key not provided, skipping initialization");
}

export default aj;
