import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  query: string;

  @Column({ nullable: true })
  response: string;

  @Column({ nullable: true })
  intent: string;

  @Column({ nullable: true })
  topic: string;

  @Column({ nullable: true })
  question: string;

  @CreateDateColumn()
  createdAt: Date;
} 