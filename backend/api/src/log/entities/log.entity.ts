import { Column, Entity, Index, PrimaryColumn } from 'typeorm';


@Entity('logs')
@Index(['timestamp', 'context'])
@Index('idx_rawdata_query', { synchronize: false })
export class Log {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ nullable: true })
  level: string;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  query?: string;

  @Column({ type: 'jsonb' })
  headers: Record<string, string>;

  @Column()
  @Index()
  context: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  @Index()
  authUserId: number;

  @Column()
  remoteAddress: string;

  @Column()
  remotePort: number;

  @Column({ nullable: true })
  @Index()
  processingTimeMs: number;

  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, any>;

  @Column({ type: 'jsonb' })
  rawData: Record<string, any>;
}
