import { afterEach, describe, expect, it, vi } from "vitest";

// Force the "configured" path so the test is self-contained (no reliance on
// .env.local being present), letting it run anywhere including early in CI.
vi.mock("@/lib/supabase/public", () => ({ supabaseConfigured: true }));

import { safeRead } from "@/lib/data/util";

// safeRead wraps public reads so a transient failure serves `fallback`
// instead of hard-crashing a page/build. These cover the reachable branches.

afterEach(() => vi.restoreAllMocks());

describe("safeRead", () => {
  it("returns the run() result on success", async () => {
    const result = await safeRead("posts", async () => [1, 2, 3], []);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns the fallback and warns when run() throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await safeRead(
      "posts",
      async () => {
        throw new Error("boom");
      },
      ["fallback"],
    );
    expect(result).toEqual(["fallback"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("posts");
  });
});
