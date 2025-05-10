import { testDataSource } from './test-database.config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'islamicfinanceguru_test';

// Global setup - runs once before all tests
beforeAll(async () => {
  // Initialize test database
  await testDataSource.initialize();
});

// Global teardown - runs once after all tests
afterAll(async () => {
  // Close database connection
  await testDataSource.destroy();
});

// Reset database before each test
beforeEach(async () => {
  // Drop all tables and recreate them
  await testDataSource.synchronize(true);
}); 