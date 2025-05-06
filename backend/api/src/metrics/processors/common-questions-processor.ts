import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MetricQuery,
  MetricResult,
  MetricType,
  MetricValue,
} from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';
import { Log } from '../entities/log.entity';

interface RawLogData {
  timestamp: string;
  value: string;
  count: string;
}

@Injectable()
export class CommonQuestionsProcessor extends BaseMetricProcessor {
  type = MetricType.SUMMARY;

  constructor(
    @InjectRepository(Log)
    protected readonly logRepository: Repository<Log>,
  ) {
    super(logRepository);
  }

  async process(query: MetricQuery): Promise<MetricResult> {
    const { resolution, startDate, endDate } = query;
    const timeBucket = this.getTimeBucket(resolution);

    const logData = await this.logRepository
      .createQueryBuilder('log')
      .select(
        `DATE_TRUNC('${timeBucket}', log.timestamp) as timestamp, log.query->>'question' as value, COUNT(*) as count`,
      )
      .where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("log.query->>'question' IS NOT NULL")
      .groupBy(
        `DATE_TRUNC('${timeBucket}', log.timestamp), log.query->>'question'`,
      )
      .orderBy('count', 'DESC')
      .getRawMany<RawLogData>();

    const values: MetricValue[] = logData.map((item) => ({
      timestamp: new Date(item.timestamp),
      value: parseFloat(item.count),
      metadata: {
        question: item.value,
      },
    }));

    return {
      values,
      aggregatedValue:
        values.reduce((sum, v) => sum + v.value, 0) / values.length,
    };
  }
}
