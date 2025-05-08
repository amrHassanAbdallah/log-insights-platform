import { Injectable } from '@nestjs/common';
import { MetricType } from '../types/metric.enums';
import { MetricQuery, MetricResult, MetricValue } from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';
import { LogService } from '@/log/services/log.service';

@Injectable()
export class QueryFrequencyProcessor extends BaseMetricProcessor {
    constructor(protected readonly logService: LogService) {
        super(logService);
    }

  supports(type: MetricType): boolean {
    return type === MetricType.QUERY_FREQUENCY;
  }

  async process(query: MetricQuery): Promise<MetricResult> {
    const { startDate, endDate, resolution } = query;
    const field =  'query';

    const queryBuilder = this.createBaseQuery();
    queryBuilder
      .select(`log.log_data->>'${field}'`, 'value')
      .addSelect('COUNT(*)', 'count')
      .where(`log.log_data->>'type' = :type`, { type: 'QUERY' })
      .andWhere(`log.log_data->>'${field}' IS NOT NULL`)
      .andWhere(`(log.log_data->>'timestamp')::timestamptz BETWEEN :startDate AND :endDate`, {
        startDate,
        endDate,
      })
      .groupBy(`log.log_data->>'${field}'`)
      .orderBy('count', 'DESC')
      .limit(10);
    
    const rawResults = await queryBuilder.getRawMany();
    const values: MetricValue[] = rawResults.map(row => ({
      value: Number(row.count),
      metadata: {
        query: row.value,
      },
    }));

    return {
      values,
    };
  }
}