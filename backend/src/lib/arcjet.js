import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

import { ENV } from "./env.js";

let aj = null;

try {
  if (ENV.ARCJET_KEY) {
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
    console.log("Arcjet protection initialized successfully");
  } else {
    console.warn("ARCJET_KEY is not set. Arcjet protection will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Arcjet:", error.message);
  console.error("Arcjet protection will be disabled. App will continue without it.");
  aj = null;
}

export default aj;
