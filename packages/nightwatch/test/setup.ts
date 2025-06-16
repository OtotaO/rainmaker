// Global test setup
import { beforeAll, afterAll } from 'bun:test';

// Set up any global test configuration here
beforeAll(() => {
  // Global setup code
  console.log('Running global test setup');
});

afterAll(() => {
  // Global teardown code
  console.log('Running global test teardown');
});

// Add any global test utilities here
const testHelper = {
  // Add helper functions here
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
};

// Export for use in tests
export { testHelper };

// Extend the global namespace
declare global {
  // eslint-disable-next-line no-var
  var testHelper: {
    wait: (ms: number) => Promise<void>;
  };
}

// Make testHelper globally available
global.testHelper = testHelper;
