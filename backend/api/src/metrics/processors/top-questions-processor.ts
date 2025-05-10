import { LogService } from '@/log/services/log.service';
import { Injectable } from '@nestjs/common';
import { MetricType } from '../types/metric.enums';
import { MetricQuery, MetricResult, MetricValue } from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';

@Injectable()
export class QueryFrequencyProcessor extends BaseMetricProcessor {
  constructor(protected readonly logService: LogService) {
    super(logService);
  }

  supports(type: MetricType): boolean {
    return type === MetricType.QUERY_FREQUENCY;
  }

  async process(query: MetricQuery): Promise<MetricResult> {
    const field = 'query';

    let queryBuilder = this.createBaseQuery();
    queryBuilder
      .select(`log."rawData"->>'${field}'`, 'value')
      .addSelect('COUNT(*)', 'count')
      .andWhere(`log."rawData"->>'${field}' IS NOT NULL`)

    queryBuilder = this.applyCommonFilters(queryBuilder, query)
      .groupBy(`log."rawData"->>'${field}'`)
      .orderBy('count', 'DESC')
      console.log(
        'Filtered Time Series Query:',
        queryBuilder.getSql(),
      );
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