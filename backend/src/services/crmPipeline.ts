import { PrismaClient, Pipeline, PipelineStage } from "@prisma/client";

const DEFAULT_SALES_STAGES = [
  { name: "Lead recebido", order: 0, probability: 10, isDefault: true, color: "#6366F1" },
  { name: "Qualificacao", order: 1, probability: 25, isDefault: false, color: "#0EA5E9" },
  { name: "Diagnostico", order: 2, probability: 45, isDefault: false, color: "#F59E0B" },
  { name: "Proposta", order: 3, probability: 65, isDefault: false, color: "#8B5CF6" },
  { name: "Negociacao", order: 4, probability: 80, isDefault: false, color: "#EC4899" },
  { name: "Fechado", order: 5, probability: 100, isDefault: false, color: "#10B981" },
];

type PipelineWithStages = Pipeline & { stages: PipelineStage[] };

export async function ensureDefaultSalesPipeline(
  prisma: PrismaClient,
  organizationId: string,
  preferredPipelineId?: string | null,
): Promise<PipelineWithStages> {
  const requestedPipeline = preferredPipelineId
    ? await prisma.pipeline.findFirst({
        where: { id: preferredPipelineId, organizationId },
        include: { stages: { orderBy: { order: "asc" } } },
      })
    : null;

  let pipeline =
    requestedPipeline ||
    (await prisma.pipeline.findFirst({
      where: { organizationId, type: "SALES", isActive: true },
      orderBy: { createdAt: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    })) ||
    (await prisma.pipeline.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    }));

  if (!pipeline) {
    return prisma.pipeline.create({
      data: {
        name: "Funil de Vendas",
        description: "Pipeline padrao criado automaticamente para receber leads captados.",
        type: "SALES",
        organizationId,
        stages: { create: DEFAULT_SALES_STAGES },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  }

  if (pipeline.stages.length === 0) {
    const pipelineId = pipeline.id;
    await prisma.pipelineStage.createMany({
      data: DEFAULT_SALES_STAGES.map((stage) => ({
        ...stage,
        pipelineId,
      })),
    });

    pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { stages: { orderBy: { order: "asc" } } },
    }) as PipelineWithStages;
  }

  return pipeline;
}

export function getInitialSalesStage(pipeline: PipelineWithStages) {
  return pipeline.stages.find((stage) => stage.isDefault) || pipeline.stages[0];
}
