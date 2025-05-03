import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum ProcessedFileStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('processed_files')
export class ProcessedFile {
  @PrimaryColumn()
  s3Key: string;

  @Column()
  bucket: string;

  @Column({ type: 'timestamp' })
  processedAt: Date;

  @Column({ type: 'enum', enum: ProcessedFileStatus, default: ProcessedFileStatus.PENDING })
  status: ProcessedFileStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 