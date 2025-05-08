import { LogModule } from '@/log/log.module';
import { Module } from '@nestjs/common';
import { IMetricProcessor } from './processors/metric-processor.interface';
import { QueryCountProcessor } from './processors/query-count-processor';
import { ResponseTimeProcessor } from './processors/response-time-processor';
import { MetricsResolver } from './resolvers/metrics.resolver';
import { MetricsService } from './services/metrics.service';
import { QueryFrequencyProcessor } from './processors/top-questions-processor';

@Module({
  imports: [LogModule],
  providers: [
    MetricsResolver,
    MetricsService,
    QueryCountProcessor,
    QueryFrequencyProcessor,
    ResponseTimeProcessor,
    {
      provide: 'METRIC_PROCESSORS',
      useFactory: (
        queryCountProcessor: QueryCountProcessor,
        queryFrequencyProcessor: QueryFrequencyProcessor,
        responseTimeProcessor: ResponseTimeProcessor,
      ): IMetricProcessor[] => [
        queryCountProcessor,
        queryFrequencyProcessor,
        responseTimeProcessor,
      ],
      inject: [QueryCountProcessor, QueryFrequencyProcessor, ResponseTimeProcessor],
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
