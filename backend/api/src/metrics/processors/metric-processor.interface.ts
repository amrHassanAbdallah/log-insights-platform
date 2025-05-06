import { MetricQuery, MetricResult, MetricType } from '../types/metric.types';

export interface IMetricProcessor {
  type: MetricType;
  process(query: MetricQuery): Promise<MetricResult>;
  supports(type: MetricType): boolean;
}
