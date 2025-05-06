import { Field, Float, ObjectType } from '@nestjs/graphql';
import { MetricType } from './metric.enums';

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
}

@ObjectType()
export class MetricValue {
  @Field()
  timestamp: Date;

  @Field(() => Float)
  value: number;

  @Field(() => Float, { nullable: true })
  metadata?: Record<string, any>;
}

@ObjectType()
export class FilterCondition {
  @Field(() => FilterField)
  field: FilterField;

  @Field(() => FilterOperator)
  operator: FilterOperator;

  @Field()
  value: string;
}

@ObjectType()
export class PaginationParams {
  @Field(() => Number, { defaultValue: 0 })
  offset: number;

  @Field(() => Number, { defaultValue: 10 })
  limit: number;
}

@ObjectType()
export class SortParams {
  @Field(() => String, { defaultValue: 'timestamp' })
  field: string;

  @Field(() => String, { defaultValue: 'DESC' })
  order: 'ASC' | 'DESC';
}

@ObjectType()
export class MetricQuery {
  @Field(() => MetricType)
  type: MetricType;

  @Field(() => MetricResolution)
  resolution: MetricResolution;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => [FilterCondition], { nullable: true })
  filters?: FilterCondition[];

  @Field(() => PaginationParams, { nullable: true })
  pagination?: PaginationParams;

  @Field(() => SortParams, { nullable: true })
  sort?: SortParams;
}

@ObjectType()
export class MetricResult {
  @Field(() => [MetricValue])
  values: MetricValue[];

  @Field(() => Float, { nullable: true })
  aggregatedValue?: number;
}
