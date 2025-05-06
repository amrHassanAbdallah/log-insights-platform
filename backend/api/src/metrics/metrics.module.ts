import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';
import { CommonIntentsProcessor } from './processors/common-intents-processor';
import { CommonQuestionsProcessor } from './processors/common-questions-processor';
import { CommonTopicsProcessor } from './processors/common-topics-processor';
import { IMetricProcessor } from './processors/metric-processor.interface';
import { MetricsResolver } from './resolvers/metrics.resolver';
import { MetricsService } from './services/metrics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  providers: [
    MetricsResolver,
    MetricsService,
    CommonQuestionsProcessor,
    CommonTopicsProcessor,
    CommonIntentsProcessor,
    {
      provide: 'METRIC_PROCESSORS',
      useFactory: (
        commonQuestionsProcessor: CommonQuestionsProcessor,
        commonTopicsProcessor: CommonTopicsProcessor,
        commonIntentsProcessor: CommonIntentsProcessor,
      ): IMetricProcessor[] => [
        commonQuestionsProcessor,
        commonTopicsProcessor,
        commonIntentsProcessor,
      ],
      inject: [
        CommonQuestionsProcessor,
        CommonTopicsProcessor,
        CommonIntentsProcessor,
      ],
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
