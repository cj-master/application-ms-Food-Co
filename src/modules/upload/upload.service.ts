import {
  RequestUploadUrlDto,
  RequestMultipleUploadUrlsDto,
  DeleteUploadDto,
  DeleteMultipleUploadsDto,
  ConfirmUploadDto,
  ReplaceUploadUrlDto,
  ReplaceMultipleUploadUrlsDto
} from './dtos/dtos';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ALLOWED_IMAGE_TYPES, AllowedMimeType } from 'src/common';
import { UPLOAD_CONFIG, UploadResourceEnum } from './enum/enum';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IPresignedUrlResult } from './interfaces/interfaces';
import { MEDIA_EVENTS } from '../media/const/const';
import { ClientProxy } from '@nestjs/microservices';
import { envs, NATS_SERVICE } from 'src/config';
import { randomUUID } from 'node:crypto'

const PRESIGNED_URL_EXPIRY = 900; // 15 minutos

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: envs.R2_ENDPOINT,
      credentials: {
        accessKeyId: envs.R2_ACCESS_KEY_ID,
        secretAccessKey: envs.R2_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = envs.R2_BUCKET;
  }

  // ── Solicitar presigned URL ────────────────────────────────────────────────
  async requestUploadUrl(dto: RequestUploadUrlDto): Promise<IPresignedUrlResult> {
    // Validar mimetype
    if (!ALLOWED_IMAGE_TYPES[dto.mimeType]) {
      throw new BadRequestException(
        `Formato no soportado: ${dto.mimeType}. Permitidos: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`,
      );
    }

    const config = UPLOAD_CONFIG[dto.resource];
    const uploadId = randomUUID();
    const ext = ALLOWED_IMAGE_TYPES[dto.mimeType as AllowedMimeType];
    const key = this.buildKey(dto, uploadId, ext);

    const variantsWithoutOriginal = config.variants.filter((v) => v.suffix !== '');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.mimeType,
      Metadata: {
        'x-resource-type': dto.resource,
        'x-upload-id': uploadId,
        'x-variants': JSON.stringify(variantsWithoutOriginal),
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    return {
      uploadId,
      uploadUrl,
      key,
      expiresIn: PRESIGNED_URL_EXPIRY,
    };
  }

  // ── Solicitar múltiples URLs (carrusel de posts) ───────────────────────────
  async requestMultipleUploadUrls(dto: RequestMultipleUploadUrlsDto): Promise<IPresignedUrlResult[]> {
    return Promise.all(
      dto.images.map((img) =>
        this.requestUploadUrl({
          ownerId: dto.ownerId,
          resource: UploadResourceEnum.POST_IMAGE,
          mimeType: img.mimeType,   // 👈 viene de cada imagen del carrusel
          postId: dto.postId,
          order: img.order,
        }),
      ),
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REPLACE — borra original + variantes del archivo anterior,
  //           luego genera la presigned URL para el nuevo archivo
  // ────────────────────────────────────────────────────────────────────────────

  async requestReplaceUrl(dto: ReplaceUploadUrlDto): Promise<IPresignedUrlResult> {
    // 1 — Borrar el archivo anterior (original + variantes)
    await this.deleteByKey(dto.currentKey, dto.resource);

    // 2 — Generar nueva presigned URL
    const { currentKey: _, ...uploadDto } = dto;
    return this.requestUploadUrl(uploadDto);
  }

  async requestReplaceMultipleUrls(dto: ReplaceMultipleUploadUrlsDto): Promise<IPresignedUrlResult[]> {
    return Promise.all(
      dto.images.map((img) =>
        this.requestReplaceUrl({
          ownerId: dto.ownerId,
          resource: UploadResourceEnum.POST_IMAGE,
          mimeType: img.mimeType,
          postId: dto.postId,
          order: img.order,
          currentKey: img.currentKey,
        }),
      ),
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE
  async deleteUpload(dto: DeleteUploadDto) {
    await this.deleteByKey(dto.key, dto.resource);

    // Notificar al servicio dueño para que actualice Mongo
    this.client.emit(MEDIA_EVENTS.DELETED(dto.resource), {
      key: dto.key,
      entityId: dto.entityId,  // 👈 necesitas agregar entityId al DeleteUploadDto
    });

    return ({
      message: 'Se elimino la imagen'
    })
  }

  async deleteMultipleUploads(dto: DeleteMultipleUploadsDto) {
    await Promise.all(dto.keys.map((key) => this.deleteByKey(key, dto.resource)));

    return ({
      message: 'Se elimino la imagen'
    })
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONFIRMAR UPLOAD

  async confirmUpload(dto: ConfirmUploadDto): Promise<void> {
    this.client.emit(MEDIA_EVENTS.PROCESS, {
      key: dto.key,
      resource: dto.resource,
      entityId: dto.entityId,
    });
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  // Borra el original (extensión nativa) + todas las variantes (.webp)
  private async deleteByKey(key: string, resource: UploadResourceEnum) {
    const config = UPLOAD_CONFIG[resource];

    const variantKeys = config.variants
      .filter((v) => v.suffix !== '')
      .map((v) => this.buildVariantKey(key, v.suffix));

    await Promise.all(
      [key, ...variantKeys].map((k) =>
        this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: k })),
      ),
    );

    return ({
      message: 'Imagen eliminada'
    })
  }

  private buildKey(dto: RequestUploadUrlDto, uploadId: string, ext: string): string {
    const { path } = UPLOAD_CONFIG[dto.resource];

    switch (dto.resource) {
      case UploadResourceEnum.AVATAR:
        // avatars/{ownerId}/{uploadId}.ext
        return `${path}/${dto.ownerId}/${uploadId}.${ext}`;

      case UploadResourceEnum.POST_IMAGE:
        // posts/{ownerId}/{postId}/{order}_{uploadId}.ext
        return `${path}/${dto.ownerId}/${dto.postId ?? 'draft'}/${dto.order ?? 0}_${uploadId}.${ext}`;

      case UploadResourceEnum.RESTAURANT_LOGO:
      case UploadResourceEnum.RESTAURANT_COVER:
      case UploadResourceEnum.RESTAURANT_GALLERY:
        // restaurants/{logos|covers|gallery}/{restaurantId}/{uploadId}.ext
        return `${path}/${dto.restaurantId ?? dto.ownerId}/${uploadId}.${ext}`;

      default:
        return `uploads/${dto.ownerId}/${uploadId}.${ext}`;
    }

  }

  // Variantes del original siempre salen como .webp (MediaService las convierte)
  // original:  avatars/userId/uuid.jpg  (sin sufijo → se devuelve tal cual)
  // variante:  avatars/userId/uuid_sm.webp
  private buildVariantKey(baseKey: string, suffix: string): string {
    if (!suffix) return baseKey;
    const dot = baseKey.lastIndexOf('.');
    return `${baseKey.substring(0, dot)}_${suffix}.webp`;
  }
}