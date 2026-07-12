import { describe, it, expect, vi } from "vitest";
import {
  escapeHtml,
  sanitizeStoredHtml,
  assertStrongPassword,
  getRefreshCookieName,
  getRefreshTokenFromRequest,
} from "../utils/security.js";

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    const result = escapeHtml("<script>alert('xss')</script>");
    expect(result).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
  });

  it("returns empty string for null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("passes through safe text", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("sanitizeStoredHtml", () => {
  it("removes script tags", () => {
    const result = sanitizeStoredHtml("<div><script>alert(1)</script></div>");
    expect(result).toBe("<div></div>");
  });

  it("removes event handlers", () => {
    const result = sanitizeStoredHtml('<button onclick="alert(1)">Click</button>');
    expect(result).toBe("<button>Click</button>");
  });

  it("removes javascript: protocol", () => {
    const result = sanitizeStoredHtml('<a href="javascript:alert(1)">Link</a>');
    expect(result).toBe('<a href="alert(1)">Link</a>');
  });

  it("passes through clean html", () => {
    const result = sanitizeStoredHtml("<p>Hello <strong>World</strong></p>");
    expect(result).toBe("<p>Hello <strong>World</strong></p>");
  });
});

describe("assertStrongPassword", () => {
  it("rejects short passwords", () => {
    const error = assertStrongPassword("Abc1");
    expect(error).toBe("A senha deve ter no mínimo 10 caracteres.");
  });

  it("rejects passwords without uppercase", () => {
    const error = assertStrongPassword("abcdefghij1");
    expect(error).toContain("maiúsculas");
  });

  it("rejects passwords without lowercase", () => {
    const error = assertStrongPassword("ABCDEFGHIJ1");
    expect(error).toContain("minúsculas");
  });

  it("rejects passwords without numbers", () => {
    const error = assertStrongPassword("AbcdefghijK");
    expect(error).toContain("números");
  });

  it("accepts valid passwords", () => {
    const error = assertStrongPassword("SenhaForte123!");
    expect(error).toBeNull();
  });

  it("rejects non-string input", () => {
    const error = assertStrongPassword(12345 as any);
    expect(error).toBe("A senha deve ter no mínimo 10 caracteres.");
  });
});

describe("getRefreshCookieName", () => {
  it("returns the cookie name", () => {
    expect(getRefreshCookieName()).toBe("nexus_refresh_token");
  });
});

describe("getRefreshTokenFromRequest", () => {
  it("extracts from body", () => {
    const req = { body: { refreshToken: "token-123" }, headers: {} } as any;
    expect(getRefreshTokenFromRequest(req)).toBe("token-123");
  });

  it("extracts from cookie when body not present", () => {
    const req = {
      body: {},
      headers: { cookie: "nexus_refresh_token=cookie-token-456" },
    } as any;
    expect(getRefreshTokenFromRequest(req)).toBe("cookie-token-456");
  });

  it("returns undefined when not found", () => {
    const req = { body: {}, headers: {} } as any;
    expect(getRefreshTokenFromRequest(req)).toBeUndefined();
  });
});
