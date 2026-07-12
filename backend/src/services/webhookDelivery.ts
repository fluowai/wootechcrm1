import { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";
import { logger } from "../utils/logger.js";

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliver(prisma: PrismaClient, webhookId: string, eventId: string, url: string, secret: string | null, payload: object) {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": (payload as any)?.event || "unknown",
  };
  if (secret) {
    headers["X-Webhook-Signature"] = signPayload(body, secret);
  }

  let statusCode = 0;
  let responseBody = "";
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    statusCode = res.status;
    responseBody = await res.text().catch(() => "");
    success = statusCode >= 200 && statusCode < 300;
  } catch (err: any) {
    responseBody = err?.message || "fetch failed";
    statusCode = 0;
  }

  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      statusCode,
      response: responseBody.slice(0, 10_000),
      status: success ? "success" : "failed",
      attempts: { increment: 1 },
    },
  });

  if (success) {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { failCount: 0, lastTriggeredAt: new Date() },
    });
  } else {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { failCount: { increment: 1 } },
    });
  }
}

export async function dispatchWebhookEvent(prisma: PrismaClient, event: string, data: object) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { array_contains: event },
      },
    });

    const payload = { event, ...data };

    for (const wh of webhooks) {
      const eventRecord = await prisma.webhookEvent.create({
        data: {
          webhookId: wh.id,
          event,
          payload,
          status: "pending",
        },
      });

      deliver(prisma, wh.id, eventRecord.id, wh.url, wh.secret, payload).catch((err) => {
        logger.error("WebhookDelivery", `Failed to deliver ${event} to ${wh.url}`, { error: err?.message });
      });
    }
  } catch (err: any) {
    logger.error("WebhookDelivery", `dispatchWebhookEvent error for ${event}`, { error: err?.message });
  }
}

export async function retryFailedEvent(prisma: PrismaClient, webhookEventId: string) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
    include: { webhook: true },
  });
  if (!event || !event.webhook.isActive) return;

  await deliver(prisma, event.webhookId, event.id, event.webhook.url, event.webhook.secret, event.payload as object);
}

export async function cleanupOldEvents(prisma: PrismaClient, olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.webhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  logger.info("WebhookDelivery", `Cleaned up ${result.count} old events`);
  return result.count;
}
