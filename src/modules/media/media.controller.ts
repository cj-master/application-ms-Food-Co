import { EventPattern, Payload } from '@nestjs/microservices';
import { MediaService } from './media.service';
import { Controller } from '@nestjs/common';
import { MEDIA_EVENTS } from './const/const';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  // Escucha el evento que emite el Upload Service al confirmar un upload
  @EventPattern(MEDIA_EVENTS.PROCESS)
  handleMediaProcess(@Payload() payload: { key: string; resource: string; entityId: string;}) {
    return this.mediaService.processMedia(payload);
  }
}