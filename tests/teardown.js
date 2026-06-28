// Global teardown for frontend e2e tests
async function globalTeardown(config) {
  console.log('🧹 Starting frontend e2e test teardown...');

  // Clean up any test data if needed
  // For now, just log completion

  console.log('✅ Frontend e2e test teardown completed');
}

module.exports = globalTeardown;
