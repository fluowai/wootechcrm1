/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { enforceAccountState } from "../middleware/accountState.js";

function response() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function prismaWith(subscriptionStatus = "ACTIVE", userStatus = "ACTIVE") {
  return {
    user: { findUnique: vi.fn().mockResolvedValue({ status: userStatus, role: "USER", organizationId: "org-1", permissions: { crm: ["view"] }, accessProfile: null }) },
    organization: { findUnique: vi.fn().mockResolvedValue({ isActive: true, subscriptionStatus, trialEndsAt: null }) },
  } as any;
}

describe("enforceAccountState", () => {
  it("allows an active account", async () => {
    const req: any = { method: "GET", user: { id: "user-1", orgId: "org-1" } };
    const next = vi.fn();
    await enforceAccountState(prismaWith())(req, response(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user.permissions).toEqual({ crm: ["view"] });
  });

  it("blocks suspended users", async () => {
    const res = response();
    await enforceAccountState(prismaWith("ACTIVE", "SUSPENDED"))({ method: "GET", user: { id: "user-1", orgId: "org-1" } } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("blocks expired subscriptions", async () => {
    const res = response();
    await enforceAccountState(prismaWith("EXPIRED"))({ method: "GET", user: { id: "user-1", orgId: "org-1" } } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it("keeps overdue accounts read-only", async () => {
    const res = response();
    await enforceAccountState(prismaWith("PAST_DUE"))({ method: "POST", user: { id: "user-1", orgId: "org-1" } } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "SUBSCRIPTION_READ_ONLY" }));
  });

  it("rejects a tenant mismatch", async () => {
    const res = response();
    await enforceAccountState(prismaWith())({ method: "GET", user: { id: "user-1", orgId: "org-2" } } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
