import { describe, expect, it } from "vitest";
import { pathnameForLocale } from "./locale-path";

describe("locale paths", () => {
  it("prefixes English and leaves Swedish unprefixed", () => {
    expect(pathnameForLocale("/", "en")).toBe("/en");
    expect(pathnameForLocale("/mat", "en")).toBe("/en/mat");
    expect(pathnameForLocale("/en/mat", "sv")).toBe("/mat");
    expect(pathnameForLocale("/en", "sv")).toBe("/");
  });

  it("does not treat other words as the English prefix", () => {
    expect(pathnameForLocale("/entry", "sv")).toBe("/entry");
    expect(pathnameForLocale("/entry", "en")).toBe("/en/entry");
  });
});
