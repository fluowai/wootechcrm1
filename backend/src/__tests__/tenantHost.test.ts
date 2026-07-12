import { describe, it, expect } from "vitest";
import { normalizeRequestHost } from "../utils/tenantHost.js";

describe("normalizeRequestHost", () => {
  it("extracts hostname from host with port", () => {
    expect(normalizeRequestHost("localhost:3000")).toBe("localhost");
  });

  it("extracts hostname from x-forwarded-host", () => {
    expect(normalizeRequestHost("nexus360.consultio.com.br:443")).toBe("nexus360.consultio.com.br");
  });

  it("returns hostname without port", () => {
    expect(normalizeRequestHost("app.nexus360.com.br")).toBe("app.nexus360.com.br");
  });

  it("handles null safely", () => {
    expect(normalizeRequestHost(null as any)).toBe("");
  });

  it("handles undefined safely", () => {
    expect(normalizeRequestHost(undefined as any)).toBe("");
  });

  it("handles empty string", () => {
    expect(normalizeRequestHost("")).toBe("");
  });
});
