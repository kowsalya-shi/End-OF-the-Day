import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { processMissingEodNotifications, processOverdueWorkNotifications } from "./routes/notifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function scheduleMissingEodNotifications() {
  const now = new Date();
  const runAt = new Date(now);
  runAt.setHours(21, 0, 0, 0);
  if (runAt <= now) runAt.setDate(runAt.getDate() + 1);

  setTimeout(async () => {
    try {
      const date = todayLocal();
      logger.info(await processMissingEodNotifications(date), "Processed 9 PM EOD notifications");
      logger.info(await processOverdueWorkNotifications(date), "Processed overdue work notifications");
    } catch (err) {
      logger.error({ err }, "Failed to process 9 PM EOD notifications");
    }
    scheduleMissingEodNotifications();
  }, runAt.getTime() - now.getTime());
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  scheduleMissingEodNotifications();
});
