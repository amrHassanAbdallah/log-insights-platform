import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MetricQueryDto } from '../dto/metric-query.dto';
import { IMetricProcessor } from '../processors/metric-processor.interface';
import { MetricQuery, MetricResult } from '../types/metric.types';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRIC_PROCESSORS')
    private readonly processors: IMetricProcessor[],
  ) {}

  async getMetrics(query: MetricQueryDto): Promise<MetricResult> {
    const processor = this.processors.find((p) => p.supports(query.type));

    if (!processor) {
      throw new NotFoundException(
        `No processor found for metric type: ${query.type}`,
      );
    }

    try {
      return await processor.process(query as MetricQuery);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process metrics: ${errorMessage}`);
    }
  }
}
