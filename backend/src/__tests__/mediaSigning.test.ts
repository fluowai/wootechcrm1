import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signMediaUrl, verifyMediaUrl } from "../utils/security.js";

describe("Media URL Signing", () => {
  const ORIGINAL_ENV = process.env.MEDIA_SIGN_SECRET;

  beforeEach(() => {
    process.env.MEDIA_SIGN_SECRET = "test-secret-key-for-media-signing-min-32-chars";
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.MEDIA_SIGN_SECRET = ORIGINAL_ENV;
    } else {
      delete process.env.MEDIA_SIGN_SECRET;
    }
  });

  it("creates a signed URL that verifies successfully", () => {
    const url = "https://example.com/media/image.jpg";
    const signed = signMediaUrl(url, 3600);

    const result = verifyMediaUrl(signed);
    expect(result.valid).toBe(true);
    expect(result.url).toBe(url);
    expect(result.reason).toBeUndefined();
  });

  it("rejects expired signed URLs", () => {
    const url = "https://example.com/media/image.jpg";
    const signed = signMediaUrl(url, -1);

    const result = verifyMediaUrl(signed);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("EXPIRED");
  });

  it("rejects tampered signed URLs", () => {
    const url = "https://example.com/media/image.jpg";
    const signed = signMediaUrl(url, 3600);
    const tampered = signed.replace(/sig=([a-f0-9]+)/, "sig=0000000000000000000000000000000000000000000000000000000000000000");

    const result = verifyMediaUrl(tampered);
    expect(result.valid).toBe(false);
  });

  it("rejects URLs with missing parameters", () => {
    const result = verifyMediaUrl("some-random-string");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("MISSING_PARAMS");
  });

  it("returns NO_SECRET when MEDIA_SIGN_SECRET is not set", () => {
    delete process.env.MEDIA_SIGN_SECRET;

    expect(() => signMediaUrl("https://example.com")).toThrow("MEDIA_SIGN_SECRET");
  });

  it("preserves the original URL through base64url encoding", () => {
    const url = "https://example.com/media/file with spaces.jpg?token=abc&expires=123";
    const signed = signMediaUrl(url, 3600);
    const result = verifyMediaUrl(signed);

    expect(result.url).toBe(url);
  });

  it("uses JWT_SECRET as fallback when MEDIA_SIGN_SECRET is not set", () => {
    delete process.env.MEDIA_SIGN_SECRET;
    process.env.JWT_SECRET = "jwt-fallback-secret-key-for-testing-32chars";

    const url = "https://example.com/media/test.png";
    const signed = signMediaUrl(url, 3600);
    const result = verifyMediaUrl(signed);

    expect(result.valid).toBe(true);
    expect(result.url).toBe(url);
  });
});
