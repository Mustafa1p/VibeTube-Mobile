import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4175/VibeTube-Mobile/",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175/VibeTube-Mobile/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
