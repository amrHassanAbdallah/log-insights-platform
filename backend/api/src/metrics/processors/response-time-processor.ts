import { LogService } from '@/log/services/log.service';
import { Injectable } from '@nestjs/common';
import { MetricType } from '../types/metric.enums';
import { MetricQuery, MetricResult, MetricValue } from '../types/metric.types';
import { BaseMetricProcessor } from './base-metric-processor';

@Injectable()
export class ResponseTimeProcessor extends BaseMetricProcessor {
    constructor(protected readonly logService: LogService) {
        super(logService);
    }

    supports(type: MetricType): boolean {
        return type === MetricType.RESPONSE_TIME;
    }

    async process(query: MetricQuery): Promise<MetricResult> {
        const { startDate, endDate, resolution } = query;

        let queryBuilder = this.createBaseQuery();
        queryBuilder
            .select(`date_trunc(:resolution, (log.timestamp)::timestamptz)`, 'bucket')
            .addSelect(`AVG((log.processingTimeMs)::numeric)`, 'avg')
            .addSelect(`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (log.processingTimeMs)::numeric)`, 'p50')
            .addSelect(`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (log.processingTimeMs)::numeric)`, 'p90')
            .where(`log.processingTimeMs IS NOT NULL`)

            queryBuilder = this.applyCommonFilters(queryBuilder, query)
            .groupBy('bucket')
            .orderBy('bucket', 'ASC')
            .setParameter('resolution', resolution);

            console.log(
                'Filtered Time Series Query:',
                queryBuilder.getSql(),
              );
        const rawResults = await queryBuilder.getRawMany();
        const values: MetricValue[] = rawResults.map(row => ({
            timestamp: row.bucket,
            value: Number(row.avg),
            metadata: {
                p50: Number(row.p50),
                p90: Number(row.p90),
            },
        }));

        return { values };
    }
}