import { expect, test } from "@playwright/test";

const routes = [
  ["/", "Loyalty should move at the speed of the product."],
  ["/demo/", /Live Heartbeat Loyalty proof|Heartbeat Devnet evidence pending|Heartbeat Loyalty fixture — not live/],
  ["/campaign/", /Fixed project heartbeat policy|Frozen campaign configuration/],
  ["/progress/", /Project Heartbeat|Wallet-bound loyalty state/],
  ["/reward/", /Loyalty-gated fixed SPL reward|Fixed reward settlement/],
  ["/architecture/", "Heartbeat loyalty architecture"],
  ["/evidence/", "Reproducible evidence"],
];

test.describe("BuilderLoop mechanical-manga frontend", () => {
  for (const [route, heading] of routes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText("LIVE DEVNET")).toBeVisible();
    });
  }

test("never represents an unavailable loyalty fixture as live", async ({ page }) => {
  await page.goto("/demo/");
  const links = page.getByRole("link", { name: "VIEW TX" });
  if (await links.count()) {
    await expect(links.first()).toHaveAttribute("href", /cluster=devnet/);
  } else {
    await expect(page.getByText("DEMO FIXTURE — NOT LIVE")).toBeVisible();
  }
  });

  test("keeps the CTA keyboard focusable and the sound control operable", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "OPEN HEARTBEAT DEMO" });
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
    await expect(page.getByRole("heading", { name: "Loyalty should move at the speed of the product." })).toBeVisible();
  });
});
