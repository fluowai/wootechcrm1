import { describe, it, expect, vi, Mock } from "vitest";
import { errorHandler, AppError } from "../middleware/errorHandler.js";
import { Request, Response, NextFunction } from "express";

function mockRes(): Response & { statusCode?: number; status: Mock; json: Mock } {
  const res = { statusCode: 200 } as unknown as Response & { statusCode?: number; status: Mock; json: Mock };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; }) as unknown as Mock;
  res.json = vi.fn((data: unknown) => data) as unknown as Mock;
  return res;
}

describe("errorHandler", () => {
  it("returns 500 for generic error", () => {
    const res = mockRes();
    errorHandler(new Error("Algo deu errado") as AppError, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: "INTERNAL_ERROR" })
    );
  });

  it("returns custom status when set on error", () => {
    const res = mockRes();
    const err = new Error("Custom error") as AppError;
    err.status = 418;
    errorHandler(err, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(418);
  });

  it("handles Prisma P2002 (unique constraint)", () => {
    const res = mockRes();
    const err = new Error("Unique constraint failed") as AppError & { meta?: { target?: unknown } };
    err.code = "P2002";
    err.meta = { target: ["email"] };
    errorHandler(err, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_DUPLICATE_ENTRY" })
    );
  });

  it("handles Prisma P2000 (value too long)", () => {
    const res = mockRes();
    const err = new Error("Value too long") as AppError;
    err.code = "P2000";
    errorHandler(err, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_VALUE_TOO_LONG" })
    );
  });

  it("handles Prisma P2025 (not found)", () => {
    const res = mockRes();
    const err = new Error("Record not found") as AppError;
    err.code = "P2025";
    errorHandler(err, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "DB_NOT_FOUND" })
    );
  });

  it("handles ValidationError by name", () => {
    const res = mockRes();
    const err = new Error("Validation failed") as AppError;
    err.name = "ValidationError";
    err.details = { field: "email", message: "invalid" };
    errorHandler(err, {} as Request, res as Response, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
