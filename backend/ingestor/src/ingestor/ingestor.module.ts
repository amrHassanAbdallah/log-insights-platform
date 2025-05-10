import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from '../entities/log.entity';
import { ProcessedFile } from '../entities/processed-file.entity';
import { IngestorService } from './ingestor.service';
import { StorageService } from './storage.service';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'islamicfinanceguru',
      entities: [Log, ProcessedFile],
      migrations: [join(__dirname,'..', 'migrations', '*.{ts,js}')],
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forFeature([Log, ProcessedFile]),
  ],
  providers: [
    IngestorService,
    StorageService,
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