import { expect, it } from "vitest";
import { formattingLocale } from "./formatting";

it("formats Swedish as sv-SE and leaves English as en", () => {
  expect(formattingLocale("sv")).toBe("sv-SE");
  expect(formattingLocale("en")).toBe("en");
});
