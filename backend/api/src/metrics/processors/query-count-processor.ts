import { Injectable } from '@nestjs/common';
import { MetricQuery, MetricResult, MetricType } from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';

@Injectable()
export class QueryCountProcessor extends BaseMetricProcessor {
  type = MetricType.TIME_SERIES;

  async process(query: MetricQuery): Promise<MetricResult> {
    const result = await this.getTimeSeriesData(query);
    return {
      values: result.values,
      aggregatedValue: result.aggregatedValue,
    };
  }
}
