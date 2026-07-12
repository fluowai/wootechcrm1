import { describe, it, expect } from "vitest";
import { sanitizeBody } from "../utils/sanitizer.js";

describe("sanitizeBody", () => {
  it("allows only lead fields for lead resource", () => {
    const result = sanitizeBody(
      { name: "João", email: "joao@teste.com", password: "secret", organizationId: "abc" },
      "lead"
    );
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("email");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("organizationId");
  });

  it("allows only client fields for client resource", () => {
    const result = sanitizeBody(
      { corporateName: "Empresa X", cnpj: "12345678000190", id: "abc-123" },
      "client"
    );
    expect(result).toHaveProperty("corporateName");
    expect(result).toHaveProperty("cnpj");
    expect(result).not.toHaveProperty("id");
  });

  it("allows only opportunity fields for opportunity resource", () => {
    const result = sanitizeBody(
      { title: "Venda", value: 5000, createdAt: "2024-01-01", organizationId: "abc" },
      "opportunity"
    );
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("value");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("organizationId");
  });

  it("allows only task fields for task resource", () => {
    const result = sanitizeBody(
      { title: "Tarefa 1", status: "pendente", updatedAt: "2024-01-01", agencyId: "abc" },
      "task"
    );
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("status");
    expect(result).not.toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("agencyId");
  });

  it("allows only proposal fields for proposal resource", () => {
    const result = sanitizeBody(
      { title: "Proposta", content: { items: [] }, deletedAt: "2024-01-01" },
      "proposal"
    );
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
    expect(result).not.toHaveProperty("deletedAt");
  });

  it("allows only automation fields for automation resource", () => {
    const result = sanitizeBody(
      { name: "Automação", triggerType: "form_submission", organizationId: "abc" },
      "automation"
    );
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("triggerType");
    expect(result).not.toHaveProperty("organizationId");
  });

  it("allows only user fields for user resource", () => {
    const result = sanitizeBody(
      { name: "Admin", email: "admin@teste.com", role: "SUPER_ADMIN", organizationId: "abc" },
      "user"
    );
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("role");
    expect(result).not.toHaveProperty("organizationId");
  });

  it("removes forbidden fields when no whitelist exists", () => {
    const result = sanitizeBody(
      { name: "Teste", id: "abc", organizationId: "org-1", createdAt: "now" },
      "unknown"
    );
    expect(result).toHaveProperty("name");
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("createdAt");
  });

  it("returns empty object for empty body", () => {
    const result = sanitizeBody({}, "lead");
    expect(result).toEqual({});
  });
});
