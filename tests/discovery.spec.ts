import { test, expect } from "@playwright/test";
// Keep deterministic API fixtures outside the service worker's network path.
test.use({ serviceWorkers: "block" });
const entries = (page: number, channel = "Music Studio") =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `vid${String((page - 1) * 20 + i).padStart(8, "0")}`,
    title: `Music song ${(page - 1) * 20 + i}`,
    channel,
    category: "Music",
  }));

test("music feed, keyboard suggestions, pagination and compact recommendations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    (window as any).__playRequests = [];
    (window as any).YT = {
      Player: class {
        constructor(_node: Element, options: any) {
          queueMicrotask(() => options.events.onReady());
        }
        loadVideoById(v: any) {
          (window as any).__playRequests.push(v.videoId);
        }
        destroy() {}
        pauseVideo() {}
        getCurrentTime() {
          return 0;
        }
      },
    };
  });
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    (route) => {
      const u = new URL(route.request().url());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          u.searchParams.get("action") === "suggest"
            ? { suggestions: ["music mix", "music videos"] }
            : {
                items: entries(Number(u.searchParams.get("page") || 1)),
                hasMore: u.searchParams.get("page") !== "2",
              },
        ),
      });
    },
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await expect(page.locator(".v-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Music", exact: true }).click();
  await expect(page.locator(".v-card")).toHaveCount(20);
  await page
    .getByRole("button", { name: "Load more videos", exact: true })
    .click();
  await expect(page.locator(".v-card")).toHaveCount(40);
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  await page.getByRole("textbox").fill("mus");
  await expect(
    page.getByRole("button", { name: "music mix", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox").press("ArrowDown");
  await expect(
    page.getByRole("button", { name: "music mix", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".v-card")).toHaveCount(20);
  await expect(page.locator(".v-suggestions ul")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Watch Music song 0", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__playRequests))
    .toContain("vid00000000");
  await expect(page.locator(".v-related .v-card")).toHaveCount(19);
  const thumbnail = await page
    .locator(".v-related .v-thumbnail")
    .first()
    .boundingBox();
  expect(thumbnail!.width).toBeLessThan(200);
  await page.screenshot({
    path: "test-results/compact-recommendations.png",
    fullPage: true,
  });
});

test("search errors remain visible and retry succeeds without clearing the query", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { get: () => true }),
  );
  let fail = true;
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    (route) => {
      const u = new URL(route.request().url());
      const broken = u.searchParams.get("q") === "songs" && fail;
      return route.fulfill({
        status: broken ? 502 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          broken
            ? { error: "Search is temporarily unavailable." }
            : { items: entries(1), hasMore: false, suggestions: [] },
        ),
      });
    },
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  await page.getByRole("textbox").fill("songs");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Search is temporarily unavailable.",
  );
  fail = false;
  await page.getByRole("button", { name: "Retry loading videos" }).click();
  await expect(page.locator(".v-card")).toHaveCount(20);
  await expect(page.getByRole("textbox")).toHaveValue("songs");
});
