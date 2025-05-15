import { LogModule } from '@/log/log.module';
import { Module } from '@nestjs/common';
import { SearchResolver } from './resolvers/search.resolver';
import { SearchService } from './services/search.service';

@Module({
  imports: [LogModule],
  providers: [SearchResolver, SearchService],
  exports: [],
})
export class SearchModule {}
