import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test("update popup fits mobile screens, supports Escape and applies with feedback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { get: () => true });
    localStorage.setItem("vibetube:/VibeTube-Mobile/video-consent", "true");
    localStorage.setItem("vibetube:/VibeTube-Mobile/music", "[]");
    const serviceWorker = new EventTarget();
    Object.assign(serviceWorker, {
      controller: {},
      register: async () => ({
        waiting: {
          postMessage: (message: string) => {
            (window as any).updateMessage = message;
          },
        },
        addEventListener: () => {},
        update: async () => {},
      }),
    });
    Object.defineProperty(navigator, "serviceWorker", { value: serviceWorker });
  });
  await page.goto("");
  const popup = page.getByRole("dialog", {
    name: "A playback update is ready",
  });
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await expect(popup).toBeVisible();
    const box = (await popup.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - size.height / 2)).toBeLessThan(2);
    expect(box.height).toBeLessThanOrEqual(size.height);
  }
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await page.reload();
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "Update now" }).click();
  await expect(
    page.getByRole("dialog", { name: "Updating VibeTube…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Updating…", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => (window as any).updateMessage))
    .toBe("ACTIVATE");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("vibetube:/VibeTube-Mobile/music"),
    ),
  ).toBe("[]");
});
