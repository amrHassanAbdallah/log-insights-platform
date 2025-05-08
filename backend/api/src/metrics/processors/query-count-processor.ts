import { LogService } from '@/log/services/log.service';
import { Injectable } from '@nestjs/common';
import { MetricType } from '../types/metric.enums';
import { MetricQuery, MetricResult, MetricValue } from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';

interface QueryCountResult {
  timestamp: string;
  count: number;
}

@Injectable()
export class QueryCountProcessor extends BaseMetricProcessor {
  constructor(protected readonly logService: LogService) {
    super(logService);
  }

  supports(type: MetricType): boolean {
    return type === MetricType.QUERY_COUNT;
  }

  async process(query: MetricQuery): Promise<MetricResult> {
    const { resolution } = query;
    const timeBucket = this.getTimeBucket(resolution);
    const timeBucketExpr = `DATE_TRUNC('${timeBucket}', log.timestamp)`;

    // Create base query for time series data
    const timeSeriesQuery = this.createBaseQuery()
      .select([`${timeBucketExpr} as timestamp`, 'COUNT(*) as count'])


    // Apply common filters
    let filteredTimeSeriesQuery = this.applyCommonFilters(
      timeSeriesQuery,
      query,
    );
    filteredTimeSeriesQuery = filteredTimeSeriesQuery
      .groupBy(timeBucketExpr)
      .orderBy(timeBucketExpr, 'ASC');

    console.log(
      'Filtered Time Series Query:',
      filteredTimeSeriesQuery.getSql(),
    );

    // Execute the query
    const results =
      await filteredTimeSeriesQuery.getRawMany<QueryCountResult>();

    // Transform results to MetricValue format
    const values: MetricValue[] = results.map((result) => ({
      timestamp: new Date(result.timestamp),
      value: Number(result.count),
    }));

    return {
      values,
    };
  }
}
