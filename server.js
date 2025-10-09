import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 8080;
const logger = pino({
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Cache with a 5-minute TTL and a limit of 100 entries
const cache = new NodeCache({ stdTTL: 300, maxKeys: 100 });

app.get("/rss", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    logger.warn("Missing ?url= parameter");
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  // If the URL is in the cache, return the result directly
  if (cache.has(url)) {
    logger.info({ url, cache: "hit" }, "Serving from cache");
    const { data, contentType } = cache.get(url);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", contentType);
    return res.send(data);
  }

  logger.info({ url, cache: "miss" }, "Fetching from origin");
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(
        { url, status: response.status },
        "Failed to fetch remote content"
      );
      return res
        .status(response.status)
        .json({ error: "Failed to fetch remote content" });
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    const data = await response.text();

    // Save the response in the cache
    cache.set(url, { data, contentType });

    // Allow frontend access
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", contentType);
    res.send(data);
  } catch (err) {
    logger.error({ url, err }, "Internal error fetching RSS");
    res.status(500).json({ error: "Internal error fetching RSS" });
  }
});

app.get("/", (req, res) => {
  res.send("📰 RSS Proxy is running. Use /rss?url=https://example.com/feed");
});

app.listen(PORT, () => {
  logger.info(`✅ RSS Proxy running on port ${PORT}`);
});