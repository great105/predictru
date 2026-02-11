import { test, expect } from "@playwright/test";

test.describe("Trade Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          ready: () => {},
          expand: () => {},
          initData: "test-init-data",
          initDataUnsafe: { user: { id: 123456789 } },
          themeParams: {},
          colorScheme: "light",
          MainButton: {
            text: "",
            isVisible: false,
            isActive: false,
            show: () => {},
            hide: () => {},
            enable: () => {},
            disable: () => {},
            setText: () => {},
            onClick: () => {},
            offClick: () => {},
            showProgress: () => {},
            hideProgress: () => {},
          },
          BackButton: {
            isVisible: false,
            show: () => {},
            hide: () => {},
            onClick: () => {},
            offClick: () => {},
          },
          HapticFeedback: {
            impactOccurred: () => {},
            notificationOccurred: () => {},
            selectionChanged: () => {},
          },
          openTelegramLink: () => {},
        },
      };
    });
  });

  test("should display home page with markets", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=PredictRu")).toBeVisible();
  });

  test("should navigate to market page", async ({ page }) => {
    await page.goto("/");

    // Wait for markets to load
    const marketCard = page.locator("[href^='/market/']").first();
    if (await marketCard.isVisible()) {
      await marketCard.click();
      await expect(page.locator("text=Price History")).toBeVisible();
    }
  });

  test("should navigate to portfolio", async ({ page }) => {
    await page.goto("/portfolio");
    await expect(page.locator("text=Your Balance")).toBeVisible();
  });

  test("should navigate to leaderboard", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.locator("text=Leaderboard")).toBeVisible();
  });

  test("should navigate to profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("text=Referral Code")).toBeVisible();
  });
});
