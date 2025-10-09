import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";

const app = express();
const PORT = process.env.PORT || 8080;

// Cache with a 5-minute TTL and a limit of 100 entries
const cache = new NodeCache({ stdTTL: 300, maxKeys: 100 });

app.get("/rss", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  // If the URL is in the cache, return the result directly
  if (cache.has(url)) {
    console.log(`[CACHE] HIT: ${url}`);
    const { data, contentType } = cache.get(url);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", contentType);
    return res.send(data);
  }

  console.log(`[CACHE] MISS: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
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
    console.error(err);
    res.status(500).json({ error: "Internal error fetching RSS" });
  }
});

app.get("/", (req, res) => {
  res.send("📰 RSS Proxy is running. Use /rss?url=https://example.com/feed");
});

app.listen(PORT, () => {
  console.log(`✅ RSS Proxy running on port ${PORT}`);
});
