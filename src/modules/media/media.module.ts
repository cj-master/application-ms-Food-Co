import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { NatsModule } from 'src/common';

@Module({
  imports: [NatsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
