import { describe, expect, it } from "vitest";
import { waLink } from "./lib/whatsapp.js";

describe("waLink", () => {
  it("prefixes 10-digit numbers with 91 (T-9)", () => {
    const link = waLink("098765 43210", "Hello there");
    expect(link).toBe("https://wa.me/919876543210?text=Hello%20there");
  });

  it("keeps 12-digit numbers starting with 91", () => {
    expect(waLink("+91 98220 12345", "hi")).toBe(
      "https://wa.me/919822012345?text=hi"
    );
  });

  it("strips leading zeros and non-digits", () => {
    expect(waLink("09822012345", "x")).toBe("https://wa.me/919822012345?text=x");
  });

  it("returns null for unusable numbers", () => {
    expect(waLink("12345", "x")).toBeNull();
    expect(waLink("", "x")).toBeNull();
    expect(waLink(null, "x")).toBeNull();
    expect(waLink("1234567890123", "x")).toBeNull();
  });

  it("url-encodes the message", () => {
    expect(waLink("9822012345", "Hello & welcome?")).toContain(
      "text=Hello%20%26%20welcome%3F"
    );
  });
});
