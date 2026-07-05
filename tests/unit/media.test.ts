import { describe, expect, it } from "vitest";

import { altFromFileName, mediaPathFromPublicUrl } from "@/lib/media";

describe("altFromFileName", () => {
  it("drops the extension and humanizes separators", () => {
    expect(altFromFileName("loss-curve.png")).toBe("loss curve");
    expect(altFromFileName("training_run_2.jpg")).toBe("training run 2");
  });

  it("strips a leading upload timestamp", () => {
    // uploadToMediaBucket prefixes names with `${Date.now()}-`.
    expect(altFromFileName("1719800000000-loss-curve.png")).toBe("loss curve");
  });

  it("removes stray quotes", () => {
    expect(altFromFileName('my "chart".png')).toBe("my chart");
  });
});

describe("mediaPathFromPublicUrl", () => {
  const base =
    "https://x.supabase.co/storage/v1/object/public/media/uploads/loss-curve.png";

  it("extracts the object path inside the media bucket", () => {
    expect(mediaPathFromPublicUrl(base)).toBe("uploads/loss-curve.png");
  });

  it("strips query strings and decodes escapes", () => {
    const url =
      "https://x.supabase.co/storage/v1/object/public/media/a%20b/c.png?download=c.png";
    expect(mediaPathFromPublicUrl(url)).toBe("a b/c.png");
  });

  it("returns null for a URL outside the media bucket", () => {
    expect(mediaPathFromPublicUrl("https://example.com/other.png")).toBeNull();
  });
});
