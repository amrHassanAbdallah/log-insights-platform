import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { Log } from '@/log/entities/log.entity';
import { MetricType } from '../types/metric.enums';
import {
  FilterCondition,
  FilterField,
  FilterOperator,
  MetricQuery,
  MetricResult,
} from '../types/metric.types';
import { IMetricProcessor } from './metric-processor.interface';
import { LogService } from '@/log/services/log.service';

/**
 * Base class for metric processors that provides common functionality for querying and filtering logs.
 *
 * This class implements the core functionality needed by all metric processors:
 * - Date range filtering
 * - Custom field filtering
 * - Pagination
 * - Time bucket resolution
 *
 * Extend this class to create specific metric processors (e.g., ResponseTimeProcessor, QueryCountProcessor).
 *
 * @example
 * ```typescript
 * @Injectable()
 * class CustomMetricProcessor extends BaseMetricProcessor {
 *   supports(type: MetricType): boolean {
 *     return type === MetricType.SUMMARY;
 *   }
 *
 *   async process(query: MetricQuery): Promise<MetricResult> {
 *     const baseQuery = this.createBaseQuery();
 *     // Add your specific query logic here
 *     const results = await this.applyCommonFilters(baseQuery, query).getMany();
 *     // Process results and return
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseMetricProcessor implements IMetricProcessor {
  protected constructor(
     protected readonly logService: LogService,
  ) {}

  /**
   * Determines if this processor supports the given metric type.
   * @param type - The metric type to check
   * @returns true if this processor can handle the given type
   */
  abstract supports(type: MetricType): boolean;

  /**
   * Processes the metric query and returns the results.
   * @param query - The metric query containing filters, date range, and pagination
   * @returns A promise resolving to the metric results
   */
  abstract process(query: MetricQuery): Promise<MetricResult>;

  /**
   * Creates a base query builder with common configurations.
   * @returns A configured query builder
   */
  protected createBaseQuery(): SelectQueryBuilder<Log> {
    return this.logService.createQueryBuilder();
  }

  /**
   * Applies common filters to a query (date range, custom filters, pagination, sorting).
   * @param queryBuilder - The query builder to modify
   * @param query - The metric query containing filters
   * @returns The modified query builder
   */
  protected applyCommonFilters(
    queryBuilder: SelectQueryBuilder<Log>,
    query: MetricQuery,
  ): SelectQueryBuilder<Log> {
    // Apply date range filter if provided
    if (query.startDate && query.endDate) {
      queryBuilder.where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    // Apply additional filters if provided
    if (query.filters && query.filters.length > 0) {
      query.filters.forEach((filter, index) => {
        const condition = this.buildFilterCondition(filter, index);
        queryBuilder.andWhere(condition.sql, condition.parameters);
      });
    }

    // Apply sorting
    const sort = query.sort || { field: 'timestamp', order: 'DESC' };
    queryBuilder.orderBy(`log.${sort.field}`, sort.order);

    // Apply pagination if no date range is provided
    if (!query.startDate || !query.endDate) {
      const { limit = 10, offset = 0 } = query.pagination || {};
      queryBuilder.skip(offset).take(limit);
    }

    return queryBuilder;
  }

  /**
   * Converts a resolution string to a time bucket unit for SQL queries.
   * @param resolution - The resolution string (HOUR, DAY, WEEK, MONTH)
   * @returns The corresponding time bucket unit
   */
  protected getTimeBucket(resolution?: string): string {
    switch (resolution) {
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

  /**
   * Retrieves time series data based on the provided query parameters.
   * Applies date range filtering, custom filters, and pagination.
   *
   * @param query - The metric query containing filters and pagination
   * @returns A promise resolving to an array of logs matching the query
   *
   * @example
   * ```typescript
   * // Query with date range and filters
   * const logs = await this.getTimeSeriesData({
   *   startDate: new Date('2024-01-01'),
   *   endDate: new Date('2024-01-31'),
   *   filters: [{
   *     field: FilterField.INTENT,
   *     operator: FilterOperator.EQUALS,
   *     value: 'greeting'
   *   }]
   * });
   * ```
   */
  protected async getTimeSeriesData(query: MetricQuery): Promise<Log[]> {
    const { startDate, endDate, pagination, filters } = query;
    const queryBuilder = this.logService.createQueryBuilder();

    // Apply date range filter if provided
    if (startDate && endDate) {
      queryBuilder.where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Apply additional filters if provided
    if (filters && filters.length > 0) {
      filters.forEach((filter, index) => {
        const condition = this.buildFilterCondition(filter, index);
        queryBuilder.andWhere(condition.sql, condition.parameters);
      });
    }

    // Always apply pagination
    const { limit = 10, offset = 0 } = pagination || {};
    queryBuilder.skip(offset).take(limit);

    return queryBuilder.getMany();
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

  /**
   * Builds a SQL condition for a filter.
   * @param filter - The filter condition
   * @param index - The index of the filter (used for parameter naming)
   * @returns An object containing the SQL condition and parameters
   */
  protected buildFilterCondition(
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

  /**
   * Gets the SQL field name for a filter field.
   * @param field - The filter field
   * @returns The corresponding SQL field name
   */
  protected getFilterField(field: FilterField): string {
    switch (field) {
      case FilterField.MESSAGE:
        return 'log.message';
      case FilterField.CONTENT:
        return 'log.content';
      case FilterField.CONTEXT:
        return 'log.context';
      case FilterField.INTENT:
        return "log.query->>'intent'";
      case FilterField.TOPIC:
        return "log.query->>'topic'";
      default:
        return 'log.message';
    }
  }

  /**
   * Gets the SQL operator for a filter operator.
   * @param operator - The filter operator
   * @returns The corresponding SQL operator
   */
  protected getFilterOperator(operator: FilterOperator): string {
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

  /**
   * Gets the SQL value for a filter value based on the operator.
   * @param value - The filter value
   * @param operator - The filter operator
   * @returns The formatted SQL value
   */
  protected getFilterValue(value: string, operator: FilterOperator): string {
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
