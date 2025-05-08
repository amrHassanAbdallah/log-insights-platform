import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { MetricType } from './metric.enums';
import { GraphQLJSONObject } from 'graphql-type-json';

export enum MetricResolution {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export enum FilterOperator {
  EQUALS = 'EQUALS',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
}

export enum FilterField {
  MESSAGE = 'MESSAGE',
  CONTENT = 'CONTENT',
  CONTEXT = 'CONTEXT',
  INTENT = 'INTENT',
  TOPIC = 'TOPIC',
  IP = 'IP',
}

// Register enums with GraphQL
registerEnumType(MetricResolution, { name: 'MetricResolution' });
registerEnumType(FilterOperator, { name: 'FilterOperator' });
registerEnumType(FilterField, { name: 'FilterField' });

@ObjectType()
export class MetricValue {
  @Field({ nullable: true })
  timestamp?: Date;

  @Field(() => Float)
  value: number;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, any>;
}

export class FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

export class PaginationParams {
  page: number;
  limit: number;
}

export class SortParams {
  field: string;
  order: 'ASC' | 'DESC';
}

export class MetricQuery {
  type: MetricType;
  resolution: MetricResolution;
  startDate?: Date;
  endDate?: Date;
  filters?: FilterCondition[];
  pagination?: PaginationParams;
  sort?: SortParams;
}

@ObjectType()
export class MetricResult {
  @Field(() => [MetricValue])
  values: MetricValue[];
}
