import { registerEnumType } from '@nestjs/graphql';

export enum MetricType {
  SUMMARY = 'SUMMARY',
  TIME_SERIES = 'TIME_SERIES',
  DISTRIBUTION = 'DISTRIBUTION',
  QUERY_COUNT = 'QUERY_COUNT',
}

export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  P50 = 'P50',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
}

registerEnumType(MetricType, { name: 'MetricType' });
registerEnumType(AggregationType, { name: 'AggregationType' });
