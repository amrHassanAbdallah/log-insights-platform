import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { IngestorModule } from '../ingestor/ingestor.module';
import { IngestorService } from '../ingestor/ingestor.service';

export const processFilesCommand = new Command()
  .name('process-files')
  .description('Process log files from S3 bucket')
  .requiredOption('-b, --bucket <bucket>', 'S3 bucket name')
  .option('-p, --prefix <prefix>', 'Optional prefix to filter files')
  .action(async (options) => {
    try {
      const app = await NestFactory.createApplicationContext(IngestorModule);
      const ingestorService = app.get(IngestorService);

      await ingestorService.processFiles(options.bucket, options.prefix);
      await app.close();
    } catch (error) {
      console.error('Error processing files:', error.message);
      process.exit(1);
    }
  }); 