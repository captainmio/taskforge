import app from "./app.js";
import { closeCacheRedisConnection } from "./config/cache.js";
import { env } from "./config/env.js";

const port = env.PORT;

const server = app.listen(port, () => {
  console.log("=============================================");
  console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`);
  console.log("=============================================");
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
      console.error("Unable to close HTTP server cleanly", error);
      process.exitCode = 1;
    }
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
