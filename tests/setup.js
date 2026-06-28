// Global setup for frontend e2e tests
const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Starting frontend e2e test setup...');

  // Verify backend is accessible
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || 'https://your-api-host.example.com';
  console.log(`Verifying backend accessibility at: ${backendUrl}`);

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Check backend health
    const response = await page.request.get(`${backendUrl}/health`);
    if (response.ok()) {
      console.log('✅ Backend is accessible and healthy');
    } else {
      console.warn(`⚠️ Backend health check returned ${response.status()}`);
    }

    // Check backend API endpoints
    const torrentsResponse = await page.request.get(
      `${backendUrl}/api/torrents`
    );
    if (torrentsResponse.ok()) {
      console.log('✅ Backend API endpoints are accessible');
    } else {
      console.warn(
        `⚠️ Backend API check returned ${torrentsResponse.status()}`
      );
    }

    await browser.close();
  } catch (error) {
    console.error('❌ Error during backend verification:', error.message);
    // Don't fail setup completely, but log the issue
  }

  console.log('✅ Frontend e2e test setup completed');
}

module.exports = globalSetup;
