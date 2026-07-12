import { PrismaClient } from "@prisma/client";
import { processProspectingDispatchQueue } from "../services/prospectingDispatch.js";
import { logger } from "../utils/logger.js";
import { mutex } from "../utils/concurrency.js";

export class ProspectingDispatchWorker {
  private prisma: PrismaClient;
  private running = false;
  private processing = false;
  private interval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  start(intervalMs = Number(process.env.PROSPECTING_DISPATCH_INTERVAL_MS || 30000)) {
    if (this.running) return;
    this.running = true;
    logger.info("ProspectingDispatchWorker", `iniciado. Intervalo: ${intervalMs}ms.`);
    this.interval = setInterval(() => this.tick(), intervalMs);
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    logger.info("ProspectingDispatchWorker", "parado.");
  }

  private async tick() {
    if (!this.running || this.processing) return;
    this.processing = true;

    await mutex.acquire("prospecting-dispatch-worker", async () => {
      try {
        const limit = Number(process.env.PROSPECTING_DISPATCH_BATCH_SIZE || 5);
        const result = await processProspectingDispatchQueue(this.prisma, { limit, automated: true });
        if (result.sent.length || result.failed.length) {
          logger.info("ProspectingDispatchWorker", `enviados=${result.sent.length} falhas=${result.failed.length} prontos=${result.ready} inspecionados=${result.inspected}`);
        }
      } catch (error: any) {
        logger.error("ProspectingDispatchWorker", "erro ao processar fila", { error: error?.message || error });
      } finally {
        this.processing = false;
      }
    });
  }
}
