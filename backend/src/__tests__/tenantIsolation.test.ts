import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTenant, withTenant, belongsToTenant } from "../middleware/tenant.js";

function mockReq(overrides: Record<string, any> = {}) {
  return {
    user: { orgId: "org-1", role: "ADMIN", agencyId: undefined, workspaceId: undefined },
    headers: {},
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Multi-Tenant Isolation", () => {
  describe("resolveTenant middleware", () => {
    it("sets orgId and tenantFilter on request when user has orgId", () => {
      const req = mockReq({ user: { orgId: "org-abc", role: "ADMIN" } });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).orgId).toBe("org-abc");
      expect((req as any).tenantFilter).toEqual({ organizationId: "org-abc" });
    });

    it("blocks request when user has no orgId", () => {
      const req = mockReq({ user: { orgId: undefined, role: "ADMIN" } });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "TENANT_MISSING" })
      );
    });

    it("blocks request when user is null", () => {
      const req = mockReq({ user: null });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("allows SUPER_ADMIN to impersonate org via X-Org-Id header", () => {
      const req = mockReq({
        user: { orgId: "org-admin", role: "SUPER_ADMIN" },
        headers: { "x-org-id": "org-target" },
      });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).orgId).toBe("org-target");
      expect(req.user.orgId).toBe("org-target");
      expect((req as any).tenantFilter).toEqual({ organizationId: "org-target" });
    });

    it("ignores X-Org-Id header for non-SUPER_ADMIN users", () => {
      const req = mockReq({
        user: { orgId: "org-regular", role: "ADMIN" },
        headers: { "x-org-id": "org-target" },
      });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect((req as any).orgId).toBe("org-regular");
    });

    it("includes agencyId in tenantFilter when present", () => {
      const req = mockReq({
        user: { orgId: "org-1", role: "ADMIN", agencyId: "agency-xyz" },
      });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect((req as any).tenantFilter).toEqual({
        organizationId: "org-1",
        agencyId: "agency-xyz",
      });
    });

    it("includes workspaceId in tenantFilter when present", () => {
      const req = mockReq({
        user: { orgId: "org-1", role: "ADMIN", workspaceId: "ws-abc" },
      });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect((req as any).tenantFilter).toEqual({
        organizationId: "org-1",
        workspaceId: "ws-abc",
      });
    });

    it("allows SUPER_ADMIN to impersonate workspace via X-Workspace-Id header", () => {
      const req = mockReq({
        user: { orgId: "org-1", role: "SUPER_ADMIN", workspaceId: undefined },
        headers: { "x-workspace-id": "ws-impersonated" },
      });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect(req.user.workspaceId).toBe("ws-impersonated");
      expect((req as any).tenantFilter).toEqual({
        organizationId: "org-1",
        workspaceId: "ws-impersonated",
      });
    });
  });

  describe("withTenant query helper", () => {
    it("injects organizationId into query where clause", () => {
      const req = mockReq({ user: { orgId: "org-abc" } });
      const query = { where: { status: "active" }, include: { contacts: true } };

      const result = withTenant(query, req);

      expect(result.where).toEqual({ status: "active", organizationId: "org-abc" });
      expect(result.include).toEqual({ contacts: true });
    });

    it("preserves existing organizationId if already set", () => {
      const req = mockReq({ user: { orgId: "org-abc" } });
      const query = { where: { organizationId: "org-overridden", status: "active" } };

      const result = withTenant(query, req);

      expect(result.where.organizationId).toBe("org-abc");
    });

    it("throws when orgId is missing", () => {
      const req = mockReq({ user: { orgId: undefined } });

      expect(() => withTenant({}, req)).toThrow("TENANT_CONTEXT_MISSING");
    });
  });

  describe("belongsToTenant utility", () => {
    it("returns true when resource belongs to user's tenant", () => {
      const req = mockReq({ user: { orgId: "org-1" } });
      const resource = { organizationId: "org-1", name: "Test" };

      expect(belongsToTenant(resource, req)).toBe(true);
    });

    it("returns false when resource belongs to different tenant", () => {
      const req = mockReq({ user: { orgId: "org-1" } });
      const resource = { organizationId: "org-2", name: "Other" };

      expect(belongsToTenant(resource, req)).toBe(false);
    });

    it("returns false when resource is null", () => {
      const req = mockReq({ user: { orgId: "org-1" } });

      expect(belongsToTenant(null, req)).toBe(false);
    });

    it("returns false when orgId is missing", () => {
      const req = mockReq({ user: { orgId: undefined } });
      const resource = { organizationId: "org-1" };

      expect(belongsToTenant(resource, req)).toBe(false);
    });

    it("returns false when resource has no organizationId", () => {
      const req = mockReq({ user: { orgId: "org-1" } });
      const resource = { name: "No org" };

      expect(belongsToTenant(resource, req)).toBe(false);
    });
  });

  describe("Cross-tenant data isolation scenarios", () => {
    it("tenant filter prevents cross-tenant queries when applied", () => {
      const tenantOrgA = { user: { orgId: "org-A" } };
      const tenantOrgB = { user: { orgId: "org-B" } };

      const baseQuery = { where: { isActive: true } };

      const queryA = withTenant(baseQuery, mockReq(tenantOrgA));
      const queryB = withTenant(baseQuery, mockReq(tenantOrgB));

      expect(queryA.where.organizationId).toBe("org-A");
      expect(queryB.where.organizationId).toBe("org-B");
      expect(queryA.where.organizationId).not.toBe(queryB.where.organizationId);
    });

    it("tenant filter is correctly propagated through request lifecycle", () => {
      const req = mockReq({ user: { orgId: "org-xyz", role: "USER" } });
      const res = mockRes();
      const next = vi.fn();

      resolveTenant(req, res, next);

      expect((req as any).tenantFilter.organizationId).toBe("org-xyz");
      expect((req as any).orgId).toBe("org-xyz");

      const query = withTenant({ where: {} }, req);
      expect(query.where.organizationId).toBe("org-xyz");
    });
  });
});
