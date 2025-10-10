import express from "express";
import path from "path";
import { RssController } from "./controllers/RssController.js";
import { RssService } from "../application/services/RssService.js";
import { InMemoryFeedRepository } from "../infrastructure/repositories/InMemoryFeedRepository.js";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 8080;
const logger = pino({
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "message",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Dependency Injection
const feedRepository = new InMemoryFeedRepository();
const rssService = new RssService(feedRepository);
const rssController = new RssController(rssService);

// Serve the `public` directory using an absolute path so static files
// are found regardless of the process working directory when the server
// is started (prevents "Cannot GET /" when cwd differs).
const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));

// Ensure GET / always returns the index.html from the public folder
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/rss", (req, res) => rssController.getFeed(req, res));

app.get("/health", (req, res) => {
  const stats = feedRepository.getStats();
  const healthCheck = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cacheStats: stats,
  };
  res.send(healthCheck);
});

app.listen(PORT, () => {
  logger.info(`✅ RSS Proxy running on port ${PORT}`);
});
