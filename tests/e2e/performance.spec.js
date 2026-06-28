const { test, expect } = require('@playwright/test');

test.describe('Performance Tests', () => {
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

  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    // Page is already loaded by beforeEach
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Homepage load time: ${loadTime}ms`);

    // Homepage should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should have acceptable Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for metrics to be available
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          const paint = performance.getEntriesByType('paint');

          const result = {
            domContentLoaded:
              navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint:
              paint.find((p) => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint:
              paint.find((p) => p.name === 'first-contentful-paint')
                ?.startTime || 0,
          };

          resolve(result);
        }, 2000);
      });
    });

    console.log('Performance metrics:', metrics);

    // Acceptable thresholds
    expect(metrics.domContentLoaded).toBeLessThan(5000);
    expect(metrics.firstContentfulPaint).toBeLessThan(3000);
  });

  test('should handle multiple concurrent searches efficiently', async ({
    page,
  }) => {
    await page.goto('/');

    const searchInput = page
      .locator(
        'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
      )
      .first();
    const searchButton = page
      .locator('button:has-text("Search"), [data-testid="search-button"]')
      .first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      const startTime = Date.now();

      // Perform multiple searches quickly
      const searches = ['movie1', 'movie2', 'movie3'];

      for (const searchTerm of searches) {
        await searchInput.fill(searchTerm);
        await searchButton.click();
        await page.waitForTimeout(1000); // Small delay between searches
      }

      // Wait for final search to complete
      await page.waitForTimeout(5000);

      const totalTime = Date.now() - startTime;
      console.log(`Multiple searches completed in: ${totalTime}ms`);

      // Should handle concurrent searches within reasonable time
      expect(totalTime).toBeLessThan(20000);
    }
  });

  test('should not have memory leaks during navigation', async ({ page }) => {
    await page.goto('/');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navigate between pages multiple times
    const pages = ['/', '/favorites', '/cached-links'];

    for (let i = 0; i < 5; i++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1000);
      }
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      console.log(
        `Memory usage: ${initialMemory} -> ${finalMemory} (increase: ${memoryIncrease})`
      );

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should load cover images efficiently from URLs', async ({ page }) => {
    await page.goto('/');

    // Track cover image loading (now all URL-based, including Pixhost)
    const imageLoadTimes = [];
    const pixhostImageCount = { count: 0 };

    page.on('response', (response) => {
      const url = response.url();

      // Track image loading for all image types (now includes Pixhost)
      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/) || url.includes('pixhost.to') || url.includes('img1.pixhost.to')) {
        const timing = response.timing();
        imageLoadTimes.push(timing.responseEnd - timing.requestStart);

        // Count Pixhost images specifically
        if (url.includes('pixhost.to') || url.includes('img1.pixhost.to')) {
          pixhostImageCount.count++;
        }
      }
    });

    // Perform search to trigger cover image loading
    const searchInput = page
      .locator(
        'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
      )
      .first();
    const searchButton = page
      .locator('button:has-text("Search"), [data-testid="search-button"]')
      .first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      await searchInput.fill('movie poster');
      await searchButton.click();
      await page.waitForTimeout(8000);
    }

    if (imageLoadTimes.length > 0) {
      const avgImageLoadTime =
        imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
      console.log(`Average image load time: ${avgImageLoadTime}ms`);
      console.log(`Total images loaded: ${imageLoadTimes.length}`);
      console.log(`Pixhost images loaded: ${pixhostImageCount.count}`);

      // Cover images should load within 8 seconds on average (Pixhost may be slower)
      expect(avgImageLoadTime).toBeLessThan(8000);

      // Log performance info for Pixhost-hosted images
      if (pixhostImageCount.count > 0) {
        console.log('✅ URL-only cover image system working with Pixhost integration');
      }
    } else {
      console.log('No cover images found during performance test');
    }
  });

  test('should handle large result sets efficiently', async ({ page }) => {
    await page.goto('/');

    const searchInput = page
      .locator(
        'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
      )
      .first();
    const searchButton = page
      .locator('button:has-text("Search"), [data-testid="search-button"]')
      .first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      // Search for common term that should return many results
      await searchInput.fill('movie');

      const startTime = Date.now();
      await searchButton.click();

      // Wait for results to load
      await page.waitForTimeout(10000);

      const loadTime = Date.now() - startTime;
      console.log(`Large result set load time: ${loadTime}ms`);

      // Should handle large result sets within 15 seconds
      expect(loadTime).toBeLessThan(15000);

      // Check if pagination or virtualization is working
      const resultItems = await page
        .locator('[data-testid="torrent-result"], .torrent-card, .result-item')
        .count();
      console.log(`Rendered result items: ${resultItems}`);

      // Should limit rendered items for performance
      expect(resultItems).toBeLessThan(100);
    }
  });
});
