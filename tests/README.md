# Frontend E2E Testing Suite

This directory contains comprehensive end-to-end tests for the Torrent Browse UI frontend application using Playwright.

## Test Structure

### Core Test Files

- **`frontend-core.spec.js`** - Basic application functionality and navigation
- **`search-functionality.spec.js`** - Torrent search features and filters
- **`favorites.spec.js`** - Favorites management functionality
- **`cached-links.spec.js`** - Cached links and cache management
- **`backend-integration.spec.js`** - Backend API integration tests
- **`visual-regression.spec.js`** - Visual regression testing
- **`performance.spec.js`** - Performance and load testing

### Test Configuration

- **`playwright.config.js`** - Main Playwright configuration
- **`setup.js`** - Global test setup
- **`teardown.js`** - Global test cleanup

## Test Coverage

### ✅ Frontend Features Tested

1. **Application Loading**

   - Page load and rendering
   - Navigation between routes
   - Responsive design on mobile

2. **Search Functionality**

   - Basic torrent search
   - Website filtering (YTS, PirateBay, etc.)
   - Quality and seeder filters
   - Pagination handling
   - Input validation

3. **Favorites Management**

   - Adding/removing favorites
   - Favorites persistence
   - Navigation to favorites page

4. **Cached Links**

   - Cache operations
   - Cache statistics
   - Cache clearing functionality

5. **Backend Integration**

   - API connectivity verification
   - CORS handling
   - Error handling
   - Real-time backend testing against production

6. **Visual & Performance**
   - Screenshot testing
   - Performance metrics
   - Memory leak detection
   - Image loading optimization

## Backend Integration

Tests run against the backend configured via environment variables (see below). By default the
placeholder `https://your-api-host.example.com` is used; override with your actual host.

### Verified Backend Endpoints

- `/health` - Backend health check
- `/api/torrents` - Available torrent sources
- `/api/{site}/{query}/{page}` - Torrent search
- `/api/cache/*` - Cache operations
- `/api/favorites/*` - Favorites management

## Running Tests

### Local Development

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npm run playwright:install

# Run all e2e tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with UI mode
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Test Projects

The configuration includes multiple test projects:

1. **Chrome** - Desktop Chrome testing
2. **Firefox** - Desktop Firefox testing
3. **Mobile Chrome** - Mobile responsiveness testing

### Environment Variables

Tests use these environment variables:

```bash
FRONTEND_BASE_URL=http://localhost:3000              # Frontend URL
REACT_APP_BACKEND_URL=https://your-api-host.example.com  # Backend URL
REACT_APP_API_URL=https://your-api-host.example.com      # API URL
```

## GitHub Actions Integration

Tests run automatically on:

- **Push** to `main`/`master` branches
- **Pull requests** to `main`/`master`
- **Manual trigger** via workflow dispatch

### CI/CD Pipeline Jobs

1. **Frontend E2E Tests** - Core functionality testing
2. **Accessibility Tests** - Accessibility compliance
3. **Performance Tests** - Bundle size and performance analysis
4. **Test Summary** - Consolidated results reporting

### Artifacts

Test runs generate these artifacts:

- **Playwright Report** - Detailed test results with screenshots
- **Test Results** - JSON test data for analysis
- **Screenshots** - Visual evidence of test execution

## Test Philosophy

### Robust Selector Strategy

Tests use multiple selector strategies for reliability:

```javascript
// Multiple fallback selectors
const searchInput = page
  .locator(
    'input[type="text"], input[placeholder*="search"], input[data-testid="search-input"]'
  )
  .first();
```

### Graceful Degradation

Tests handle missing features gracefully:

```javascript
if (await favoritesLink.isVisible()) {
  await favoritesLink.click();
  // Test favorites functionality
} else {
  console.log('Favorites feature not found - test skipped');
}
```

### Real Backend Testing

Unlike mock testing, these tests verify actual backend integration:

- Real API calls to production backend
- Network error handling
- CORS configuration verification
- Response data validation

## Contributing

### Adding New Tests

1. Create test file in `tests/e2e/`
2. Follow existing naming conventions
3. Use robust selector strategies
4. Include proper error handling
5. Add descriptive test names and comments

### Test Guidelines

- **Be Defensive** - Handle missing elements gracefully
- **Use Timeouts** - Allow sufficient time for async operations
- **Verify State Changes** - Check for loading, success, and error states
- **Cross-Browser** - Consider different browser behaviors
- **Mobile Responsive** - Test mobile viewport scenarios

### Debugging Tests

```bash
# Run specific test file
npx playwright test frontend-core.spec.js

# Run with debug mode
npx playwright test --debug

# Run with trace
npx playwright test --trace on

# Generate and view report
npx playwright show-report
```

## Monitoring

The test suite provides comprehensive monitoring of:

- **Frontend functionality** - Core feature verification
- **Backend integration** - API connectivity and responses
- **Performance metrics** - Load times and resource usage
- **Visual regression** - UI consistency over time
- **Cross-browser compatibility** - Multi-browser testing

This ensures the frontend application maintains quality and reliability across deployments.
