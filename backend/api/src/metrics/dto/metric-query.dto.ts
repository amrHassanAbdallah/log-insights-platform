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
import { MetricResolution } from '../types/metric.types';

@InputType('PaginationParams')
export class PaginationParams {
  @Field(() => Number, { defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

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

@InputType('MetricQuery')
export class MetricQueryDto {
  @Field(() => MetricType)
  @IsEnum(MetricType)
  type: MetricType;

  @Field()
  @IsString()
  name: string;

  @Field(() => MetricResolution)
  @IsEnum(MetricResolution)
  resolution: MetricResolution;

  @Field()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @Field()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  context?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  filter?: string;

  @Field(() => PaginationParams, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationParams)
  pagination?: PaginationParams;

  @Field(() => SortParams, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortParams)
  sort?: SortParams;
}
