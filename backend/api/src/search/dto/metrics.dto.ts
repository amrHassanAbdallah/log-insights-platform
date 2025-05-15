import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

@InputType()
export class DateRangeInput {
  @Field(() => String)
  @IsDate()
  startDate: Date;

  @Field(() => String)
  @IsDate()
  endDate: Date;
}

@InputType()
export class ResponseTimeStatsInput {
  @Field(() => [Int], { defaultValue: [50, 90, 95, 99] })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Min(100, { each: true })
  percentiles: number[];

  @Field(() => DateRangeInput, { nullable: true })
  @IsOptional()
  dateRange?: DateRangeInput;
}

@InputType()
export class QueryStatsInput {
  @Field(() => DateRangeInput, { nullable: true })
  @IsOptional()
  dateRange?: DateRangeInput;
}

@InputType()
export class DailyQueryCountsInput {
  @Field(() => DateRangeInput, { nullable: true })
  @IsOptional()
  dateRange?: DateRangeInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  context?: string;
}
