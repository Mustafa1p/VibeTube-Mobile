import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
async function standalone(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", {
      get: () => true,
      configurable: true,
    });
  });
}
test("browser visits show installation only and device deep links work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Give it a place on your Home Screen." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("iframe,video,input[type=password]")).toHaveCount(
    0,
  );
  await page.goto("#install-android");
  await expect(
    page.getByRole("button", { name: "Android", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Open this page in Chrome")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Android", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
test("installed launch and account handoff use only official YouTube", async ({
  page,
}) => {
  await standalone(page);
  await page.route("https://m.youtube.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<title>YouTube navigation boundary</title>",
    }),
  );
  await page.route("https://www.youtube.com/signin**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<title>Official sign-in navigation boundary</title>",
    }),
  );
  await page.goto("");
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".install-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Open YouTube", exact: true }).click();
  await expect(page).toHaveURL("https://m.youtube.com/");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Sign in on YouTube", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Sign in on YouTube", exact: true })
    .click();
  await expect(page).toHaveURL("https://www.youtube.com/signin?next=%2F");
});
test("offline app shell survives reload and disables network launch", async ({
  page,
  context,
}) => {
  await standalone(page);
  await page.goto("");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("You're offline");
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toBeEnabled();
});
test("Android install prompt honors dismissal and never unlocks browser mode", async ({
  page,
}) => {
  await page.goto("#install-android");
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(e, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(e);
  });
  await page
    .getByRole("button", { name: "Install on Android", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Installation dismissed",
  );
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByRole("status")).toContainText(
    "Open VibeTube from your Home Screen",
  );
  await expect(
    page.getByRole("button", { name: "Open YouTube", exact: true }),
  ).toHaveCount(0);
});
test("manifest and every icon resolve under repository subpath", async ({
  request,
  page,
}) => {
  const m = await (await request.get("manifest.webmanifest")).json();
  expect(m.id).toBe("/VibeTube-Mobile/");
  expect(m.scope).toBe("/VibeTube-Mobile/");
  expect(m.start_url).toBe("/VibeTube-Mobile/");
  expect(m.display).toBe("standalone");
  for (const i of m.icons) {
    const r = await request.get(i.src);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("");
  const assets = await page
    .locator("script[src],link[href]")
    .evaluateAll((ns) =>
      ns.map((n) => n.getAttribute("src") || n.getAttribute("href")),
    );
  expect(assets.every((a) => a?.startsWith("/VibeTube-Mobile/"))).toBe(true);
});
test("accessible privacy dialog and no external requests before handoff", async ({
  page,
}) => {
  const outside: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4175/")) outside.push(r.url());
  });
  await page.goto("");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("no account database");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Privacy", exact: true }),
  ).toBeFocused();
  expect(outside).toEqual([]);
});
test("screenshots and responsive overflow across mobile and landscape", async ({
  page,
}) => {
  await page.goto("");
  await page.screenshot({
    path: "docs/screenshots/install-iphone.png",
    fullPage: true,
  });
  await page.goto("#install-android");
  await page.screenshot({
    path: "docs/screenshots/install-android.png",
    fullPage: true,
  });
  for (const size of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/install-${size.width}.png`,
      fullPage: true,
    });
  }
  await standalone(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.screenshot({
    path: "docs/screenshots/installed-launcher.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "How it works", exact: true }).click();
  await page.screenshot({ path: "docs/screenshots/how-it-works.png" });
  await expect(page.getByRole("dialog")).toContainText(
    "may leave the standalone window",
  );
});
test("waiting service worker update activates on request", async ({ page }) => {
  await page.goto("");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const source = readFileSync("dist/sw.js", "utf8");
  try {
    writeFileSync(
      "dist/sw.js",
      source.replace(/shell-[a-f0-9]+/, "shell-test-release"),
    );
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r?.update();
    });
    await expect(page.getByRole("button", { name: "Update now" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Update now" }).click();
    await expect
      .poll(() => page.evaluate(async () => await caches.keys()))
      .toContain("vibetube-mobile-shell-test-release");
    await expect(page.locator(".install-card")).toBeVisible();
  } finally {
    writeFileSync("dist/sw.js", source);
  }
});
