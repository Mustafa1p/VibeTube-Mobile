import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.use({ serviceWorkers: "block" });

test("real hosting search returns videos through browser CORS", async ({
  page,
}) => {
  test.skip(
    process.env.VIBETUBE_REAL_BACKEND !== "1",
    "Opt-in external hosting check",
  );
  test.setTimeout(60000);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { get: () => true }),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  await page.getByRole("textbox").fill("Blender open movie");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page.locator(".v-card").first()).toBeVisible({ timeout: 45000 });
  await expect(page.locator(".v-card").first()).toContainText("Search result");
});

test("standard player starts muted, unmutes in one tap and preserves sound on selection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    localStorage.setItem(
      "vibetube:/VibeTube-Mobile/experimental-media",
      "true",
    );
    const w = window as any;
    w.calls = [];
    w.YT = {
      Player: class {
        constructor(_node: Element, options: any) {
          w.blockPlayback = () => options.events.onAutoplayBlocked();
          queueMicrotask(() => options.events.onReady());
        }
        loadVideoById(v: any) {
          w.calls.push(`load:${v.videoId}`);
        }
        mute() {
          w.calls.push("mute");
        }
        unMute() {
          w.calls.push("unmute");
        }
        playVideo() {
          w.calls.push("play");
        }
        destroy() {}
        getCurrentTime() {
          return 0;
        }
      },
    };
  });
  const mediaRequests: string[] = [];
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    (route) => {
      const action = new URL(route.request().url()).searchParams.get("action");
      if (["video", "media"].includes(action || ""))
        mediaRequests.push(action!);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: catalog, url: null }),
      });
    },
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).calls))
    .toContain("load:aqz-KE-bpKQ");
  await expect(
    page.getByRole("button", { name: "Unmute video" }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls[0])).toBe("mute");
  await page.evaluate(() => {
    (window as any).blockPlayback();
    (window as any).blockPlayback();
  });
  expect(
    await page.evaluate(
      () => (window as any).calls.filter((v: string) => v === "mute").length,
    ),
  ).toBe(2);
  await expect(
    page.getByText("Your browser requires a tap to start this video."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play video", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Unmute video" }).click();
  await page.getByRole("button", { name: /^Watch Sintel/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).calls))
    .toContain("load:eRsGyueVLvQ");
  expect(
    await page.evaluate(
      () => (window as any).calls.filter((v: string) => v === "unmute").length,
    ),
  ).toBe(1);
  expect(mediaRequests).toEqual([]);
  await expect(page.locator(".player video")).toHaveCount(0);
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /experimental/i }),
  ).toHaveCount(0);
});

test("channel profile images load and failed images keep an initials fallback", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { get: () => true }),
  );
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    (route) => {
      const u = new URL(route.request().url());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          u.searchParams.get("action") === "avatar"
            ? {
                url:
                  u.searchParams.get("video") === "aqz-KE-bpKQ"
                    ? "https://yt3.googleusercontent.com/profile.svg"
                    : "https://yt3.googleusercontent.com/broken.svg",
              }
            : { items: catalog },
        ),
      });
    },
  );
  await page.route("https://yt3.googleusercontent.com/**", (route) =>
    route.fulfill(
      route.request().url().endsWith("broken.svg")
        ? { status: 404, body: "" }
        : {
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="blue"/></svg>',
          },
    ),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  const first = page.locator(".v-card").first().locator(".v-avatar img");
  await expect(first).toBeVisible();
  await expect
    .poll(() => first.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.locator(".v-card").nth(1).scrollIntoViewIfNeeded();
  await expect(
    page.locator(".v-card").nth(1).locator(".v-avatar span"),
  ).toHaveText("B");
});
