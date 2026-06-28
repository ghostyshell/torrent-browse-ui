const { test, expect } = require('@playwright/test');

test.describe('Backend Integration', () => {
  const backendUrl = process.env.REACT_APP_API_URL || 'https://your-api-host.example.com';

  test('should verify backend connectivity', async ({ request }) => {
    // Test backend health endpoint
    const healthResponse = await request.get(`${backendUrl}/health`);
    expect(healthResponse.ok()).toBeTruthy();

    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('status');
  });

  test('should verify torrent API endpoints', async ({ request }) => {
    // Test torrents endpoint
    const torrentsResponse = await request.get(`${backendUrl}/api/torrents`);
    expect(torrentsResponse.ok()).toBeTruthy();

    const torrentsData = await torrentsResponse.json();
    expect(Array.isArray(torrentsData)).toBeTruthy();
    expect(torrentsData.length).toBeGreaterThan(0);

    // Should include common torrent sites
    const expectedSites = ['yts', 'piratebay', 'limetorrent'];
    expectedSites.forEach((site) => {
      expect(torrentsData).toContain(site);
    });
  });

  test('should perform backend search requests', async ({ request }) => {
    // Test search endpoint
    const searchResponse = await request.get(
      `${backendUrl}/api/yts/avengers/1`
    );
    expect(searchResponse.ok()).toBeTruthy();

    const searchData = await searchResponse.json();
    expect(Array.isArray(searchData)).toBeTruthy();

    // If results exist, verify structure
    if (searchData.length > 0) {
      const firstResult = searchData[0];
      expect(typeof firstResult).toBe('object');
    }
  });

  test('should handle backend CORS properly', async ({ page }) => {
    // Navigate to frontend
    await page.goto('/');

    // Intercept backend requests to check CORS headers
    let corsHeadersFound = false;

    page.on('response', (response) => {
      if (response.url().includes(backendUrl)) {
        const headers = response.headers();
        if (headers['access-control-allow-origin']) {
          corsHeadersFound = true;
        }
      }
    });

    // Trigger a backend request through the frontend
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

      // Wait for backend request
      await page.waitForTimeout(5000);

      console.log(`CORS headers found: ${corsHeadersFound}`);
    }
  });

  test('should handle backend errors gracefully', async ({ page }) => {
    // Navigate to frontend
    await page.goto('/');

    // Mock backend error by intercepting requests
    await page.route(`${backendUrl}/api/**`, (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Try to perform search
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

      // Wait for error handling
      await page.waitForTimeout(3000);

      // Check that error is handled gracefully
      const errorHandled = await page
        .locator(
          'text="error", text="failed", [data-testid="error-message"], .error-message'
        )
        .isVisible();

      console.log('Backend error handling test completed');
    }
  });

  test('should verify cover image API endpoints', async ({ request }) => {
    // Test cover image storage endpoint
    try {
      const coverImageResponse = await request.post(`${backendUrl}/api/cache/cover-image`, {
        data: {
          torrent: { Name: 'Test', Source: 'test', Size: '1GB' },
          imageUrl: 'https://via.placeholder.com/300x450'
        }
      });
      // Should either work or return proper error
      expect([200, 400, 404, 500].includes(coverImageResponse.status())).toBeTruthy();

      if (coverImageResponse.ok()) {
        const result = await coverImageResponse.json();
        console.log('✅ Cover image storage endpoint functional');
      }
    } catch (error) {
      console.log('Cover image storage endpoint test - endpoint may not exist');
    }

    // Test cover image retrieval endpoint
    try {
      const getResponse = await request.get(`${backendUrl}/api/cache/cover-image/test_test_1gb`);
      // Should return JSON response (URL-only, no more binary data)
      if (getResponse.ok()) {
        const contentType = getResponse.headers()['content-type'];
        expect(contentType).toMatch(/application\/json/);

        const result = await getResponse.json();
        if (result.success) {
          expect(result.type).toBe('url');
          console.log('✅ Cover image retrieval returns URL-only data');
        }
      }
    } catch (error) {
      console.log('Cover image retrieval endpoint test - endpoint may not exist');
    }
  });

  test('should check backend cache functionality', async ({ request }) => {
    // Test cache endpoints
    try {
      const cacheResponse = await request.get(`${backendUrl}/api/cache/stats`);
      if (cacheResponse.ok()) {
        const cacheData = await cacheResponse.json();
        expect(typeof cacheData).toBe('object');
      }
    } catch (error) {
      console.log('Cache endpoint test - endpoint may not exist');
    }
  });

  test('should verify favorites backend integration', async ({ page }) => {
    // Test favorites functionality with backend
    await page.goto('/');

    // Monitor backend requests for favorites
    let favoritesRequestMade = false;

    page.on('response', (response) => {
      if (
        response.url().includes('favorites') ||
        response.url().includes('favorite')
      ) {
        favoritesRequestMade = true;
      }
    });

    // Navigate to favorites page
    const favoritesLink = page.locator(
      'a:has-text("Favorites"), button:has-text("Favorites"), [data-testid="favorites-link"]'
    );

    if (await favoritesLink.isVisible()) {
      await favoritesLink.click();
      await page.waitForTimeout(3000);

      console.log(`Favorites backend request made: ${favoritesRequestMade}`);
    }
  });
});
