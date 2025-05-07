import { Injectable, UsePipes, Version } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { MetricQueryDto } from '../dto/metric-query.dto';
import { MetricsService } from '../services/metrics.service';
import { MetricResult } from '../types/metric.types';

@Injectable()
@Resolver()
export class MetricsResolver {
  constructor(private readonly metricsService: MetricsService) {}

  @Query(() => MetricResult)
  async getMetrics(
    @Args('query') query: MetricQueryDto,
  ): Promise<MetricResult> {
    return this.metricsService.getMetrics(query);
  }
}
