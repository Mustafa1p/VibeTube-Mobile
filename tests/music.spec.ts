import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.use({ serviceWorkers: "block" });
async function openMusic(page: any) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Music", exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    const w = window as any;
    w.musicLoads = [];
    w.YT = {
      Player: class {
        options: any;
        id = "";
        constructor(_node: Element, options: any) {
          this.options = options;
          w.endMusic = () =>
            options.events.onStateChange({ data: 0, target: this });
          queueMicrotask(() => options.events.onReady());
        }
        loadVideoById(v: any) {
          this.id = v.videoId;
          w.musicLoads.push(v.videoId);
          this.playVideo();
        }
        playVideo() {
          this.options.events.onStateChange({ data: 1, target: this });
        }
        pauseVideo() {
          this.options.events.onStateChange({ data: 2, target: this });
        }
        getVideoData() {
          return { video_id: this.id };
        }
        unMute() {}
        destroy() {}
        getCurrentTime() {
          return 0;
        }
      },
    };
  });
  await page.route("https://vibetubemobile.ipxer.online/api.php?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: catalog, url: null, suggestions: [] }),
    }),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
});

test("add to music saves once, supports editable artists and persists after reload", async ({
  page,
}) => {
  const first = page.locator(".v-card").first();
  await first.getByRole("button", { name: /^Add to music:/ }).click();
  await first.getByRole("button", { name: /^Add to music:/ }).click();
  await openMusic(page);
  await expect(page.locator(".music-track")).toHaveCount(1);
  await expect(page.locator(".music-track-copy p")).toHaveText(
    catalog[0].channel,
  );
  await expect(page.locator(".music-art img")).toHaveAttribute(
    "src",
    /aqz-KE-bpKQ/,
  );
  await page.getByRole("button", { name: /^Options for/ }).click();
  await page.getByRole("button", { name: "Edit song details" }).click();
  await page
    .getByRole("textbox", { name: "Song title" })
    .fill("My saved track");
  await page
    .getByRole("textbox", { name: "Artist", exact: true })
    .fill("My artist");
  expect(
    await page
      .getByRole("textbox", { name: "Artist", exact: true })
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.getByRole("button", { name: "Save details" }).click();
  await page.reload();
  await expect(page.locator(".music-track h2")).toHaveText("My saved track");
  await expect(page.locator(".music-track-copy p")).toHaveText("My artist");
  await page
    .getByRole("button", { name: "Options for My saved track" })
    .click();
  await page.getByRole("button", { name: "Remove from music" }).click();
  await expect(page.locator(".music-track")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Find music", exact: true }),
  ).toBeVisible();
});

test("music rows play, pause, advance and preserve the standard player", async ({
  page,
}) => {
  await page
    .locator(".v-card")
    .nth(1)
    .getByRole("button", { name: /^Add to music:/ })
    .click();
  await page
    .locator(".v-card")
    .first()
    .getByRole("button", { name: /^Add to music:/ })
    .click();
  await openMusic(page);
  await page.getByRole("button", { name: "Play all", exact: true }).click();
  await expect(page.locator(".player.music-dock .youtube-host")).toBeVisible();
  await expect(
    page
      .locator(".music-track")
      .first()
      .getByRole("button", { name: /^Pause / }),
  ).toBeVisible();
  await page
    .locator(".music-track")
    .first()
    .getByRole("button", { name: /^Pause / })
    .click();
  await expect(
    page
      .locator(".music-track")
      .first()
      .getByRole("button", { name: /^Play / }),
  ).toBeVisible();
  await page
    .locator(".music-track")
    .first()
    .getByRole("button", { name: /^Play / })
    .click();
  await page.evaluate(() => (window as any).endMusic());
  await expect(
    page
      .locator(".music-track")
      .nth(1)
      .getByRole("button", { name: /^Pause / }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous track" }).click();
  await expect(page.locator(".music-track").first()).toHaveAttribute(
    "aria-current",
    "true",
  );
  for (const width of [320, 390, 430, 844]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await page.locator(".player video").count()).toBe(0);
  expect(await page.evaluate(() => (window as any).musicLoads)).toEqual([
    "aqz-KE-bpKQ",
    "eRsGyueVLvQ",
    "aqz-KE-bpKQ",
  ]);
});

test("watch page adds the active video to music", async ({ page }) => {
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await page
    .locator(".v-watch-actions")
    .getByRole("button", { name: "Add to music", exact: true })
    .click();
  await openMusic(page);
  await expect(page.locator(".music-track")).toHaveCount(1);
});
