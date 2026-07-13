import { describe, expect, it } from "vitest";
import { generateContractHtml } from "../services/contractGenerator.js";

describe("generateContractHtml", () => {
  it("escapes variable values and removes executable markup", () => {
    const result = generateContractHtml(
      '<section><h1>{{ name }}</h1><script>alert(1)</script><a href="javascript:alert(2)" onclick="alert(3)">link</a></section>',
      { name: '<img src=x onerror="alert(4)">' },
    );
    expect(result).not.toContain("<script");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });
});
