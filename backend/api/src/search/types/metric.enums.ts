import { registerEnumType } from '@nestjs/graphql';

export enum MetricType {
  QUERY_COUNT = 'QUERY_COUNT',
  QUERY_FREQUENCY = 'QUERY_FREQUENCY',
  RESPONSE_TIME = 'RESPONSE_TIME',
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

export enum MetricResolution {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export enum FilterField {
  CONTENT = 'CONTENT',
  CONTEXT = 'CONTEXT',
  INTENT = 'INTENT',
  IP = 'IP',
  MESSAGE = 'MESSAGE',
  TOPIC = 'TOPIC',
  ANALYSIS_METHOD = 'ANALYSIS_METHOD',
}

export enum FilterOperator {
  CONTAINS = 'CONTAINS',
  ENDS_WITH = 'ENDS_WITH',
  EQUALS = 'EQUALS',
  STARTS_WITH = 'STARTS_WITH',
}

registerEnumType(MetricType, { name: 'MetricType' });
registerEnumType(AggregationType, { name: 'AggregationType' });
registerEnumType(MetricResolution, { name: 'MetricResolution' });
registerEnumType(FilterField, { name: 'FilterField' });
registerEnumType(FilterOperator, { name: 'FilterOperator' });
