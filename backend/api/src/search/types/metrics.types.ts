import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../common/types/response.types';

@ObjectType()
export class QueryCount {
  @Field()
  date: string;

  @Field()
  count: number;
}

@ObjectType()
export class ResponseTimeStats {
  @Field()
  average: number;

  @Field(() => [Int])
  percentiles: { [key: number]: number };
}

@ObjectType()
export class QueryStats {
  @Field()
  totalQueries: number;

  @Field()
  noResultQueries: number;

  @Field()
  noResultPercentage: number;
}

@ObjectType()
export class DailyQueryCountsResponse extends PaginatedResponse {
  @Field(() => [QueryCount])
  data: QueryCount[];
}

@ObjectType()
export class ResponseTimeStatsResponse extends BaseResponse {
  @Field(() => ResponseTimeStats)
  data: ResponseTimeStats;
}

@ObjectType()
export class QueryStatsResponse extends BaseResponse {
  @Field(() => QueryStats)
  data: QueryStats;
}
