import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { escapeHtml, sanitizeStoredHtml, assertStrongPassword, verifyHmacSignature } from "../utils/security.js";

describe("XSS Protection", () => {
  describe("escapeHtml", () => {
    it("escapes all dangerous characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
    });

    it("escapes double quotes", () => {
      expect(escapeHtml('onClick="alert(1)"')).toBe("onClick=&quot;alert(1)&quot;");
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("a&b")).toBe("a&amp;b");
    });

    it("handles null safely", () => {
      expect(escapeHtml(null)).toBe("");
    });

    it("handles undefined safely", () => {
      expect(escapeHtml(undefined)).toBe("");
    });

    it("handles numbers", () => {
      expect(escapeHtml(42)).toBe("42");
    });

    it("passes through safe text", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });
  });

  describe("sanitizeStoredHtml", () => {
    it("removes script tags", () => {
      expect(sanitizeStoredHtml("<div><script>alert(1)</script></div>")).toBe("<div></div>");
    });

    it("removes event handlers", () => {
      expect(sanitizeStoredHtml('<button onclick="alert(1)">Click</button>')).toBe("<button>Click</button>");
    });

    it("removes onerror handler", () => {
      expect(sanitizeStoredHtml('<img src=x onerror="alert(1)">')).toBe("<img src=x>");
    });

    it("removes javascript: protocol", () => {
      expect(sanitizeStoredHtml('<a href="javascript:alert(1)">Link</a>')).toBe('<a href="alert(1)">Link</a>');
    });

    it("passes through clean html", () => {
      expect(sanitizeStoredHtml("<p>Hello <strong>World</strong></p>")).toBe("<p>Hello <strong>World</strong></p>");
    });

    it("removes multiple event handlers", () => {
      const html = '<div onmouseover="steal()" onclick="hack()" onfocus="pwn()">content</div>';
      const result = sanitizeStoredHtml(html);
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onfocus");
      expect(result).toContain("content");
    });
  });
});

describe("Password Security", () => {
  describe("assertStrongPassword", () => {
    it("rejects short passwords", () => {
      expect(assertStrongPassword("Abc1")).toBe("A senha deve ter no mínimo 10 caracteres.");
    });

    it("rejects passwords without uppercase", () => {
      expect(assertStrongPassword("abcdefghij1")).toContain("maiúsculas");
    });

    it("rejects passwords without lowercase", () => {
      expect(assertStrongPassword("ABCDEFGHIJ1")).toContain("minúsculas");
    });

    it("rejects passwords without numbers", () => {
      expect(assertStrongPassword("AbcdefghijK")).toContain("números");
    });

    it("accepts valid passwords", () => {
      expect(assertStrongPassword("SenhaForte123!")).toBeNull();
    });

    it("rejects non-string input", () => {
      expect(assertStrongPassword(12345 as any)).toBe("A senha deve ter no mínimo 10 caracteres.");
    });

    it("rejects empty string", () => {
      expect(assertStrongPassword("")).toBe("A senha deve ter no mínimo 10 caracteres.");
    });
  });
});

describe("HMAC Signature Verification", () => {
  it("verifies valid signature", () => {
    const payload = '{"event":"test"}';
    const secret = "webhook-secret-123";
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyHmacSignature(payload, `sha256=${signature}`, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyHmacSignature('{"event":"test"}', "invalid-signature", "secret")).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyHmacSignature('{"event":"test"}', undefined, "secret")).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyHmacSignature('{"event":"test"}', "", "secret")).toBe(false);
  });
});
