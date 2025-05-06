import { MetricType } from '../types/metric.enums';
import { MetricQuery, MetricResult } from '../types/metric.types';

export interface IMetricProcessor {
  supports(type: MetricType): boolean;
  process(query: MetricQuery): Promise<MetricResult>;
}
