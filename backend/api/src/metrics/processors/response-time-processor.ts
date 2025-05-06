import { Injectable } from '@nestjs/common';
import {
  MetricQuery,
  MetricResult,
  MetricType,
  MetricValue,
} from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';

interface RawTimeData {
  timestamp: string;
  value: string;
}

@Injectable()
export class ResponseTimeProcessor extends BaseMetricProcessor {
  type = MetricType.DISTRIBUTION;

  async process(query: MetricQuery): Promise<MetricResult> {
    const { resolution, startDate, endDate } = query;
    const timeBucket = this.getTimeBucket(resolution);

    // Query logs table for processing time
    const logData = await this.logRepository
      .createQueryBuilder('log')
      .select(
        `DATE_TRUNC('${timeBucket}', log.timestamp) as timestamp, log.processingTimeMs as value`,
      )
      .where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('log.processingTimeMs IS NOT NULL')
      .orderBy('timestamp', 'ASC')
      .getRawMany<RawTimeData>();

    const values: MetricValue[] = logData.map((item) => ({
      timestamp: new Date(item.timestamp),
      value: parseFloat(item.value),
    }));

    return {
      values,
      aggregatedValue:
        values.reduce((sum, v) => sum + v.value, 0) / values.length,
    };
  }
}
