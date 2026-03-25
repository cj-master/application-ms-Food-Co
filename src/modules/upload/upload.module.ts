import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { NatsModule } from 'src/common';

@Module({
  imports: [NatsModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
