import { expect, test } from "@playwright/test";
import en from "../messages/en.json";
import sv from "../messages/sv.json";

test("home asks you to sign in, in Swedish", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/logga-in$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "sv-SE");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    sv.Auth.title,
  );
  await expect(page.getByText(sv.Auth.tagline)).toBeVisible();
  await expect(page.getByLabel(sv.Auth.email)).toBeVisible();
  await expect(page.getByLabel(sv.Auth.password)).toBeVisible();
  await expect(
    page.getByRole("button", { name: sv.Auth.signIn, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: sv.Auth.switchToSignUp }).click();
  await expect(
    page.getByRole("button", { name: sv.Auth.signUp, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(sv.Auth.passwordHint)).toBeVisible();
});

test("English is available at /en", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/logga-in$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.Auth.title,
  );
  await expect(page.getByText(en.Auth.tagline)).toBeVisible();
});

test("app pages send signed-out visitors to login", async ({ page }) => {
  await page.goto("/installningar");
  await expect(page).toHaveURL(/\/logga-in$/);
  await expect(page.getByLabel(sv.Auth.email)).toBeVisible();
});

test("an unknown path shows the Swedish not-found page", async ({ page }) => {
  await page.goto("/finns-inte");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    sv.NotFound.title,
  );
  await expect(
    page.getByRole("link", { name: sv.NotFound.home }),
  ).toBeVisible();
});

test("the component gallery shows light and dark", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/dev/components");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    sv.Dev.title,
  );
  await expect(page.getByRole("region", { name: sv.Dev.light })).toBeVisible();
  await expect(page.getByRole("region", { name: sv.Dev.dark })).toBeVisible();
  const light = page.getByRole("region", { name: sv.Dev.light });
  await expect(
    light.getByRole("button", { name: sv.Dev.log, exact: true }),
  ).toBeVisible();
  await light.getByRole("button", { name: sv.Dev.increase }).click();
  await expect(light.getByText("82,5")).toBeVisible();
  await light.getByRole("button", { name: sv.Dev.openSheet }).click();
  await expect(light.getByRole("dialog", { name: sv.Dev.add })).toBeVisible();
  expect(errors).toEqual([]);
});

test("an unknown English path stays in English", async ({ page }) => {
  await page.goto("/en/finns-inte");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.NotFound.title,
  );
});
