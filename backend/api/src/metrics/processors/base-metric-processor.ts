import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AggregationType,
  FilterCondition,
  FilterField,
  FilterOperator,
  MetricQuery,
  MetricResult,
  MetricType,
  MetricValue,
} from '../types/metric.types';
import { IMetricProcessor } from './metric-processor.interface';
import { Log } from '../entities/log.entity';

interface RawLogData {
  timestamp: string;
  value: string;
}

interface RawAggregatedData {
  value: string;
}

@Injectable()
export abstract class BaseMetricProcessor implements IMetricProcessor {
  constructor(
    @InjectRepository(Log) protected readonly logRepository: Repository<Log>,
  ) {}

  abstract type: MetricType;
  abstract process(query: MetricQuery): Promise<MetricResult>;

  supports(type: MetricType): boolean {
    return this.type === type;
  }

  protected async getTimeSeriesData(
    query: MetricQuery,
  ): Promise<{ values: MetricValue[]; aggregatedValue?: number }> {
    const { resolution, startDate, endDate, filters, aggregation } = query;
    const timeBucket = this.getTimeBucket(resolution);

    // Query logs table with aggregation
    const logDataQuery = this.logRepository
      .createQueryBuilder('log')
      .select(
        `DATE_TRUNC('${timeBucket}', log.timestamp) as timestamp, COUNT(*) as value`,
      )
      .where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    // Apply filters to the query
    if (filters && filters.length > 0) {
      filters.forEach((filter, index) => {
        const condition = this.buildFilterCondition(filter, index);
        logDataQuery.andWhere(condition.sql, condition.parameters);
      });
    }

    const logData = await logDataQuery
      .groupBy(`DATE_TRUNC('${timeBucket}', log.timestamp)`)
      .orderBy('timestamp', 'ASC')
      .getRawMany<RawLogData>();

    const values = logData.map((item) => ({
      timestamp: new Date(item.timestamp),
      value: parseInt(item.value),
    }));

    // If aggregation is specified, calculate the aggregated value
    if (aggregation) {
      const aggregationSql = this.getAggregationSql(aggregation);
      const aggregatedQuery = this.logRepository
        .createQueryBuilder('log')
        .select(aggregationSql)
        .where('log.timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });

      if (filters && filters.length > 0) {
        filters.forEach((filter, index) => {
          const condition = this.buildFilterCondition(filter, index);
          aggregatedQuery.andWhere(condition.sql, condition.parameters);
        });
      }

      const aggregatedResult =
        await aggregatedQuery.getRawOne<RawAggregatedData>();
      return {
        values,
        aggregatedValue: aggregatedResult
          ? parseFloat(aggregatedResult.value)
          : undefined,
      };
    }

    return { values };
  }

  protected calculatePercentiles(
    values: number[],
    percentiles: number[],
  ): Record<number, number> {
    const sortedValues = [...values].sort((a, b) => a - b);
    const result: Record<number, number> = {};

    for (const percentile of percentiles) {
      if (percentile < 0 || percentile > 100) continue;
      const index = Math.floor((percentile / 100) * (sortedValues.length - 1));
      result[percentile] = sortedValues[index];
    }

    return result;
  }

  protected getTimeBucket(resolution: string): string {
    switch (resolution) {
      case 'SECOND':
        return 'second';
      case 'MINUTE':
        return 'minute';
      case 'HOUR':
        return 'hour';
      case 'DAY':
        return 'day';
      case 'WEEK':
        return 'week';
      case 'MONTH':
        return 'month';
      default:
        return 'day';
    }
  }

  private getAggregationSql(aggregation: AggregationType): string {
    switch (aggregation) {
      case AggregationType.COUNT:
        return 'COUNT(*) as value';
      case AggregationType.SUM:
        return "SUM(CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.AVG:
        return "AVG(CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.MIN:
        return "MIN(CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.MAX:
        return "MAX(CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.P50:
        return "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.P90:
        return "PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.P95:
        return "PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(log.query->>'value' AS FLOAT)) as value";
      case AggregationType.P99:
        return "PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY CAST(log.query->>'value' AS FLOAT)) as value";
      default:
        return 'COUNT(*) as value';
    }
  }

  private buildFilterCondition(
    filter: FilterCondition,
    index: number,
  ): { sql: string; parameters: Record<string, string> } {
    const field = this.getFilterField(filter.field);
    const operator = this.getFilterOperator(filter.operator);
    const paramName = `filter${index}`;

    return {
      sql: `${field} ${operator} :${paramName}`,
      parameters: {
        [paramName]: this.getFilterValue(filter.value, filter.operator),
      },
    };
  }

  private getFilterField(field: FilterField): string {
    switch (field) {
      case FilterField.MESSAGE:
        return 'log.message';
      case FilterField.CONTENT:
        return 'log.content';
      case FilterField.CONTEXT:
        return 'log.context';
      case FilterField.INTENT:
        return 'log.intent';
      case FilterField.TOPIC:
        return 'log.topic';
      default:
        return 'log.message';
    }
  }

  private getFilterOperator(operator: FilterOperator): string {
    switch (operator) {
      case FilterOperator.EQUALS:
        return '=';
      case FilterOperator.CONTAINS:
        return 'ILIKE';
      case FilterOperator.STARTS_WITH:
        return 'ILIKE';
      case FilterOperator.ENDS_WITH:
        return 'ILIKE';
      default:
        return '=';
    }
  }

  private getFilterValue(value: string, operator: FilterOperator): string {
    switch (operator) {
      case FilterOperator.CONTAINS:
        return `%${value}%`;
      case FilterOperator.STARTS_WITH:
        return `${value}%`;
      case FilterOperator.ENDS_WITH:
        return `%${value}`;
      default:
        return value;
    }
  }
}
