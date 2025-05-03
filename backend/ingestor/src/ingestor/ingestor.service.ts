import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { DeepPartial, In, LessThan, Repository } from 'typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFile, ProcessedFileStatus } from '../entities/processed-file.entity';
import { StorageService } from '../services/storage.service';

interface LogEntry {
  level: number;
  time: number;
  timestamp: string;
  pid: number;
  hostname: string;
  req: {
    id: number;
    method: string;
    url: string;
    query: Record<string, any>;
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
  private readonly processingQueue: { bucket: string; key: string }[] = [];
  private readonly BATCH_SIZE = 100; // Process files in batches of 100
  private readonly STUCK_JOB_TIMEOUT = 1 * 60 * 1000; // 1 minute in milliseconds
  private readonly PAGE_SIZE = 50; // Number of jobs to process per page

  constructor(
    @InjectRepository(Log)
    private readonly logsRepository: Repository<Log>,
    @InjectRepository(ProcessedFile)
    private readonly processedFileRepository: Repository<ProcessedFile>,
    private readonly storageService: StorageService,
  ) {}

  async processFiles(bucket: string, prefix?: string): Promise<void> {
    try {
      // First, check for and requeue stuck jobs
      await this.requeueStuckJobs();
      
      // Get pending or stuck in-progress jobs with pagination
      let page = 0;
      let hasMore = true;

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
    } catch (error) {
      this.logger.error(`Error processing files: ${error.message}`);
      throw error;
    }
  }

  private async getPendingJobs(page: number): Promise<ProcessedFile[]> {
    const stuckTime = new Date(Date.now() - this.STUCK_JOB_TIMEOUT);
    
    return await this.processedFileRepository.find({
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
      skip: page * this.PAGE_SIZE,
      take: this.PAGE_SIZE,
    });
  }

  private async markJobsAsProcessing(jobs: ProcessedFile[]): Promise<void> {
    if (jobs.length === 0) return;

    await this.processedFileRepository.update(
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
  }

  private async requeueStuckJobs(): Promise<void> {
    try {
      this.logger.log('Checking for stuck jobs...');
      const stuckTime = new Date(Date.now() - this.STUCK_JOB_TIMEOUT);
      
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
          query: log.req?.query || {},
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
}