import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "../middleware/errorHandler.js";

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => data);
  return res;
}

describe("errorHandler", () => {
  it("returns 500 for generic error", () => {
    const res = mockRes();
    errorHandler(new Error("Algo deu errado"), {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: "INTERNAL_ERROR" })
    );
  });

  it("returns custom status when set on error", () => {
    const res = mockRes();
    const err: any = new Error("Custom error");
    err.status = 418;
    errorHandler(err, {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(418);
  });

  it("handles Prisma P2002 (unique constraint)", () => {
    const res = mockRes();
    const err: any = new Error("Unique constraint failed");
    err.code = "P2002";
    err.meta = { target: ["email"] };
    errorHandler(err, {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_DUPLICATE_ENTRY" })
    );
  });

  it("handles Prisma P2000 (value too long)", () => {
    const res = mockRes();
    const err: any = new Error("Value too long");
    err.code = "P2000";
    errorHandler(err, {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_VALUE_TOO_LONG" })
    );
  });

  it("handles Prisma P2025 (not found)", () => {
    const res = mockRes();
    const err: any = new Error("Record not found");
    err.code = "P2025";
    errorHandler(err, {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_NOT_FOUND" })
    );
  });

  it("handles ValidationError by name", () => {
    const res = mockRes();
    const err: any = new Error("Validation failed");
    err.name = "ValidationError";
    err.details = { field: "email", message: "invalid" };
    errorHandler(err, {} as any, res, {} as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
