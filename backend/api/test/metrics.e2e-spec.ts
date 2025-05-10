import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { gql } from 'apollo-server-express';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Log } from '../src/log/entities/log.entity';

describe('Metrics (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clear the logs table before each test
    await dataSource.getRepository(Log).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Query Frequency Metrics', () => {
    it('should return query frequency metrics for the last 14 days', async () => {
      // Insert test data
      const logRepo = dataSource.getRepository(Log);
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Insert some test logs
      await logRepo.save([
        {
          timestamp: twoWeeksAgo,
          level: 1,
          message: 'Test query 1',
          metadata: { query: 'What is Islamic finance?' },
          value: 1,
        },
        {
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          level: 1,
          message: 'Test query 2',
          metadata: { query: 'What is Islamic finance?' },
          value: 1,
        },
        {
          timestamp: now,
          level: 1,
          message: 'Test query 3',
          metadata: { query: 'What is riba?' },
          value: 1,
        },
      ]);

      // Define the GraphQL query
      const query = gql`
        query GetMetrics($startDate: Timestamp!, $endDate: Timestamp!) {
          getMetrics(query: { 
            type: QUERY_FREQUENCY, 
            startDate: $startDate,
            endDate: $endDate
          }) {
            values {
              metadata
              timestamp
              value
            }
          }
        }
      `;

      // Execute the query
      const response = await app.getHttpServer()
        .post('/graphql')
        .send({
          query: query.loc?.source.body,
          variables: {
            startDate: twoWeeksAgo.toISOString(),
            endDate: now.toISOString(),
          },
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.data.getMetrics.values).toBeDefined();
      expect(response.body.data.getMetrics.values.length).toBeGreaterThan(0);

      // Verify the data structure
      const metrics = response.body.data.getMetrics.values;
      metrics.forEach((metric: any) => {
        expect(metric).toHaveProperty('metadata');
        expect(metric).toHaveProperty('timestamp');
        expect(metric).toHaveProperty('value');
        expect(metric.metadata).toHaveProperty('query');
      });

      // Verify specific values
      const islamicFinanceQueries = metrics.filter(
        (m: any) => m.metadata.query === 'What is Islamic finance?'
      );
      expect(islamicFinanceQueries.length).toBeGreaterThan(0);
    });

    it('should handle empty result set', async () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const query = gql`
        query GetMetrics($startDate: Timestamp!, $endDate: Timestamp!) {
          getMetrics(query: { 
            type: QUERY_FREQUENCY, 
            startDate: $startDate,
            endDate: $endDate
          }) {
            values {
              metadata
              timestamp
              value
            }
          }
        }
      `;

      const response = await app.getHttpServer()
        .post('/graphql')
        .send({
          query: query.loc?.source.body,
          variables: {
            startDate: twoWeeksAgo.toISOString(),
            endDate: now.toISOString(),
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getMetrics.values).toBeDefined();
      expect(Array.isArray(response.body.data.getMetrics.values)).toBe(true);
      expect(response.body.data.getMetrics.values.length).toBe(0);
    });

    it('should handle invalid date range', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      const query = gql`
        query GetMetrics($startDate: Timestamp!, $endDate: Timestamp!) {
          getMetrics(query: { 
            type: QUERY_FREQUENCY, 
            startDate: $startDate,
            endDate: $endDate
          }) {
            values {
              metadata
              timestamp
              value
            }
          }
        }
      `;

      const response = await app.getHttpServer()
        .post('/graphql')
        .send({
          query: query.loc?.source.body,
          variables: {
            startDate: now.toISOString(),
            endDate: futureDate.toISOString(),
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getMetrics.values).toBeDefined();
      expect(Array.isArray(response.body.data.getMetrics.values)).toBe(true);
      expect(response.body.data.getMetrics.values.length).toBe(0);
    });
  });

  it('should return query frequency metrics with actual database records', async () => {
    // Insert test data with different timestamps and query frequencies
    const logRepo = dataSource.getRepository(Log);
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Insert multiple logs for the same query to test frequency
    const testLogs = [
      // Query 1: 3 occurrences
      {
        timestamp: twoWeeksAgo,
        level: 1,
        message: 'Test query 1',
        metadata: { query: 'What is Islamic finance?' },
        value: 1,
      },
      {
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        level: 1,
        message: 'Test query 1',
        metadata: { query: 'What is Islamic finance?' },
        value: 1,
      },
      {
        timestamp: now,
        level: 1,
        message: 'Test query 1',
        metadata: { query: 'What is Islamic finance?' },
        value: 1,
      },
      // Query 2: 2 occurrences
      {
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        level: 1,
        message: 'Test query 2',
        metadata: { query: 'What is riba?' },
        value: 1,
      },
      {
        timestamp: now,
        level: 1,
        message: 'Test query 2',
        metadata: { query: 'What is riba?' },
        value: 1,
      },
      // Query 3: 1 occurrence
      {
        timestamp: now,
        level: 1,
        message: 'Test query 3',
        metadata: { query: 'What is halal investment?' },
        value: 1,
      },
    ];

    await logRepo.save(testLogs);

    // Define the GraphQL query
    const query = gql`
      query GetMetrics($startDate: Timestamp!, $endDate: Timestamp!) {
        getMetrics(query: { 
          type: QUERY_FREQUENCY, 
          startDate: $startDate,
          endDate: $endDate
        }) {
          values {
            metadata
            timestamp
            value
          }
        }
      }
    `;

    // Execute the query
    const response = await app.getHttpServer()
      .post('/graphql')
      .send({
        query: query.loc?.source.body,
        variables: {
          startDate: twoWeeksAgo.toISOString(),
          endDate: now.toISOString(),
        },
      });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.data.getMetrics.values).toBeDefined();
    expect(response.body.data.getMetrics.values.length).toBeGreaterThan(0);

    // Verify the data structure and content
    const metrics = response.body.data.getMetrics.values;
    
    // Group metrics by query
    const queryFrequencies = metrics.reduce((acc: { [key: string]: number }, metric: any) => {
      const query = metric.metadata.query;
      acc[query] = (acc[query] || 0) + metric.value;
      return acc;
    }, {});

    // Verify frequencies
    expect(queryFrequencies['What is Islamic finance?']).toBe(3);
    expect(queryFrequencies['What is riba?']).toBe(2);
    expect(queryFrequencies['What is halal investment?']).toBe(1);

    // Verify timestamps are within range
    metrics.forEach((metric: any) => {
      const timestamp = new Date(metric.timestamp);
      expect(timestamp >= twoWeeksAgo).toBe(true);
      expect(timestamp <= now).toBe(true);
    });

    // Verify metadata structure
    metrics.forEach((metric: any) => {
      expect(metric.metadata).toHaveProperty('query');
      expect(typeof metric.metadata.query).toBe('string');
      expect(metric.metadata.query.length).toBeGreaterThan(0);
    });
  });
}); 