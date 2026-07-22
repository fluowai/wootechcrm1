import { describe, it, expect } from "vitest";
import { assertSafeExternalUrl, safeExternalFetch } from "../utils/externalUrl.js";

const resolvesTo = (...addresses: string[]) => async () =>
  addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

describe("SSRF Protection - Comprehensive", () => {
  describe("assertSafeExternalUrl", () => {
    it("allows public HTTPS destinations", async () => {
      const url = await assertSafeExternalUrl("https://example.com/hook", resolvesTo("93.184.216.34"));
      expect(url.hostname).toBe("example.com");
    });

    it("allows public HTTP destinations", async () => {
      const url = await assertSafeExternalUrl("http://example.com/hook", resolvesTo("93.184.216.34"));
      expect(url.hostname).toBe("example.com");
    });

    describe("blocks private IPs", () => {
      it.each([
        "http://127.0.0.1/admin",
        "http://10.0.0.1/",
        "http://169.254.169.254/latest",
        "http://192.168.1.10/",
        "http://172.16.0.1/",
        "http://0.0.0.0/",
        "http://224.0.0.1/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[::ffff:10.0.0.1]/",
      ])("blocks %s", async (value) => {
        await expect(assertSafeExternalUrl(value)).rejects.toThrow("NOT_ALLOWED");
      });
    });

    describe("blocks dangerous patterns", () => {
      it("blocks credentials in URL", async () => {
        await expect(
          assertSafeExternalUrl("https://user:pass@example.com", resolvesTo("93.184.216.34"))
        ).rejects.toThrow("CREDENTIALS");
      });

      it("blocks file:// protocol", async () => {
        await expect(assertSafeExternalUrl("file:///etc/passwd")).rejects.toThrow("PROTOCOL");
      });

      it("blocks ftp:// protocol", async () => {
        await expect(assertSafeExternalUrl("ftp://example.com")).rejects.toThrow("PROTOCOL");
      });

      it("blocks javascript: protocol", async () => {
        await expect(assertSafeExternalUrl("javascript:alert(1)")).rejects.toThrow("PROTOCOL");
      });

      it("blocks localhost", async () => {
        await expect(assertSafeExternalUrl("http://localhost/")).rejects.toThrow("NOT_ALLOWED");
      });

      it("blocks *.localhost subdomains", async () => {
        await expect(assertSafeExternalUrl("http://evil.localhost/")).rejects.toThrow("NOT_ALLOWED");
      });

      it("blocks *.local domains", async () => {
        await expect(assertSafeExternalUrl("http://printer.local/")).rejects.toThrow("NOT_ALLOWED");
      });
    });

    describe("blocks DNS rebinding", () => {
      it("blocks when any resolved IP is private", async () => {
        await expect(
          assertSafeExternalUrl("https://rebinding.example", resolvesTo("93.184.216.34", "127.0.0.1"))
        ).rejects.toThrow("NOT_ALLOWED");
      });

      it("blocks when all resolved IPs are private", async () => {
        await expect(
          assertSafeExternalUrl("https://internal.example", resolvesTo("172.16.1.5"))
        ).rejects.toThrow("NOT_ALLOWED");
      });
    });

    describe("blocks cloud metadata", () => {
      it("blocks AWS metadata endpoint", async () => {
        await expect(
          assertSafeExternalUrl("http://169.254.169.254/latest/meta-data/")
        ).rejects.toThrow("NOT_ALLOWED");
      });

      it("blocks GCP metadata endpoint", async () => {
        await expect(
          assertSafeExternalUrl("http://metadata.google.internal/computeMetadata/v1/")
        ).rejects.toThrow();
      });
    });
  });
});
