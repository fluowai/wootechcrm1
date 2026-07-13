import type { PrismaClient } from "@prisma/client";
import { MissionScheduler } from "../services/prospect/MissionScheduler.js";
import { AutomationWorker } from "./automationWorker.js";
import { FollowUpWorker } from "./followUpWorker.js";
import { ProspectingDispatchWorker } from "./prospectingDispatchWorker.js";
import { SdrAgentWorker } from "./sdrAgentWorker.js";
import { SmartFollowUpWorker } from "./smartFollowUpWorker.js";

export interface BackgroundWorkers {
  stop(): void;
}

export function startBackgroundWorkers(prisma: PrismaClient): BackgroundWorkers {
  const workers = [
    new MissionScheduler(prisma),
    new AutomationWorker(prisma),
    new FollowUpWorker(prisma),
    new ProspectingDispatchWorker(prisma),
    new SdrAgentWorker(prisma),
    new SmartFollowUpWorker(prisma),
  ];

  workers.forEach((worker) => worker.start());
  return { stop: () => workers.forEach((worker) => worker.stop()) };
}
