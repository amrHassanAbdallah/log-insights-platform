import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { DeepPartial } from 'typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFile, ProcessedFileStatus } from '../entities/processed-file.entity';
import { StorageService } from '../services/storage.service';
import { IngestorService } from './ingestor.service';

describe('IngestorService', () => {
  let service: IngestorService;
  let mockLogsRepository;
  let mockProcessedFileRepository;
  let mockStorageService;

  beforeEach(async () => {
    mockLogsRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockProcessedFileRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockStorageService = {
      listFiles: jest.fn(),
      getFileContent: jest.fn(),
      getFileSize: jest.fn(),
    };

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
          useValue: mockLogsRepository,
        },
        {
          provide: getRepositoryToken(ProcessedFile),
          useValue: mockProcessedFileRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<IngestorService>(IngestorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFiles', () => {
    it('should process files from S3 bucket', async () => {
      const mockFiles = ['file1.log.gz', 'file2.log.gz'];
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
          params: { test: 'value' },
        },
        context: 'TestContext',
        message: 'test message',
        authUserId: 1,
        processingTimeMs: 100,
        cacheHit: true,
        documentCount: 2,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      mockStorageService.listFiles.mockResolvedValue(mockFiles);
      mockProcessedFileRepository.findOne.mockResolvedValue(null);
      mockStorageService.getFileContent.mockResolvedValue('compressed-content');
      mockStorageService.getFileSize.mockResolvedValue(1024);

      await service.processFiles('test-bucket');

      expect(mockStorageService.listFiles).toHaveBeenCalledWith('test-bucket');
      expect(mockProcessedFileRepository.findOne).toHaveBeenCalled();
      expect(mockProcessedFileRepository.save).toHaveBeenCalledWith({
        s3Key: mockFiles[0],
        bucket: 'test-bucket',
        status: ProcessedFileStatus.PENDING,
        processedAt: expect.any(Date),
      } as DeepPartial<ProcessedFile>);
      expect(mockProcessedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: mockFiles[0], bucket: 'test-bucket' },
        { status: ProcessedFileStatus.PROCESSING } as DeepPartial<ProcessedFile>
      );
      expect(mockProcessedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: mockFiles[0], bucket: 'test-bucket' },
        {
          status: ProcessedFileStatus.COMPLETED,
          processedAt: expect.any(Date),
          metadata: { size: 1024 },
        } as DeepPartial<ProcessedFile>
      );
      expect(mockLogsRepository.create).toHaveBeenCalledWith({
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
        pid: mockLog.pid,
        hostname: mockLog.hostname,
        remoteAddress: mockLog.req.remoteAddress,
        remotePort: mockLog.req.remotePort,
        processingTimeMs: mockLog.processingTimeMs,
        cacheHit: mockLog.cacheHit,
        documentCount: mockLog.documentCount,
        lastUpdated: new Date(mockLog.lastUpdated),
        params: mockLog.req.params,
        rawData: mockLog,
      } as DeepPartial<Log>);
    });

    it('should skip already processed files', async () => {
      const mockFiles = ['file1.log.gz'];
      mockStorageService.listFiles.mockResolvedValue(mockFiles);
      mockProcessedFileRepository.findOne.mockResolvedValue({
        s3Key: 'file1.log.gz',
        bucket: 'test-bucket',
        status: ProcessedFileStatus.COMPLETED,
        processedAt: new Date(),
      });

      await service.processFiles('test-bucket');

      expect(mockStorageService.getFileContent).not.toHaveBeenCalled();
      expect(mockLogsRepository.create).not.toHaveBeenCalled();
    });

    it('should retry failed files', async () => {
      const mockFiles = ['file1.log.gz'];
      mockStorageService.listFiles.mockResolvedValue(mockFiles);
      mockProcessedFileRepository.findOne.mockResolvedValue({
        s3Key: 'file1.log.gz',
        bucket: 'test-bucket',
        status: ProcessedFileStatus.FAILED,
        processedAt: new Date(),
      });

      await service.processFiles('test-bucket');

      expect(mockProcessedFileRepository.update).toHaveBeenCalledWith(
        { s3Key: 'file1.log.gz', bucket: 'test-bucket' },
        { status: ProcessedFileStatus.PENDING } as DeepPartial<ProcessedFile>
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

      expect(mockLogsRepository.create).toHaveBeenCalledWith({
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
}); 