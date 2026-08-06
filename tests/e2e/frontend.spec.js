import { expect, test } from "@playwright/test";

const routes = [
  ["/", "Points cannot substitute for return."],
  ["/demo/", "Prepared proof path — no wallet required"],
  ["/campaign/", "Frozen campaign configuration"],
  ["/progress/", "Wallet-bound progress"],
  ["/reward/", "Fixed reward settlement"],
  ["/architecture/", "Native CPI and settlement blueprint"],
  ["/evidence/", "Reproducible evidence"],
];

test.describe("BuilderLoop mechanical-manga frontend", () => {
  for (const [route, heading] of routes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText("DEMO FIXTURE — NOT LIVE")).toBeVisible();
    });
  }

  test("communicates the locked early-Ship path without signing", async ({ page }) => {
    await page.goto("/demo/?scenario=shipped");
    await page.getByRole("button", { name: "Early Ship rejection" }).click();

    await expect(page).toHaveURL(/scenario=early-ship/);
    await expect(page.getByText(/Ship rejected because the 120-second elapsed-time gate/)).toBeVisible();
    await expect(page.getByText(/Fixture controls do not sign, submit, or claim/)).toBeVisible();
  });

  test("keeps the CTA keyboard focusable and the sound control operable", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "OPEN JUDGE DEMO" });
    await cta.focus();
    await expect(cta).toBeFocused();

    const sound = page.getByRole("button", { name: /Toggle sound/ });
    await sound.click();
    await expect(sound).toHaveText("SOUND: OFF");
    await sound.click();
    await expect(sound).toHaveText("SOUND: ON");
  });

  test("avoids horizontal overflow at the 390px breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const width = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));

    expect(width.document).toBeLessThanOrEqual(width.viewport);
    await expect(page.getByRole("heading", { name: "Points cannot substitute for return." })).toBeVisible();
  });
});
