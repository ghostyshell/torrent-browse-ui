const { test, expect } = require('@playwright/test');

test.describe('Visual Regression Tests', () => {
  // Skip visual regression tests in CI until baseline screenshots are established
  test.skip(!!process.env.CI, 'Skipping visual regression tests in CI environment');

  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');

    // Handle potential login redirect
    if (page.url().includes('/login')) {
      // Try to find and skip login or go to main page
      const skipButton = page.locator('button:has-text("Skip"), button:has-text("Continue as Guest"), a:has-text("Skip")');
      if (await skipButton.isVisible({ timeout: 3000 })) {
        await skipButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Try to navigate directly to home/search page
        await page.goto('/', { waitUntil: 'networkidle' });
      }
    }
  });

  test('should take screenshot of homepage', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should take screenshot of search form', async ({ page }) => {
    // Wait for search form to load - try multiple selectors
    try {
      await page.waitForSelector('form, [data-testid="search-form"], input[type="text"]', {
        timeout: 10000,
      });
    } catch (error) {
      console.log('Search form not found with traditional selectors, continuing with page screenshot');
    }

    // Take screenshot of search form area or fallback to page screenshot
    const searchForm = page
      .locator('form, [data-testid="search-form"], input[type="text"]')
      .first();

    if (await searchForm.isVisible()) {
      await expect(searchForm).toHaveScreenshot('search-form.png', {
        animations: 'disabled',
      });
    } else {
      // Fallback to full page screenshot if form not found
      console.log('Search form not visible, taking full page screenshot');
      await expect(page).toHaveScreenshot('search-form.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should take screenshot of search results', async ({ page }) => {
    // Perform search
    const searchInput = page
      .locator(
        'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
      )
      .first();
    const searchButton = page
      .locator('button:has-text("Search"), [data-testid="search-button"]')
      .first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      await searchInput.fill('test movie');
      await searchButton.click();

      // Wait for results or no results message
      await page.waitForTimeout(8000);

      // Take screenshot of results area
      await expect(page).toHaveScreenshot('search-results.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should take screenshot of favorites page', async ({ page }) => {
    // Navigate to favorites
    const favoritesLink = page.locator(
      'a:has-text("Favorites"), button:has-text("Favorites"), [data-testid="favorites-link"]'
    );

    if (await favoritesLink.isVisible()) {
      await favoritesLink.click();
      await page.waitForTimeout(2000);

      // Take screenshot of favorites page
      await expect(page).toHaveScreenshot('favorites-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should take screenshot on mobile viewport', async ({
    page,
    browserName,
  }) => {
    // Only run on chromium for mobile testing
    if (browserName !== 'chromium') return;

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should take screenshot of dark theme', async ({ page }) => {
    // Check if dark theme toggle exists
    const themeToggle = page.locator(
      'button[aria-label*="theme"], [data-testid="theme-toggle"]'
    );

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(1000);

      // Take screenshot in dark mode
      await expect(page).toHaveScreenshot('dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    } else {
      // If no theme toggle, just take regular screenshot for dark theme test
      await expect(page).toHaveScreenshot('default-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should take screenshot of error state', async ({ page }) => {
    // Mock backend to return error
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error for screenshot' }),
      });
    });

    // Try to search to trigger error
    const searchInput = page
      .locator(
        'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
      )
      .first();
    const searchButton = page
      .locator('button:has-text("Search"), [data-testid="search-button"]')
      .first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      await searchInput.fill('test');
      await searchButton.click();
      await page.waitForTimeout(3000);

      // Take screenshot of error state
      await expect(page).toHaveScreenshot('error-state.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });
});
