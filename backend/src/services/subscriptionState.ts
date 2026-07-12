import { PrismaClient } from "@prisma/client";

type OrganizationSubscriptionFields = {
  id: string;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
};

export function effectiveSubscriptionStatus(org?: OrganizationSubscriptionFields | null) {
  if (!org) return "TRIAL";
  if (org.subscriptionStatus === "TRIAL" && org.trialEndsAt && org.trialEndsAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  return org.subscriptionStatus || "TRIAL";
}

export async function refreshOrganizationSubscriptionState<T extends OrganizationSubscriptionFields>(
  prisma: PrismaClient,
  organization?: T | null,
): Promise<T | null | undefined> {
  if (!organization) return organization;
  const status = effectiveSubscriptionStatus(organization);
  if (status !== organization.subscriptionStatus) {
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: organization.id },
        data: { subscriptionStatus: status },
      }),
      prisma.saaSSubscription.updateMany({
        where: {
          organizationId: organization.id,
          status: "TRIAL",
          trialEndsAt: organization.trialEndsAt ? { lt: new Date() } : undefined,
        },
        data: {
          status,
          endDate: new Date(),
          currentPeriodEnd: organization.trialEndsAt || new Date(),
        },
      }),
    ]);

    return { ...organization, subscriptionStatus: status };
  }
  return organization;
}
