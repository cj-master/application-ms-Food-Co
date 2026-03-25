import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { NatsModule } from 'src/common/transports/nats.module';

@Module({
  imports: [NatsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
