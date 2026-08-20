import app from "./app.js";
import { closeCacheRedisConnection } from "./config/cache.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const port = env.PORT;

const server = app.listen(port, () => {
  logger.info({ event: "server.started", port }, "====HTTP server started====");
});

let isShuttingDown = false;

const shutdown = (): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Stop accepting requests and let active requests finish before disconnecting
  // the cache they may still need while completing their work.
  server.close((error) => {
    closeCacheRedisConnection();

    if (error) {
      logger.error(
        { event: "server.shutdown_failed", err: error },
        "Unable to close HTTP server cleanly",
      );
      process.exitCode = 1;
      return;
    }

    logger.info({ event: "server.stopped" }, "HTTP server stopped");
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
