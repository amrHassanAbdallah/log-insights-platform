import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MetricType } from '../types/metric.enums';
import {
  FilterField,
  FilterOperator,
  MetricResolution,
} from '../types/metric.types';

@InputType('PaginationParamsInput')
export class PaginationParamsInput {
  @Field(() => Number, { defaultValue: 0 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 0;

  @Field(() => Number, { defaultValue: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

@InputType('SortParams')
export class SortParams {
  @Field(() => String, { defaultValue: 'timestamp' })
  @IsOptional()
  @IsString()
  field?: string = 'timestamp';

  @Field(() => String, { defaultValue: 'DESC' })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';
}

@InputType('FilterConditionInput')
export class FilterConditionInput {
  @Field(() => FilterField)
  @IsEnum(FilterField)
  field: FilterField;

  @Field(() => FilterOperator)
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @Field()
  @IsString()
  value: string;
}

@InputType('MetricQuery')
export class MetricQueryDto {
  @Field(() => MetricType, { defaultValue: MetricType.QUERY_COUNT })
  @IsOptional()
  @IsEnum(MetricType)
  type?: MetricType = MetricType.QUERY_COUNT;

  @Field({ defaultValue: 'default' })
  @IsOptional()
  @IsString()
  name?: string = 'default';

  @Field(() => MetricResolution, { defaultValue: MetricResolution.HOUR })
  @IsOptional()
  @IsEnum(MetricResolution)
  resolution?: MetricResolution = MetricResolution.HOUR;

  @Field()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date = new Date(Date.now() - 24 * 60 * 60 * 1000);

  @Field()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date = new Date();

  @Field({ nullable: true, defaultValue: null })
  @IsOptional()
  @IsString()
  context?: string = null;

  @Field(() => [FilterConditionInput], { nullable: true, defaultValue: [] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionInput)
  filters?: FilterConditionInput[] = [];

  @Field(() => PaginationParamsInput, {
    nullable: true,
    defaultValue: new PaginationParamsInput(),
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationParamsInput)
  pagination?: PaginationParamsInput = new PaginationParamsInput();

  @Field(() => SortParams, { nullable: true, defaultValue: new SortParams() })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortParams)
  sort?: SortParams = new SortParams();
}
