import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { ProcessedFileStatus } from './processed-file-status.enum';

@Entity('processed_files')
export class ProcessedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  s3Key: string;

  @Column()
  bucket: string;

  @Column({
    type: 'varchar',
    default: ProcessedFileStatus.PENDING
  })
  status: ProcessedFileStatus;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn({default: 0})
  version: number;
} 