import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { pipeline } from 'stream/promises';
import { DataSource } from 'typeorm';
import { createGzip } from 'zlib';
import { Log } from '../src/entities/log.entity';
import { ProcessedFileStatus } from '../src/entities/processed-file-status.enum';
import { ProcessedFile } from '../src/entities/processed-file.entity';
import { MetricsModule } from '../../api/src/metrics/metrics.module';
describe('Ingestor (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let s3Client: S3Client;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Initialize S3 client
    s3Client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      forcePathStyle: true,
    });
  });

  beforeEach(async () => {
    // Clear the database tables
    await dataSource.getRepository(Log).clear();
    await dataSource.getRepository(ProcessedFile).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process a log file and update database records', async () => {
    // Create test log data
    const testLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 1,
        message: 'Test query 1',
        metadata: { query: 'What is Islamic finance?' },
        value: 1,
      },
      {
        timestamp: new Date().toISOString(),
        level: 1,
        message: 'Test query 2',
        metadata: { query: 'What is riba?' },
        value: 1,
      },
    ];

    // Convert to JSON and compress
    const jsonData = JSON.stringify(testLogs);
    const compressedData = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pipeline(
        Buffer.from(jsonData),
        createGzip(),
        async function* (source) {
          for await (const chunk of source) {
            chunks.push(chunk);
          }
          resolve(Buffer.concat(chunks));
        }
      ).catch(reject);
    });

    // Upload to S3
    const fileName = `test-logs-${Date.now()}.json.gz`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || 'test-bucket',
        Key: fileName,
        Body: compressedData,
      })
    );

    // Start the ingestor service
    const ingestorService = app.get('IngestorService');
    await ingestorService.processFiles(process.env.AWS_S3_BUCKET || 'test-bucket');

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify database records
    const processedFile = await dataSource.getRepository(ProcessedFile).findOne({
      where: { s3Key: fileName },
    });

    expect(processedFile).toBeDefined();
    expect(processedFile?.status).toBe(ProcessedFileStatus.COMPLETED);

    const logs = await dataSource.getRepository(Log).find();
    expect(logs.length).toBe(2);
  });
}); 