import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedFile } from '../entities/processed-file.entity';
import { StorageService } from '../services/storage.service';
import { IngestorService } from './ingestor.service';
import { Log } from 'src/entities/log.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'dealbot',
      entities: [Log, ProcessedFile],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Log, ProcessedFile]),
  ],
  providers: [IngestorService, StorageService],
  exports: [IngestorService],
})
export class IngestorModule {} 