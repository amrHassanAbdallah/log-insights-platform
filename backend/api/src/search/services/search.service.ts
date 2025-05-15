import { Injectable } from '@nestjs/common';
import { SearchQueryDto } from '../dto/metric-query.dto';
import { SearchQuery, SearchResult } from '../types/metric.types';
import { LogService } from '@/log/services/log.service';

@Injectable()
export class SearchService {
  constructor(private readonly logService: LogService) {}

  async search(query: SearchQueryDto): Promise<SearchResult> {
    //todo mapping of the dto
    const result = await this.logService.searchLogs(query as SearchQuery);
    return {
      values: result.map((item) => {
        return {
          id: item.id,
          timestamp: item.timestamp,
          metadata: item,
        };
      }),
    };
  }
}
