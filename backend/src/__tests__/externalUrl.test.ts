import { describe, expect, it } from "vitest";
import { assertSafeExternalUrl } from "../utils/externalUrl.js";

const resolvesTo = (...addresses: string[]) => async () => addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

describe("assertSafeExternalUrl", () => {
  it("allows a public HTTPS destination", async () => {
    const url = await assertSafeExternalUrl("https://example.com/hook", resolvesTo("93.184.216.34"));
    expect(url.hostname).toBe("example.com");
  });

  it.each(["http://127.0.0.1/admin", "http://10.0.0.1/", "http://169.254.169.254/latest", "http://192.168.1.10/", "http://[::1]/"])(
    "blocks private literal %s", async (value) => { await expect(assertSafeExternalUrl(value)).rejects.toThrow("NOT_ALLOWED"); },
  );

  it("blocks private and mixed DNS answers", async () => {
    await expect(assertSafeExternalUrl("https://internal.example", resolvesTo("172.16.1.5"))).rejects.toThrow("NOT_ALLOWED");
    await expect(assertSafeExternalUrl("https://rebinding.example", resolvesTo("93.184.216.34", "127.0.0.1"))).rejects.toThrow("NOT_ALLOWED");
  });

  it("blocks credentials and non-http protocols", async () => {
    await expect(assertSafeExternalUrl("https://user:pass@example.com", resolvesTo("93.184.216.34"))).rejects.toThrow("CREDENTIALS");
    await expect(assertSafeExternalUrl("file:///etc/passwd")).rejects.toThrow("PROTOCOL");
  });
});
