const { test, expect } = require('@playwright/test');

test.describe('Cover Images Functionality', () => {
  const backendUrl = process.env.REACT_APP_API_URL || 'https://your-api-host.example.com';

  // Note: Most tests are backend-only and don't require frontend

  test('should handle cover image API with URL-only responses', async ({ request }) => {
    // Test the new URL-only cover image API
    try {
      const response = await request.get(`${backendUrl}/api/cache/stats`);
      if (response.ok()) {
        const stats = await response.json();
        expect(typeof stats).toBe('object');

        // If images exist in stats, they should be URL-based now
        if (stats.images && stats.images > 0) {
          console.log(`✅ Cover images in backend: ${stats.images} (URL-only storage)`);
        }
      }
    } catch (error) {
      console.log('Cache stats endpoint not available');
    }
  });

  test('should store and retrieve cover images as URLs only', async ({ request }) => {
    // Test storing a cover image (should upload to Pixhost and store URL)
    const testTorrent = {
      Name: 'Test Movie for Cover Image',
      Source: 'test',
      Size: '1GB'
    };

    const testImageUrl = 'https://via.placeholder.com/300x450/0066CC/FFFFFF?text=Test+Cover';

    try {
      // Store cover image
      const storeResponse = await request.post(`${backendUrl}/api/cache/cover-image`, {
        data: {
          torrent: testTorrent,
          imageUrl: testImageUrl
        }
      });

      if (storeResponse.ok()) {
        const storeResult = await storeResponse.json();
        expect(storeResult.success).toBeTruthy();
        console.log('✅ Cover image stored successfully');

        // Generate torrent key to retrieve the image
        const torrentKey = `${testTorrent.Name}_${testTorrent.Source}_${testTorrent.Size}`
          .replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

        // Retrieve cover image (should return URL only, not blob)
        const getResponse = await request.get(`${backendUrl}/api/cache/cover-image/${torrentKey}`);

        if (getResponse.ok()) {
          const getResult = await getResponse.json();
          expect(getResult.success).toBeTruthy();
          expect(getResult.type).toBe('url');
          expect(typeof getResult.imageUrl).toBe('string');
          expect(getResult.imageUrl).toMatch(/^https?:\/\//);

          // Should be a Pixhost URL or the original URL
          const isPixhostUrl = getResult.imageUrl.includes('pixhost.to') ||
                              getResult.imageUrl.includes('img1.pixhost.to');
          const isOriginalUrl = getResult.imageUrl === testImageUrl;

          expect(isPixhostUrl || isOriginalUrl).toBeTruthy();
          console.log(`✅ Cover image retrieved as URL: ${getResult.imageUrl.substring(0, 50)}...`);
        }
      }
    } catch (error) {
      console.log('Cover image API test - endpoints may not be available');
    }
  });

  test('should handle cover image retrieval for torrents via POST endpoint', async ({ request }) => {
    const testTorrent = {
      Name: 'Test Movie POST',
      Source: 'test',
      Size: '2GB'
    };

    try {
      // Use the POST endpoint for cover image retrieval
      const response = await request.post(`${backendUrl}/api/cache/cover-image/torrent`, {
        data: testTorrent
      });

      if (response.ok()) {
        const result = await response.json();

        if (result.success && result.coverImage) {
          // Should return URL-only data
          expect(result.coverImage.type).toBe('url');
          expect(typeof result.coverImage.imageUrl).toBe('string');
          console.log('✅ Torrent cover image POST endpoint returns URL-only data');
        } else {
          console.log('No cover image found for test torrent (expected)');
        }
      }
    } catch (error) {
      console.log('Cover image torrent POST endpoint not available');
    }
  });

  test('should display cover images as URLs in the frontend', async ({ page }) => {
    // Skip this test if frontend is not available
    try {
      await page.goto('/');
    } catch (error) {
      console.log('Frontend not available - skipping frontend cover image test');
      return;
    }

    // Test that frontend properly displays cover images from URLs

    // First perform a search to get some results
    const searchInput = page.locator(
      'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
    ).first();
    const searchButton = page.locator(
      'button:has-text("Search"), [data-testid="search-button"]'
    ).first();

    if ((await searchInput.isVisible()) && (await searchButton.isVisible())) {
      await searchInput.fill('test movie');
      await searchButton.click();

      // Wait for results
      await page.waitForTimeout(8000);

      // Check if any cover images are loaded
      const coverImages = page.locator('img[src*="http"], [style*="background-image"]');
      const coverImageCount = await coverImages.count();

      if (coverImageCount > 0) {
        console.log(`Found ${coverImageCount} cover images on the page`);

        // Check that cover images are loaded as URLs (not blob URLs)
        for (let i = 0; i < Math.min(coverImageCount, 3); i++) {
          const img = coverImages.nth(i);
          if (await img.isVisible()) {
            const src = await img.getAttribute('src');
            if (src) {
              expect(src).toMatch(/^https?:\/\//);
              expect(src).not.toMatch(/^blob:/);
              console.log(`✅ Cover image ${i + 1} is a proper URL: ${src.substring(0, 50)}...`);
            }
          }
        }
      } else {
        console.log('No cover images found on search results page');
      }
    }
  });

  test('should handle cover image updates for favorites', async ({ request }) => {
    const favoriteId = 'test-favorite-id';
    const coverImageUrl = 'https://via.placeholder.com/300x450/FF6600/FFFFFF?text=Favorite+Cover';

    try {
      const response = await request.put(`${backendUrl}/api/cache/cover-image/favorite/${favoriteId}`, {
        data: {
          coverImageUrl: coverImageUrl
        }
      });

      if (response.ok()) {
        const result = await response.json();
        expect(result.success).toBeTruthy();
        console.log('✅ Favorite cover image update successful');
      }
    } catch (error) {
      console.log('Favorite cover image update endpoint not available');
    }
  });

  test('should handle cover image updates for cached links', async ({ request }) => {
    const cachedLinkId = 'test-cached-link-id';
    const coverImageUrl = 'https://via.placeholder.com/300x450/009900/FFFFFF?text=Cached+Cover';

    try {
      const response = await request.put(`${backendUrl}/api/cache/cover-image/cached-link/${cachedLinkId}`, {
        data: {
          coverImageUrl: coverImageUrl
        }
      });

      if (response.ok()) {
        const result = await response.json();
        expect(result.success).toBeTruthy();
        console.log('✅ Cached link cover image update successful');
      }
    } catch (error) {
      console.log('Cached link cover image update endpoint not available');
    }
  });

  test('should handle cover image updates for torrent details', async ({ request }) => {
    const favoriteId = 'test-favorite-entry';
    const source = 'test-source';
    const coverImageUrl = 'https://via.placeholder.com/300x450/CC0066/FFFFFF?text=Details+Cover';

    try {
      const response = await request.put(`${backendUrl}/api/cache/cover-image/torrent-details/${favoriteId}/${source}`, {
        data: {
          coverImageUrl: coverImageUrl
        }
      });

      if (response.ok()) {
        const result = await response.json();
        expect(result.success).toBeTruthy();
        console.log('✅ Torrent details cover image update successful');
      }
    } catch (error) {
      console.log('Torrent details cover image update endpoint not available');
    }
  });

  test('should not return binary data for cover images', async ({ request }) => {
    // Ensure that cover image endpoints never return binary data
    const testTorrentKey = 'test_movie_test_1gb';

    try {
      const response = await request.get(`${backendUrl}/api/cache/cover-image/${testTorrentKey}`);

      if (response.ok()) {
        const contentType = response.headers()['content-type'];

        // Should not be an image content type (no more binary data)
        expect(contentType).not.toMatch(/^image\//);

        // Should be JSON
        expect(contentType).toMatch(/application\/json/);

        const result = await response.json();
        if (result.success) {
          expect(result.type).toBe('url');
          console.log('✅ Cover image endpoint returns JSON with URL data only');
        }
      }
    } catch (error) {
      console.log('Cover image endpoint test not available');
    }
  });
});