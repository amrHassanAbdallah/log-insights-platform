import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { IngestorModule } from '../ingestor/ingestor.module';
import { IngestorService } from '../ingestor/ingestor.service';

export const watchCommand = new Command()
  .name('watch')
  .description('Continuously watch for new log files in S3 bucket')
  .requiredOption('-b, --bucket <bucket>', 'S3 bucket name')
  .option('-p, --prefix <prefix>', 'Optional prefix to filter files')
  .option('-i, --interval <interval>', 'Check interval in seconds', '60')
  .action(async (options) => {
    const logger = new Logger('WatchCommand');
    const interval = parseInt(options.interval) * 1000; // Convert to milliseconds

    try {
      const app = await NestFactory.createApplicationContext(IngestorModule);
      const ingestorService = app.get(IngestorService);

      logger.log(`Starting watch mode for bucket: ${options.bucket}`);
      logger.log(`Check interval: ${options.interval} seconds`);

      // Initial processing
      await ingestorService.processFiles(options.bucket, options.prefix);

      // Set up continuous processing
      const processInterval = setInterval(async () => {
        try {
          logger.log('Checking for new files...');
          await ingestorService.processFiles(options.bucket, options.prefix);
        } catch (error) {
          logger.error(`Error processing files: ${error.message}`);
          // Don't exit on error, continue watching
        }
      }, interval);

      // Handle graceful shutdown
      const shutdown = async () => {
        logger.log('Shutting down...');
        clearInterval(processInterval);
        await app.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

    } catch (error) {
      logger.error(`Error in watch mode: ${error.message}`);
      process.exit(1);
    }
  }); 