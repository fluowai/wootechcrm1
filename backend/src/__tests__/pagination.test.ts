import { describe, it, expect } from "vitest";
import { getPagination } from "../utils/pagination.js";

describe("getPagination", () => {
  it("returns default pagination with no query", () => {
    const result = getPagination({});
    expect(result).toEqual({ skip: 0, take: 20 });
  });

  it("throws on null query (not handled by function)", () => {
    expect(() => getPagination(null)).toThrow();
  });

  it("computes skip correctly for page 2", () => {
    const result = getPagination({ page: "2" });
    expect(result.skip).toBe(20);
    expect(result.take).toBe(20);
  });

  it("uses custom pageSize", () => {
    const result = getPagination({ page: "1", pageSize: "50" });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it("caps pageSize at 100", () => {
    const result = getPagination({ page: "1", pageSize: "500" });
    expect(result.take).toBe(100);
  });

  it("handles string page number", () => {
    const result = getPagination({ page: "3" });
    expect(result.skip).toBe(40);
    expect(result.take).toBe(20);
  });

  it("falls back gracefully for invalid page", () => {
    const result = getPagination({ page: "abc" });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("falls back gracefully for invalid pageSize", () => {
    const result = getPagination({ pageSize: "abc" });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("works with page 1 and pageSize 10", () => {
    const result = getPagination({ page: "1", pageSize: "10" });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
  });
});
