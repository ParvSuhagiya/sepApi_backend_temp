import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, outreach, search } from "./api.js";

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  };
}

describe("api.js", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("maps the backend error envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, { error: { code: "unauthorized", message: "no", request_id: "r1" } })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(search({ skills: "x", city: "Pune" })).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
      requestId: "r1",
    });
    try {
      await search({ skills: "x", city: "Pune" });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toMatch(/access code/i);
    }
  });

  it("uses Retry-After for 429 messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          429,
          { error: { code: "rate_limited", message: "slow", request_id: "r2" } },
          { "Retry-After": "120" }
        )
      )
    );
    try {
      await search({ skills: "x", city: "Pune" });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toMatch(/120 seconds/);
      expect(err.retryAfter).toBe(120);
    }
  });

  it("retries once on 502 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(502, { error: { code: "x", message: "y", request_id: "r" } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(search({ skills: "x", city: "Pune" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("down"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(search({ skills: "x", city: "Pune" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a friendly message for 500 without raw text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(500, { error: { code: "internal", message: "db exploded", request_id: "r" } }))
    );
    try {
      await outreach({ skills: "x" }, { name: "S" });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("We couldn't finish this search. Please try again in a minute.");
    }
  });
});
