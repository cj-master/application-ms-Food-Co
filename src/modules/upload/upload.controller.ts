import {
  RequestUploadUrlDto,
  RequestMultipleUploadUrlsDto,
  DeleteUploadDto,
  DeleteMultipleUploadsDto,
  ConfirmUploadDto,
  ReplaceUploadUrlDto,
  ReplaceMultipleUploadUrlsDto
} from './dtos/dtos';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UPLOAD_PATTERNS } from './const/const';
import { UploadService } from './upload.service';
import { Controller } from '@nestjs/common';

@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  // ── Solicitar una presigned URL — avatar, logo, portada, galería ───────────
  @MessagePattern(UPLOAD_PATTERNS.REQUEST_URL)
  requestUploadUrl(@Payload() dto: RequestUploadUrlDto) {
    return this.uploadService.requestUploadUrl(dto);
  }

  // ── Solicitar múltiples URLs — carrusel de post (hasta 5 imágenes) ─────────
  @MessagePattern(UPLOAD_PATTERNS.REQUEST_MULTIPLE)
  requestMultipleUploadUrls(@Payload() dto: RequestMultipleUploadUrlsDto) {
    return this.uploadService.requestMultipleUploadUrls(dto);
  }

  // ── Confirmar upload — dispara procesamiento de variantes ──────────────────
  @MessagePattern(UPLOAD_PATTERNS.CONFIRM)
  confirmUpload(@Payload() dto: ConfirmUploadDto) {
    return this.uploadService.confirmUpload(dto);
  }

  @MessagePattern(UPLOAD_PATTERNS.REPLACE_URL)
  replaceUrl(@Payload() dto: ReplaceUploadUrlDto) {
    return this.uploadService.requestReplaceUrl(dto);
  }

  @MessagePattern(UPLOAD_PATTERNS.REPLACE_MULTIPLE)
  replaceMultipleUrls(@Payload() dto: ReplaceMultipleUploadUrlsDto) {
    return this.uploadService.requestReplaceMultipleUrls(dto);
  }

  // ── Eliminar una imagen ────────────────────────────────────────────────────
  @MessagePattern(UPLOAD_PATTERNS.DELETE)
  deleteUpload(@Payload() dto: DeleteUploadDto) {
    return this.uploadService.deleteUpload(dto);
  }

  // ── Eliminar múltiples imágenes ────────────────────────────────────────────
  @MessagePattern(UPLOAD_PATTERNS.DELETE_MULTIPLE)
  deleteMultipleUploads(@Payload() dto: DeleteMultipleUploadsDto) {
    return this.uploadService.deleteMultipleUploads(dto);
  }
}