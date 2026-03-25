import { NatsModule } from 'src/common/transports/nats.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [NatsModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
