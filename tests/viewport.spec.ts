import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});

test("installed app keeps search and playlist focus at normal scale and blocks page zoom gestures", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    (window as any).YT = { Player: class {} };
  });
  await page.route("https://vibetubemobile.ipxer.online/api.php?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: catalog, suggestions: [], url: null }),
    }),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /maximum-scale=1, user-scalable=no/,
  );
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).touchAction,
    ),
  ).toBe("pan-x pan-y");
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  const search = page.getByRole("textbox", {
    name: "Search videos or paste a YouTube link",
  });
  await search.tap();
  await search.fill("music");
  expect(
    await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
  await page.getByRole("button", { name: "You", exact: true }).click();
  const playlist = page.getByRole("textbox", { name: "New playlist name" });
  await playlist.tap();
  expect(
    await playlist.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
  const gestures = await page.evaluate(() => {
    const dispatch = (name: string, touches?: number) => {
      const event = new Event(name, { bubbles: true, cancelable: true });
      if (touches !== undefined)
        Object.defineProperty(event, "touches", {
          value: Array(touches).fill({}),
        });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    };
    return {
      pinch: dispatch("gesturestart"),
      change: dispatch("gesturechange"),
      twoFingers: dispatch("touchmove", 2),
      scrolling: dispatch("touchmove", 1),
    };
  });
  expect(gestures).toEqual({
    pinch: true,
    change: true,
    twoFingers: true,
    scrolling: false,
  });
});

test("browser installation page retains its normal viewport", async ({
  page,
}) => {
  await page.goto("");
  await expect(page.locator(".install-card")).toBeVisible();
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    "content",
    /user-scalable=no/,
  );
  expect(
    await page.evaluate(() => {
      const event = new Event("gesturestart", {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
});
