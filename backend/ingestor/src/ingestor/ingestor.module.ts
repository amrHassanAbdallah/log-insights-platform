import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFile } from '../entities/processed-file.entity';
import { IngestorService } from './ingestor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, ProcessedFile]),
  ],
  providers: [
    IngestorService,
    {
      provide: 'INGESTOR_CONFIG',
      useValue: {
        stuckTimeout: process.env.INGESTOR_STUCK_TIMEOUT ? parseInt(process.env.INGESTOR_STUCK_TIMEOUT) : 5 * 60 * 1000,
        pageSize: process.env.INGESTOR_PAGE_SIZE ? parseInt(process.env.INGESTOR_PAGE_SIZE) : 50,
      },
    },
  ],
  exports: [IngestorService],
})
export class IngestorModule {} 