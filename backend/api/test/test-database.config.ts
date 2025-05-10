import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

export const testDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'islamicfinanceguru_test',
  entities: [join(__dirname, '..', 'src', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'src', 'migrations', '*.{ts,js}')],
  synchronize: true, // Always true for tests
  dropSchema: true, // Drop schema before each test run
};

export const testDataSource = new DataSource(testDataSourceOptions); 