import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import sv from "../../messages/sv.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const requiredSwedishKeys = [
  "Metadata.title",
  "Metadata.description",
  "Auth.title",
  "Auth.tagline",
  "Auth.email",
  "Shell.today",
  "Shell.settings",
  "Onboarding.save",
  "NotFound.title",
  "NotFound.body",
  "NotFound.home",
];

describe("message catalogs", () => {
  it("includes the strings the shell renders, in Swedish", () => {
    const swedish = new Set(leafKeys(sv));
    const missing = requiredSwedishKeys.filter((key) => !swedish.has(key));
    expect(missing).toEqual([]);
  });

  it("does not let English introduce keys that Swedish lacks", () => {
    const swedish = new Set(leafKeys(sv));
    const missing = leafKeys(en).filter((key) => !swedish.has(key));
    expect(missing).toEqual([]);
  });
});
