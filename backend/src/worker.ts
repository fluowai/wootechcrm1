import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma.js";
import { logger } from "./utils/logger.js";
import { startBackgroundWorkers } from "./workers/backgroundWorkers.js";

const workers = startBackgroundWorkers(prisma);
logger.info("Worker", "Processo de tarefas em segundo plano iniciado");

async function shutdown(exitCode = 0) {
  logger.info("Worker", "Encerrando tarefas em segundo plano");
  workers.stop();
  await prisma.$disconnect().catch(() => undefined);
  process.exit(exitCode);
}

process.on("SIGTERM", () => void shutdown(0));
process.on("SIGINT", () => void shutdown(0));
process.on("uncaughtException", (error) => {
  logger.error("Worker", "UNCAUGHT_EXCEPTION", { error: error.message, stack: error.stack });
  void shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Worker", "UNHANDLED_REJECTION", { error: String(reason) });
  void shutdown(1);
});
