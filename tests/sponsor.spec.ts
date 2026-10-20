import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    const w = window as any;
    w.sb = { time: 12, duration: 150, state: 1, id: "aqz-KE-bpKQ", seeks: [] };
    w.YT = {
      Player: class {
        constructor(_node: Element, options: any) {
          queueMicrotask(() => options.events.onReady());
        }
        loadVideoById(v: any) {
          w.sb.id = v.videoId;
        }
        unMute() {}
        playVideo() {}
        destroy() {}
        getVideoData() {
          return { video_id: w.sb.id };
        }
        getPlayerState() {
          return w.sb.state;
        }
        getDuration() {
          return w.sb.duration;
        }
        getCurrentTime() {
          return w.sb.time;
        }
        seekTo(time: number) {
          w.sb.seeks.push(time);
          w.sb.time = time;
        }
      },
    };
  });
  await page.route("https://vibetubemobile.ipxer.online/api.php?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: catalog }),
    }),
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
});

test("SponsorBlock is opt-in, validates timestamps and skips/undoes only matching playing content", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("https://sponsor.ajay.app/api/skipSegments/**", (route) => {
    requests.push(route.request().url());
    const segment = (start: number, end: number, category = "sponsor") => ({
      segment: [start, end],
      category,
      actionType: "skip",
      videoDuration: 100,
    });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        { videoID: "other-video", segments: [segment(0, 90)] },
        {
          videoID: "aqz-KE-bpKQ",
          segments: [
            segment(10, 20),
            segment(18, 30),
            segment(-1, 90),
            segment(12, 90, "intro"),
            segment(12, 120),
          ],
        },
      ]),
    });
  });
  expect(requests).toHaveLength(0);
  const checkbox = page.getByRole("checkbox", {
    name: "Skip sponsors",
    exact: true,
  });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(page.locator(".sponsor-feedback")).toContainText(
    "Sponsor skipping ready",
  );
  const url = new URL(requests[0]);
  expect(url.pathname).toMatch(/^\/api\/skipSegments\/[a-f0-9]{4}$/);
  expect(requests[0]).not.toContain("aqz-KE-bpKQ");
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
  await page.evaluate(() => {
    (window as any).sb.duration = 100;
    (window as any).sb.state = 2;
  });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
  await page.evaluate(() => {
    (window as any).sb.state = -1;
  });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
  await page.evaluate(() => {
    (window as any).sb.state = 1;
    (window as any).sb.id = "wrong-video";
  });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
  await page.evaluate(() => {
    (window as any).sb.id = "aqz-KE-bpKQ";
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).sb.seeks))
    .toEqual([30]);
  await page.getByRole("button", { name: "Undo skip" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).sb.seeks))
    .toEqual([30, 10]);
  await page.evaluate(() => {
    (window as any).sb.time = 25;
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([30, 10]);
  await page.reload();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.evaluate(() => {
    (window as any).sb.time = 12;
    (window as any).sb.duration = 100;
  });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
});

test("SponsorBlock handles missing data and outages without interrupting playback", async ({
  page,
}) => {
  let fail = true;
  await page.route("https://sponsor.ajay.app/api/skipSegments/**", (route) =>
    route.fulfill({ status: fail ? 503 : 404, body: "" }),
  );
  await page
    .getByRole("checkbox", { name: "Skip sponsors", exact: true })
    .check();
  await expect(page.locator(".sponsor-feedback")).toContainText(
    "Playback continues normally",
  );
  await expect(page.locator(".player")).toBeVisible();
  fail = false;
  await page
    .locator(".sponsor-controls")
    .getByRole("button", { name: "Retry" })
    .click();
  await expect(page.locator(".sponsor-feedback")).toContainText(
    "No sponsor segments reported",
  );
  expect(await page.evaluate(() => (window as any).sb.seeks)).toEqual([]);
});
