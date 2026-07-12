import { describe, expect, it } from "vitest";
import { normalizeClientPayload } from "../routes/clients.js";

describe("normalizeClientPayload", () => {
  it("converts empty document fields to null before client creation", () => {
    const payload = normalizeClientPayload({
      corporateName: "Cliente Teste",
      email: " contato@teste.com ",
      cnpj: "",
      cpf: "   ",
      responsibleCpf: "",
    });

    expect(payload).toMatchObject({
      corporateName: "Cliente Teste",
      email: "contato@teste.com",
      cnpj: null,
      cpf: null,
      responsibleCpf: null,
    });
  });

  it("stores formatted CNPJ/CPF using digits only", () => {
    const payload = normalizeClientPayload({
      corporateName: "Cliente Teste",
      email: "contato@teste.com",
      cnpj: "12.345.678/0001-90",
      cpf: "123.456.789-09",
    });

    expect(payload.cnpj).toBe("12345678000190");
    expect(payload.cpf).toBe("12345678909");
  });

  it("keeps an empty client email compatible with the required database column", () => {
    const payload = normalizeClientPayload({
      corporateName: "Cliente sem e-mail",
      email: "   ",
    });

    expect(payload.email).toBe("");
  });
});
