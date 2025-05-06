import { Column, Entity, PrimaryColumn } from 'typeorm';

interface LogQuery {
  intent?: string;
  topic?: string;
  question?: string;
  [key: string]: any;
}

@Entity('logs')
export class Log {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ nullable: true })
  level: string;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column({ type: 'jsonb' })
  query: LogQuery;

  @Column({ type: 'jsonb' })
  headers: Record<string, string>;

  @Column()
  context: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  authUserId: number;

  @Column()
  remoteAddress: string;

  @Column()
  remotePort: number;

  @Column({ nullable: true })
  processingTimeMs: number;

  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, any>;

  @Column({ type: 'jsonb' })
  rawData: Record<string, any>;
}
