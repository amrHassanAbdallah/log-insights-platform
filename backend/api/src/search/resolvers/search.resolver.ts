import { Injectable } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { SearchQueryDto } from '../dto/metric-query.dto';
import { SearchService } from '../services/search.service';
import { SearchResult } from '../types/metric.types';

@Injectable()
@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResult)
  async searchLogs(
    @Args('query') query: SearchQueryDto,
  ): Promise<SearchResult> {
    return this.searchService.search(query);
  }
}
