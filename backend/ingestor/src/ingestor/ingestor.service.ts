import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { DeepPartial, In, LessThan, Repository } from 'typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFileStatus } from '../entities/processed-file-status.enum';
import { ProcessedFile } from '../entities/processed-file.entity';
import { StorageService } from '../services/storage.service';

interface LogEntry {
  level: string;
  time: number;
  timestamp: string;
  pid: number;
  hostname: string;
  req: {
    id: number;
    method: string;
    url: string;
    query: string;
    headers: Record<string, string>;
    remoteAddress: string;
    remotePort: number;
    params?: Record<string, any>;
  };
  context: string;
  message: string;
  authUserId: number;
  processingTimeMs?: number;
  cacheHit?: boolean;
  documentCount?: number;
  lastUpdated?: string;
}

@Injectable()
export class IngestorService {
  private readonly logger = new Logger(IngestorService.name);
  private readonly stuckTimeout: number;
  private readonly pageSize: number;
  private processedAnyJobs: boolean = false;

  constructor(
    @InjectRepository(Log)
    private readonly logsRepository: Repository<Log>,
    @InjectRepository(ProcessedFile)
    private readonly processedFileRepository: Repository<ProcessedFile>,
    private readonly storageService: StorageService,
    @Inject('INGESTOR_CONFIG')
    private readonly config: { stuckTimeout?: number; pageSize?: number } = {}
  ) {
    this.stuckTimeout = config.stuckTimeout || 5 * 60 * 1000; // Default 5 minutes
    this.pageSize = config.pageSize || 50; // Default 50 items per page
  }

  async processFiles(bucket: string, prefix?: string, afterDate?: Date): Promise<void> {
    try {
      // First, check for and requeue stuck jobs
      await this.requeueStuckJobs();
      
      // Get pending or stuck in-progress jobs with pagination
      let page = 0;
      let hasMore = true;

      // First, process any existing pending jobs
      while (hasMore) {
        const jobs = await this.getPendingJobs(page);
        if (jobs.length === 0) {
          hasMore = false;
          break;
        }

        // Mark all jobs in this page as processing
        await this.markJobsAsProcessing(jobs);

        // Process each job
        for (const job of jobs) {
          try {
            await this.processS3File(job.bucket, job.s3Key);
            
            // Mark job as completed
            await this.processedFileRepository.update(
              { s3Key: job.s3Key, bucket: job.bucket },
              { 
                status: ProcessedFileStatus.COMPLETED,
                processedAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                  ...job.metadata,
                  size: await this.storageService.getFileSize(job.bucket, job.s3Key)
                }
              } as DeepPartial<ProcessedFile>
            );

            this.logger.log(`Successfully processed file: ${job.s3Key}`);
          } catch (error) {
            this.logger.error(`Error processing file ${job.s3Key}: ${error.message}`);
            // Mark job as failed
            await this.processedFileRepository.update(
              { s3Key: job.s3Key, bucket: job.bucket },
              { 
                status: ProcessedFileStatus.FAILED,
                updatedAt: new Date(),
                metadata: {
                  ...job.metadata,
                  error: error.message,
                  lastAttempt: new Date()
                }
              } as DeepPartial<ProcessedFile>
            );
          }
        }

        page++;
      }

      // If no pending jobs were found, check S3 for new files
      if (!this.processedAnyJobs) {
        this.logger.log('No pending jobs found, checking S3 for new files...');
        await this.processNewS3Files(bucket, prefix);
      }
    } catch (error) {
      this.logger.error(`Error processing files: ${error.message}`);
      throw error;
    }
  }

  private async getPendingJobs(page: number): Promise<ProcessedFile[]> {
    const stuckTime = new Date(Date.now() - this.stuckTimeout);
    
    return await this.processedFileRepository.manager.transaction(async (manager) => {
      const processedFileRepo = manager.getRepository(ProcessedFile);
      
      return await processedFileRepo.find({
        where: [
          {
            status: ProcessedFileStatus.PENDING,
          },
          {
            status: ProcessedFileStatus.PROCESSING,
            processedAt: LessThan(stuckTime),
          }
        ],
        order: {
          createdAt: 'ASC', // Process oldest jobs first
        },
        skip: page * this.pageSize,
        take: this.pageSize,
        lock: { mode: 'pessimistic_write' },
      });
    });
  }

  private async markJobsAsProcessing(jobs: ProcessedFile[]): Promise<void> {
    if (jobs.length === 0) return;

    await this.processedFileRepository.manager.transaction(async (manager) => {
      const processedFileRepo = manager.getRepository(ProcessedFile);
      
      await processedFileRepo.update(
        { s3Key: In(jobs.map(job => job.s3Key)), bucket: In(jobs.map(job => job.bucket)) },
        { 
          status: ProcessedFileStatus.PROCESSING,
          processedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...jobs[0].metadata,
            batchProcessedAt: new Date().toISOString(),
          }
        } as DeepPartial<ProcessedFile>
      );
    });
  }

  private async requeueStuckJobs(): Promise<void> {
    try {
      this.logger.log('Checking for stuck jobs...');
      const stuckTime = new Date(Date.now() - this.stuckTimeout);
      
      // Find all jobs that are stuck in PROCESSING state for more than 1 minute
      const stuckJobs = await this.processedFileRepository.find({
        where: {
          status: ProcessedFileStatus.PROCESSING,
          processedAt: LessThan(stuckTime),
        },
      });

      if (stuckJobs.length > 0) {
        this.logger.log(`Found ${stuckJobs.length} stuck jobs, requeuing them...`);
        
        // Update their status to PENDING and reset processedAt
        await Promise.all(
          stuckJobs.map(job =>
            this.processedFileRepository.update(
              { s3Key: job.s3Key, bucket: job.bucket },
              {
                status: ProcessedFileStatus.PENDING,
                processedAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                  ...job.metadata,
                  lastStuckReset: new Date().toISOString(),
                  previousStatus: job.status,
                }
              } as DeepPartial<ProcessedFile>
            )
          )
        );
      }
    } catch (error) {
      this.logger.error(`Error requeuing stuck jobs: ${error.message}`);
      // Don't throw the error, as we want to continue processing new files
    }
  }

  async processLocalFile(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const logs: LogEntry[] = JSON.parse(fileContent);
      await this.processLogs(logs);
      this.logger.log(`Successfully processed local file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error processing local file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  private async processS3File(bucket: string, key: string): Promise<void> {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRIES) {
      try {
        this.logger.log(`Processing file ${bucket}/${key} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        const content = await this.storageService.getFileContent(bucket, key);
        
        // Verify the content is valid JSON
        try {
          const logs: LogEntry[] = JSON.parse(content);
          await this.processLogs(logs);
          return; // Success, exit the retry loop
        } catch (jsonError) {
          this.logger.error(`JSON parsing error for ${bucket}/${key}: ${jsonError.message}`);
          throw new Error(`Invalid JSON content: ${jsonError.message}`);
        }
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (error.message.includes('incorrect header check') || error.name === 'ZlibError') {
          this.logger.error(`Gzip decompression error for ${bucket}/${key} (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
          if (retryCount < MAX_RETRIES) {
            this.logger.log(`Retrying after 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
        
        // For other errors or if we've exhausted retries, throw the error
        throw error;
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError || new Error(`Failed to process file after ${MAX_RETRIES} attempts`);
  }

  private async processLogs(logs: LogEntry[]): Promise<void> {
    for (const log of logs) {
      try {
        // Validate required fields
        if (!log || typeof log !== 'object') {
          this.logger.warn('Skipping invalid log entry: not an object');
          continue;
        }

        if (!log.timestamp) {
          this.logger.warn('Skipping log entry: missing timestamp');
          continue;
        }

        // Create and save the log with normalized fields
        const logEntity = this.logsRepository.create({
          id: log.req?.id?.toString() || `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(log.timestamp),
          level: log.level || "0",
          method: log.req?.method || 'UNKNOWN',
          url: log.req?.url || 'UNKNOWN',
          query: log.req?.query || null,
          headers: log.req?.headers || {},
          context: log.context || 'UNKNOWN',
          message: log.message || '',
          authUserId: log.authUserId || null,
          pid: log.pid || 0,
          hostname: log.hostname || 'UNKNOWN',
          remoteAddress: log.req?.remoteAddress || 'UNKNOWN',
          remotePort: log.req?.remotePort || 0,
          processingTimeMs: log.processingTimeMs || null,
          cacheHit: log.cacheHit || null,
          documentCount: log.documentCount || null,
          lastUpdated: log.lastUpdated ? new Date(log.lastUpdated) : null,
          params: log.req?.params || null,
          rawData: log, // Store the complete raw log entry
        } as DeepPartial<Log>);

        await this.logsRepository.save(logEntity);
      } catch (error) {
        this.logger.error(`Error processing log entry: ${error.message}`);
        this.logger.debug('Failed log entry:', JSON.stringify(log, null, 2));
        // Continue processing other logs even if one fails
      }
    }
  }

  private async processNewS3Files(bucket: string, prefix?: string): Promise<void> {
    try {
      // List files from S3
      this.processedAnyJobs = true;

      const files = await this.storageService.listFiles(bucket, prefix);
      this.logger.log(`Found ${files.length} files in S3`);

      // Get the timestamp of the most recent log record
      const mostRecentLog = await this.logsRepository.findOne({
        where: {},
        select: ["timestamp"],
        order: {
          timestamp: 'DESC',
        },
      });
      this.logger.log(`Most recent log timestamp: ${mostRecentLog?.timestamp}`);

      // Extract date from file key (format: YYYY-MM-DDTHH:mm:ss.SSSZ)
      const extractDateFromKey = (key: string): Date | null => {
        try {
          const dateStr = key.split('/').pop()?.split('.')[0];
          if (!dateStr) return null;
          return new Date(dateStr);
        } catch (error) {
          this.logger.warn(`Could not extract date from key: ${key}`);
          return null;
        }
      };

      // Filter files by date
      let filteredFiles = files;
      if (mostRecentLog) {
        const lastLogTimestamp = mostRecentLog.timestamp;
        filteredFiles = files.filter(file => {
          const fileDate = extractDateFromKey(file);
          return fileDate && fileDate > lastLogTimestamp;
        });
        this.logger.log(`Found ${filteredFiles.length} files newer than last log timestamp ${lastLogTimestamp.toISOString()}`);
      }

      // Use a transaction to ensure atomic operations
      await this.processedFileRepository.manager.transaction(async (manager) => {
        const processedFileRepo = manager.getRepository(ProcessedFile);

        // Find which files are already in the database
        const existingFiles = await processedFileRepo.find({
          where: {
            s3Key: In(filteredFiles),
            bucket,
          },
          lock: { mode: 'pessimistic_write' },
        });

        const existingFileMap = new Map(
          existingFiles.map(file => [file.s3Key, file])
        );

        // Filter out files that are already processed
        const newFiles = filteredFiles.filter(file => {
          const existingFile = existingFileMap.get(file);
          return !existingFile || 
                 existingFile.status === ProcessedFileStatus.FAILED ||
                 (existingFile.status === ProcessedFileStatus.PROCESSING && 
                  new Date().getTime() - existingFile.processedAt.getTime() > this.stuckTimeout);
        });

        if (newFiles.length === 0) {
          this.logger.log('No new files to process');
          return;
        }

        this.logger.log(`Found ${newFiles.length} new files to process`);

        // Create entries for new files
        const filesToCreate = newFiles.map(file => ({
          s3Key: file,
          bucket,
          status: ProcessedFileStatus.PENDING,
          processedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // Save new files to database
        await processedFileRepo.save(filesToCreate);
        this.logger.log(`Created ${filesToCreate.length} new file entries`);
      });

      // Process the newly created jobs
      await this.processFiles(bucket, prefix);
    } catch (error) {
      this.logger.error(`Error processing new S3 files: ${error.message}`, error.stack);
      throw error;
    }
  }
}