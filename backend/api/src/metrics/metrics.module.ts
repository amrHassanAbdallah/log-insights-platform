import { Module } from '@nestjs/common';
import { IMetricProcessor } from './processors/metric-processor.interface';
import { MetricsResolver } from './resolvers/metrics.resolver';
import { MetricsService } from './services/metrics.service';
import { QueryCountProcessor } from './processors/query-count-processor';
import { LogModule } from '@/log/log.module';

@Module({
  imports: [LogModule],
  providers: [
    MetricsResolver,
    MetricsService,
    QueryCountProcessor,
    {
      provide: 'METRIC_PROCESSORS',
      useFactory: (
        queryCountProcessor: QueryCountProcessor,
      ): IMetricProcessor[] => [queryCountProcessor],
      inject: [QueryCountProcessor],
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
