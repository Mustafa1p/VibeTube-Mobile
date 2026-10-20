import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.beforeEach(async ({ page }) => {
  await page.route("https://vibetubemobile.ipxer.online/api.php?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: catalog, suggestions: [] }),
    }),
  );
});
async function installed(page: any) {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", {
      get: () => true,
      configurable: true,
    }),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await expect(page.locator(".v-card")).toHaveCount(7);
}
test("browser shows installation guide without launcher or sign-in buttons", async ({
  page,
}) => {
  await page.goto("");
  await expect(page.locator(".install-card")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sign in on YouTube", exact: true }),
  ).toHaveCount(0);
  await page.goto("#install-android");
  await expect(
    page.getByRole("button", { name: "Android", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Android", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("installed feed opens in-app player, saves locally and preserves player through navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await installed(page);
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await expect(page.locator(".player.expanded")).toBeVisible();
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:4175");
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Watch later", exact: true }).click();
  await page.getByRole("button", { name: "Minimize player" }).click();
  await expect(page.locator(".player.mini")).toBeVisible();
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: /Saved videos/ }).click();
  await expect(page.locator(".v-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Expand player" }).click();
  await page.reload();
  await expect(page.locator(".player.expanded")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("search accepts a YouTube link without leaving app", async ({ page }) => {
  await installed(page);
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  await page.getByRole("textbox").fill("https://youtu.be/M7lc1UVf-VE");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page.locator(".player.expanded")).toBeVisible();
  await expect(page.locator(".v-watch h1")).toContainText("YouTube Developers");
  expect(page.url()).toContain("127.0.0.1:4175/VibeTube-Mobile/");
  await page.getByRole("button", { name: "About and settings" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Full YouTube account sign-in is not available",
  );
  await page.keyboard.press("Escape");
});
test("offline shell and subpath assets resolve", async ({
  page,
  context,
  request,
}) => {
  await installed(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const m = await (await request.get("manifest.webmanifest")).json();
  expect(m.scope).toBe("/VibeTube-Mobile/");
  for (const i of m.icons)
    expect((await request.get(i.src)).status()).toBe(200);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".v-card")).toHaveCount(7);
  await expect(page.locator(".network-note")).toContainText("You're offline");
  await context.setOffline(false);
});
test("responsive player feed screenshots and no overflow", async ({ page }) => {
  await installed(page);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("img").evaluateAll(async (ns: HTMLImageElement[]) => {
    for (const n of ns) n.loading = "eager";
    await Promise.race([
      Promise.all(
        ns.map((n) =>
          n.complete
            ? Promise.resolve()
            : new Promise((r) => {
                n.onload = r;
                n.onerror = r;
              }),
        ),
      ),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  });
  await page.screenshot({ path: "docs/screenshots/in-app-home.png" });
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await page.screenshot({ path: "docs/screenshots/in-app-watch.png" });
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: "Close player" }).click();
  await page.screenshot({ path: "docs/screenshots/in-app-library.png" });
});
test("waiting update is gated while player is open", async ({ page }) => {
  await installed(page);
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const s = readFileSync("dist/sw.js", "utf8");
  try {
    writeFileSync(
      "dist/sw.js",
      s.replace(/shell-[a-f0-9]+/, "shell-test-release"),
    );
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r?.update();
    });
    await page.getByRole("button", { name: "Update now" }).click();
    await expect(page.locator(".notice")).toContainText("Close the player");
    await page.getByRole("button", { name: "Close player" }).click();
    await page.getByRole("button", { name: "Update now" }).click();
    await expect
      .poll(() => page.evaluate(async () => await caches.keys()))
      .toContain("vibetube-mobile-shell-test-release");
  } finally {
    writeFileSync("dist/sw.js", s);
  }
});
test("real playback advances inside app without a redirect", async ({
  page,
}) => {
  test.skip(
    process.env.VIBETUBE_REAL_MEDIA !== "1",
    "External provider check enabled explicitly",
  );
  test.setTimeout(60000);
  await installed(page);
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await expect(page.locator(".youtube-host iframe")).toBeVisible({
    timeout: 20000,
  });
  const frame = page.frameLocator(".youtube-host iframe");
  await expect
    .poll(
      () =>
        frame.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      { timeout: 20000 },
    )
    .toBeGreaterThan(1);
  await page.screenshot({ path: "docs/screenshots/in-app-playing.png" });
  const origin = new URL(page.url()).origin;
  expect(origin).toBe("http://127.0.0.1:4175");
  const element = await page.locator(".youtube-host iframe").elementHandle();
  await page.getByRole("button", { name: "You", exact: true }).click();
  await expect(page.locator(".player.mini")).toBeVisible();
  expect(await element?.evaluate((n) => n.isConnected)).toBe(true);
  await expect
    .poll(
      () =>
        frame.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      { timeout: 5000 },
    )
    .toBeGreaterThan(2);
});
