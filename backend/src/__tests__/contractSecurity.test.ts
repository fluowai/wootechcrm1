import { describe, it, expect } from "vitest";
import { generateContractHtml } from "../services/contractGenerator.js";

describe("Contract Generator Security", () => {
  const baseTemplate = `
    <h1>Contrato</h1>
    <p>Contratante: {{contratante_nome}}</p>
    <p>CNPJ: {{contratante_cnpj}}</p>
    <p>Valor: {{valor_mensal}}</p>
  `;

  it("escapes HTML in template variables", () => {
    const data = {
      contratante_nome: '<script>alert("xss")</script>',
      contratante_cnpj: "12.345.678/0001-90",
      valor_mensal: "R$ 1.000,00",
    };

    const html = generateContractHtml(baseTemplate, data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes quotes in template variables", () => {
    const data = {
      contratante_nome: 'Company "Evil" & Sons',
      contratante_cnpj: "12.345.678/0001-90",
      valor_mensal: "R$ 1.000,00",
    };

    const html = generateContractHtml(baseTemplate, data);
    expect(html).toContain("&amp; Sons");
    expect(html).not.toContain("<script>");
  });

  it("removes event handlers from template", () => {
    const template = '<div onclick="hack()">{{contratante_nome}}</div>';
    const data = { contratante_nome: "Safe Name" };

    const html = generateContractHtml(template, data);
    expect(html).not.toContain("onclick");
    expect(html).toContain("Safe Name");
  });

  it("allows safe HTML tags", () => {
    const template = "<p>{{contratante_nome}}</p><strong>{{valor_mensal}}</strong>";
    const data = { contratante_nome: "Empresa Teste", valor_mensal: "R$ 5.000" };

    const html = generateContractHtml(template, data);
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>");
  });

  it("strips dangerous tags like iframe and object", () => {
    const template = '<div>{{contratante_nome}}</div><iframe src="evil.com"></iframe><object data="evil.swf"></object>';
    const data = { contratante_nome: "Safe" };

    const html = generateContractHtml(template, data);
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<object");
  });

  it("handles null/undefined values gracefully", () => {
    const data = {
      contratante_nome: null,
      contratante_cnpj: undefined,
      valor_mensal: "",
    };

    expect(() => generateContractHtml(baseTemplate, data)).not.toThrow();
  });
});
