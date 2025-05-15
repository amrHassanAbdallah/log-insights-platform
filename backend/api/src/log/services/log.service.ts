import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Log } from '../entities/log.entity';
import { SearchQuery } from '@/search/types/metric.types';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
  ) {}

  createQueryBuilder(): SelectQueryBuilder<Log> {
    return this.logRepository.createQueryBuilder('log');
  }

  async executeQuery(queryBuilder: SelectQueryBuilder<Log>): Promise<Log[]> {
    return queryBuilder.getMany();
  }

  // Helper methods for common query patterns
  withDateRange(queryBuilder: SelectQueryBuilder<Log>, startDate: Date, endDate: Date): SelectQueryBuilder<Log> {
    return queryBuilder.where('log.timestamp BETWEEN :startDate AND :endDate', {
      startDate,
      endDate,
    });
  }

  withIntent(queryBuilder: SelectQueryBuilder<Log>, intent: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.query->>\'intent\' = :intent', { intent });
  }

  withTopic(queryBuilder: SelectQueryBuilder<Log>, topic: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.query->>\'topic\' = :topic', { topic });
  }

  withQuestion(queryBuilder: SelectQueryBuilder<Log>, question: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.query->>\'question\' = :question', { question });
  }

  withContext(queryBuilder: SelectQueryBuilder<Log>, context: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.context = :context', { context });
  }

  withLevel(queryBuilder: SelectQueryBuilder<Log>, level: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.level = :level', { level });
  }

  withMethod(queryBuilder: SelectQueryBuilder<Log>, method: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.method = :method', { method });
  }

  withUrl(queryBuilder: SelectQueryBuilder<Log>, url: string): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.url = :url', { url });
  }

  withAuthUserId(queryBuilder: SelectQueryBuilder<Log>, userId: number): SelectQueryBuilder<Log> {
    return queryBuilder.andWhere('log.authUserId = :userId', { userId });
  }

  // Example of a more complex query using the builder pattern
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<Log[]> {
    const queryBuilder = this.createQueryBuilder();
    return this.executeQuery(
      this.withDateRange(queryBuilder, startDate, endDate)
    );
  }

  async getLogsByIntent(intent: string, startDate: Date, endDate: Date): Promise<Log[]> {
    const queryBuilder = this.createQueryBuilder();
    return this.executeQuery(
      this.withIntent(queryBuilder, intent)
        .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
    );
  }

  async getLogsByTopic(topic: string, startDate: Date, endDate: Date): Promise<Log[]> {
    const queryBuilder = this.createQueryBuilder();
    return this.executeQuery(
      this.withTopic(queryBuilder, topic)
        .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
    );
  }

  async getLogsByQuestion(question: string, startDate: Date, endDate: Date): Promise<Log[]> {
    const queryBuilder = this.createQueryBuilder();
    return this.executeQuery(
      this.withQuestion(queryBuilder, question)
        .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
    );
  }


  async searchLogs(query: SearchQuery): Promise<Log[]> {
    //do some validation over the filters size and all of that
    let queryBuilder = this.createQueryBuilder();
    //select * from "public"."logs" where context = 'DealBotService' and "rawData"->>'query' like '%a%'
    queryBuilder = queryBuilder.andWhere('log.context = :context', { context: 'DealBotService' });
    queryBuilder = queryBuilder.andWhere('log.rawData->>\'query\' LIKE :query', { query: `%${query.filters[0].value}%` });
    //todo do sorting/ pagination.

    return queryBuilder.getMany()

  }
} 