import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { Repository } from 'typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFile, ProcessedFileStatus } from '../entities/processed-file.entity';
import { StorageService } from '../services/storage.service';
import { IngestorService } from './ingestor.service';

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

  // Future work tests
  describe('Future Work', () => {
    it('should support chunked file processing', async () => {
      // TODO: Implement when chunking is added
      expect(true).toBe(true);
    });

    it('should support stream reading for large files', async () => {
      // TODO: Implement when streaming is added
      expect(true).toBe(true);
    });

    it('should support different environment commands', async () => {
      // TODO: Implement when environment-specific commands are added
      expect(true).toBe(true);
    });

    it('should support queue-based processing', async () => {
      // TODO: Implement when queue system is added
      expect(true).toBe(true);
    });
  });
}); 