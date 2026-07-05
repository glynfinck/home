import { describe, expect, it } from "vitest";

import {
  SETTINGS_KEYS,
  profileSettingsSchema,
  seoSettingsSchema,
  socialLinksSchema,
} from "@/lib/settings";

describe("profileSettingsSchema", () => {
  it("fills defaults for a completely empty object", () => {
    const parsed = profileSettingsSchema.parse({});
    expect(parsed.name).toBe("Glyn Finck");
    expect(parsed.headline).toBe("");
    expect(parsed.about).toBe("");
    expect(parsed.resume_url).toBe("");
  });

  it("keeps provided values", () => {
    const parsed = profileSettingsSchema.parse({
      name: "Ada",
      email: "ada@example.com",
    });
    expect(parsed.name).toBe("Ada");
    expect(parsed.email).toBe("ada@example.com");
  });
});

describe("socialLinksSchema", () => {
  it("defaults to an empty array", () => {
    expect(socialLinksSchema.parse(undefined)).toEqual([]);
  });

  it("parses links and treats icon as optional", () => {
    const parsed = socialLinksSchema.parse([
      { label: "GitHub", url: "https://github.com/x", icon: "github" },
      { label: "Email", url: "mailto:x@y.z" },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].icon).toBeUndefined();
  });

  it("rejects a link missing required fields", () => {
    expect(() => socialLinksSchema.parse([{ label: "x" }])).toThrow();
  });
});

describe("seoSettingsSchema", () => {
  it("provides the title template default", () => {
    expect(seoSettingsSchema.parse({}).title_template).toBe("%s · glyn.dev");
  });
});

describe("SETTINGS_KEYS", () => {
  it("maps each settings key to its schema", () => {
    expect(Object.keys(SETTINGS_KEYS).sort()).toEqual([
      "profile",
      "seo",
      "social_links",
    ]);
    expect(SETTINGS_KEYS.profile).toBe(profileSettingsSchema);
  });
});
