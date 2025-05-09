import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { Repository } from 'typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFileStatus } from '../entities/processed-file-status.enum';
import { ProcessedFile } from '../entities/processed-file.entity';
import { IngestorService } from './ingestor.service';
import { StorageService } from './storage.service';

describe('IngestorService', () => {
  let service: IngestorService;
  let logsRepository: Repository<Log>;
  let processedFileRepository: Repository<ProcessedFile>;
  let storageService: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AWS_REGION: 'us-east-1',
                AWS_ENDPOINT: 'http://localhost:4566',
                AWS_ACCESS_KEY_ID: 'test',
                AWS_SECRET_ACCESS_KEY: 'test',
              };
              return config[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(Log),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProcessedFile),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            manager: {
              transaction: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            listFiles: jest.fn(),
            getFileContent: jest.fn(),
            getFileSize: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IngestorService>(IngestorService);
    logsRepository = module.get<Repository<Log>>(getRepositoryToken(Log));
    processedFileRepository = module.get<Repository<ProcessedFile>>(getRepositoryToken(ProcessedFile));
    storageService = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFiles', () => {
    it('should process pending jobs first', async () => {
      const pendingJobs = [
        { s3Key: 'file1.json.gz', bucket: 'test-bucket', status: ProcessedFileStatus.PENDING },
        { s3Key: 'file2.json.gz', bucket: 'test-bucket', status: ProcessedFileStatus.PENDING },
      ];

      (processedFileRepository.find as jest.Mock).mockResolvedValue(pendingJobs);
      (storageService.getFileContent as jest.Mock).mockResolvedValue(JSON.stringify([
        { timestamp: '2024-01-01T00:00:00.000Z', message: 'test' }
      ]));

      await service.processFiles('test-bucket');

      expect(processedFileRepository.find).toHaveBeenCalledWith({
        where: expect.any(Object),
        order: { createdAt: 'ASC' },
        skip: 0,
        take: 50,
      });
      expect(storageService.getFileContent).toHaveBeenCalledTimes(2);
    });

    it('should process new files after pending jobs', async () => {
      // No pending jobs
      (processedFileRepository.find as jest.Mock).mockResolvedValue([]);
      
      // Most recent log
      (logsRepository.findOne as jest.Mock).mockResolvedValue({
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      });

      // New files in S3
      (storageService.listFiles as jest.Mock).mockResolvedValue([
        '2024-01-02T00:00:00.000Z.json.gz',
        '2024-01-03T00:00:00.000Z.json.gz',
      ]);

      await service.processFiles('test-bucket');

      expect(storageService.listFiles).toHaveBeenCalledWith('test-bucket', undefined);
      expect(processedFileRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            s3Key: '2024-01-02T00:00:00.000Z.json.gz',
            status: ProcessedFileStatus.PENDING,
          }),
          expect.objectContaining({
            s3Key: '2024-01-03T00:00:00.000Z.json.gz',
            status: ProcessedFileStatus.PENDING,
          }),
        ])
      );
    });

    it('should handle stuck jobs', async () => {
      const stuckJobs = [
        { 
          s3Key: 'file1.json.gz', 
          bucket: 'test-bucket', 
          status: ProcessedFileStatus.PROCESSING,
          processedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        },
      ];

      (processedFileRepository.find as jest.Mock).mockResolvedValue(stuckJobs);
      (storageService.getFileContent as jest.Mock).mockResolvedValue(JSON.stringify([
        { timestamp: '2024-01-01T00:00:00.000Z', message: 'test' }
      ]));

      await service.processFiles('test-bucket');

      expect(processedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: 'file1.json.gz', bucket: 'test-bucket' },
        expect.objectContaining({
          status: ProcessedFileStatus.PENDING,
        })
      );
    });

    it('should handle malformed log entries', async () => {
      const pendingJobs = [
        { s3Key: 'file1.json.gz', bucket: 'test-bucket', status: ProcessedFileStatus.PENDING },
      ];

      (processedFileRepository.find as jest.Mock).mockResolvedValue(pendingJobs);
      (storageService.getFileContent as jest.Mock).mockResolvedValue(JSON.stringify([
        { invalid: 'entry' } // Malformed log entry
      ]));

      await service.processFiles('test-bucket');

      expect(processedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: 'file1.json.gz', bucket: 'test-bucket' },
        expect.objectContaining({
          status: ProcessedFileStatus.FAILED,
        })
      );
    });
  });

  describe('processLocalFile', () => {
    it('should process local log file', async () => {
      const mockLog = {
        level: 1,
        time: 1234567890,
        timestamp: '2024-01-01T00:00:00Z',
        pid: 1234,
        hostname: 'test-host',
        req: {
          id: 1,
          method: 'GET',
          url: '/test',
          query: {},
          headers: {},
          remoteAddress: '127.0.0.1',
          remotePort: 12345,
        },
        context: 'test-context',
        message: 'test message',
        authUserId: 1,
      };

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify([mockLog]));

      await service.processLocalFile('test.log');

      expect(logsRepository.create).toHaveBeenCalledWith({
        id: mockLog.req.id.toString(),
        timestamp: new Date(mockLog.timestamp),
        level: mockLog.level,
        method: mockLog.req.method,
        url: mockLog.req.url,
        query: mockLog.req.query,
        headers: mockLog.req.headers,
        context: mockLog.context,
        message: mockLog.message,
        authUserId: mockLog.authUserId,
        rawData: mockLog,
      });
    });

    it('should throw error for invalid log format', async () => {
      const invalidLog = {
        // Missing required fields
        level: 1,
        message: 'test',
      };

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify([invalidLog]));

      await expect(service.processLocalFile('test.log')).rejects.toThrow();
    });
  });



  describe('concurrent processing', () => {
    it('should handle concurrent job processing with pessimistic locking', async () => {
      // Mock two instances trying to process the same job
      const job = {
        s3Key: 'test.json',
        bucket: 'test-bucket',
        status: ProcessedFileStatus.PENDING,
      };

      // First instance acquires the lock
      (processedFileRepository.find as jest.Mock).mockResolvedValueOnce([job]);
      (processedFileRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({ getRepository: () => processedFileRepository });
      });

      // Second instance should wait for the lock
      await service.processFiles('test-bucket');
      
      // Verify that the job was processed only once
      expect(processedFileRepository.update).toHaveBeenCalledTimes(1);
      expect(processedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: job.s3Key, bucket: job.bucket },
        expect.objectContaining({
          status: ProcessedFileStatus.PROCESSING,
        })
      );
    });

    it('should prevent duplicate file entries with unique constraints', async () => {
      const file = {
        s3Key: 'test.json',
        bucket: 'test-bucket',
      };

      // First instance creates the entry
      (storageService.listFiles as jest.Mock).mockResolvedValueOnce([file.s3Key]);
      (processedFileRepository.find as jest.Mock).mockResolvedValueOnce([]);
      (processedFileRepository.save as jest.Mock).mockResolvedValueOnce(file);

      // Second instance should fail due to unique constraint
      (processedFileRepository.save as jest.Mock).mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation
      });

      await service.processFiles('test-bucket');
      
      // Verify that only one entry was created
      expect(processedFileRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle transaction rollback on failure', async () => {
      const job = {
        s3Key: 'test.json',
        bucket: 'test-bucket',
        status: ProcessedFileStatus.PENDING,
      };

      // Mock a failure during processing
      (processedFileRepository.find as jest.Mock).mockResolvedValueOnce([job]);
      (processedFileRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) => {
        throw new Error('Processing failed');
      });

      await expect(service.processFiles('test-bucket')).rejects.toThrow('Processing failed');
      
      // Verify that the job status wasn't updated
      expect(processedFileRepository.update).not.toHaveBeenCalled();
    });

    it('should handle version conflicts during updates', async () => {
      const job = {
        s3Key: 'test.json',
        bucket: 'test-bucket',
        status: ProcessedFileStatus.PENDING,
        version: 1,
      };

      // First instance updates successfully
      (processedFileRepository.find as jest.Mock).mockResolvedValueOnce([job]);
      (processedFileRepository.update as jest.Mock).mockResolvedValueOnce({ affected: 1 });

      // Second instance should fail due to version mismatch
      (processedFileRepository.update as jest.Mock).mockRejectedValueOnce({
        code: '23514', // PostgreSQL version conflict
      });

      await service.processFiles('test-bucket');
      
      // Verify that only one update succeeded
      expect(processedFileRepository.update).toHaveBeenCalledTimes(1);
    });
  });
}); 