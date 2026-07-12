import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../backend/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, "backend", ".env") });

const CALL_MARKER = "[SDR TGA 03-15/06]";
const RETURN_MARKER = "[SDR TGA retorno 16-19/06]";
const ORG_ID = "d792cfc3-cd09-4f75-87d6-8454475e8a9e";
const OUT_FILE = path.join(root, "scratch", "tga-report-data.json");

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");
  parsed.searchParams.set("sslmode", "disable");
  return parsed.toString();
}

process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);

const prisma = new PrismaClient();

function pct(value, total) {
  return total > 0 ? Number(((value / total) * 100).toFixed(0)) : 0;
}

function dayIso(date) {
  const shifted = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
}

function countByDay(items, field) {
  return items.reduce((acc, item) => {
    const key = dayIso(item[field]);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const [organization, callActivities, returnActivities, calendarEvents] = await Promise.all([
    prisma.organization.findUnique({ where: { id: ORG_ID }, select: { id: true, name: true, type: true } }),
    prisma.activity.findMany({
      where: { organizationId: ORG_ID, type: "CALL", description: { contains: CALL_MARKER } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activity.findMany({
      where: { organizationId: ORG_ID, type: "TASK", description: { contains: RETURN_MARKER } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        organizationId: ORG_ID,
        type: "call",
        startDate: {
          gte: new Date("2026-06-16T00:00:00-03:00"),
          lte: new Date("2026-06-19T23:59:59-03:00"),
        },
      },
      include: { user: { select: { name: true, department: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const calledLeadIds = [...new Set(callActivities.map((activity) => activity.contactId).filter(Boolean))];
  const interestedLeadIds = [...new Set(returnActivities.map((activity) => activity.contactId).filter(Boolean))];
  const scheduledLeadIds = [...new Set(calendarEvents.map((event) => event.leadId).filter(Boolean))];
  const allLeadIds = [...new Set([...calledLeadIds, ...interestedLeadIds, ...scheduledLeadIds])];

  const leads = await prisma.lead.findMany({
    where: { organizationId: ORG_ID, id: { in: allLeadIds } },
    select: { id: true, name: true, phone: true, whatsapp: true },
  });
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  const workedLeads = calledLeadIds.map((leadId) => {
    const lead = leadMap.get(leadId);
    const call = callActivities.find((activity) => activity.contactId === leadId);
    const event = calendarEvents.find((item) => item.leadId === leadId);
    return {
      id: leadId,
      name: lead?.name || "Lead sem nome",
      phone: lead?.phone || lead?.whatsapp || "",
      callDate: call?.createdAt?.toISOString() || null,
      showedInterest: interestedLeadIds.includes(leadId),
      returnDate: event?.startDate?.toISOString() || null,
    };
  });

  const data = {
    organization,
    generatedAt: new Date().toISOString(),
    period: {
      callStart: "2026-06-03",
      callEnd: "2026-06-15",
      returnStart: "2026-06-16",
      returnEnd: "2026-06-19",
    },
    metrics: {
      kanbanLeads: calledLeadIds.length,
      callActivities: callActivities.length,
      distinctCalledLeads: calledLeadIds.length,
      interestedLeads: interestedLeadIds.length,
      scheduledReturns: calendarEvents.length,
      distinctScheduledLeads: scheduledLeadIds.length,
      callCoveragePct: pct(calledLeadIds.length, calledLeadIds.length),
      interestRatePct: pct(interestedLeadIds.length, calledLeadIds.length),
      scheduleRatePct: pct(scheduledLeadIds.length, interestedLeadIds.length),
    },
    callsByDate: countByDay(callActivities, "createdAt"),
    returnsByDate: countByDay(calendarEvents, "startDate"),
    workedLeads,
    calendarEvents: calendarEvents.map((event) => ({
      id: event.id,
      leadId: event.leadId,
      startDate: event.startDate.toISOString(),
      status: event.status,
      user: event.user,
    })),
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(OUT_FILE);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
