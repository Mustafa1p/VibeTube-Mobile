import { test, expect } from "@playwright/test";
import { normalizeSegments } from "../src/enhancements/sponsorBlock";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));

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
  expect(await page.locator(".v-card").count()).toBeGreaterThan(0);
  await expect(page.locator(".v-card").first()).toContainText("Search result");
  await page.screenshot({
    path: "docs/screenshots/live-search.png",
    fullPage: true,
  });
});

test("sponsor timestamps reject malformed and unsupported segments", () => {
  const entries = [
    { category: "sponsor", segment: [20, 25] },
    { category: "sponsor", actionType: "skip", segment: [0, 4] },
    { category: "intro", segment: [1, 2] },
    { category: "sponsor", segment: [-1, 5] },
    { category: "sponsor", segment: [5, 5] },
    { category: "sponsor", segment: [5, Infinity] },
    { category: "sponsor", segment: ["1", 5] },
    { category: "sponsor", actionType: "mute", segment: [1, 5] },
    null,
  ];
  expect(normalizeSegments(entries, ["sponsor"])).toEqual([
    { category: "sponsor", segment: [0, 4] },
    { category: "sponsor", segment: [20, 25] },
  ]);
  expect(normalizeSegments({}, ["sponsor"])).toEqual([]);
});

test("live search renders results and failed extraction recovers to embedded playback", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { get: () => true }),
  );
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    async (route) => {
      const u = new URL(route.request().url());
      const action = u.searchParams.get("action");
      await route.fulfill({
        status: action === "video" ? 502 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          action === "search"
            ? {
                items:
                  u.searchParams.get("q") === "popular videos"
                    ? catalog
                    : [
                        {
                          id: "WhWc3b3KhnY",
                          title: "Spring - Blender Open Movie",
                          channel: "Blender Studio",
                          category: "Videos",
                        },
                      ],
              }
            : action === "health"
              ? { runtime: true }
              : { error: "YouTube rejected this server." },
        ),
      });
    },
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  await page
    .getByRole("button", { name: "Search videos", exact: true })
    .click();
  await page.getByRole("textbox").fill("Blender open movie");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page.locator(".v-card")).toHaveCount(1);
  await expect(page.locator(".v-card")).toContainText(
    "Spring - Blender Open Movie",
  );
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Use experimental video player" })
    .check();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await expect(page.locator(".player-error")).toContainText(
    "YouTube rejected this server.",
  );
  await expect(page.locator(".player video")).toHaveCount(1);
  await expect(page.locator(".player iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Use experimental video player" })
    .uncheck();
  await page.screenshot({
    path: "docs/screenshots/playback-settings.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /^Watch Big Buck Bunny/ }).click();
  await expect(page.locator(".youtube-host")).toHaveCount(1);
  await expect(page.locator(".player video")).toHaveCount(0);
});
