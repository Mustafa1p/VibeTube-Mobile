import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/catalog.json", "utf8"));
test.use({ serviceWorkers: "block" });

test("channel photos and names open the owner's videos, retry, paginate and retain playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    (window as any).YT = {
      Player: class {
        constructor(_node: Element, options: any) {
          queueMicrotask(() => options.events.onReady());
        }
        mute() {}
        loadVideoById() {}
        playVideo() {}
        destroy() {}
      },
    };
  });
  let fail = true;
  const channelRequests: string[] = [];
  await page.route(
    "https://vibetubemobile.ipxer.online/api.php?**",
    (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") === "channel") {
        channelRequests.push(url.searchParams.get("video")!);
        if (fail) {
          fail = false;
          return route.fulfill({
            status: 502,
            contentType: "application/json",
            body: JSON.stringify({ error: "Temporary channel failure" }),
          });
        }
        const second = url.searchParams.get("page") === "2";
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                ...catalog[second ? 1 : 0],
                title: second
                  ? "Second channel upload"
                  : "First channel upload",
              },
            ],
            hasMore: !second,
          }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: catalog }),
      });
    },
  );
  await page.goto("");
  await page.getByRole("button", { name: "Agree & start watching" }).click();
  const first = page.locator(".v-card").first();
  const owner = catalog[0].channel;
  await first
    .getByRole("button", { name: `Open ${owner} channel`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: owner, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Temporary channel failure",
  );
  await page.getByRole("button", { name: "Retry channel" }).click();
  await expect(
    page.getByRole("button", { name: "Watch First channel upload" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More channel videos" }).click();
  await expect(page.locator(".v-card")).toHaveCount(2);
  expect(channelRequests.every((id) => id === catalog[0].id)).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: owner, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Watch First channel upload" })
    .click();
  await page
    .locator(".player")
    .evaluate((node) => node.setAttribute("data-retained", "true"));
  await page
    .locator(".v-meta")
    .getByRole("button", { name: `Open ${owner} channel photo` })
    .click();
  await expect(page.locator(".v-channel-heading")).toContainText(owner);
  await expect(page.locator('.player[data-retained="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator(".v-watch")).toBeVisible();
});
