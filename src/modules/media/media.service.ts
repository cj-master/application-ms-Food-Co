import { UPLOAD_CONFIG, UploadResourceEnum } from '../upload/enum/upload_config.enum';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { envs, NATS_SERVICE } from 'src/config';
import { MEDIA_EVENTS } from './const/const';
import { Readable } from 'stream';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  // Reintentos en caso de fallo
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

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

  // ── Entrada principal ──────────────────────────────────────────────────────
  public async processMedia(payload: { key: string; resource: string; entityId: string }): Promise<void> {
    const { key, resource, entityId } = payload;

    this.logger.log(`Processing media: ${resource} | ${key}`);

    await this.withRetry(() => this.process(key, resource as UploadResourceEnum, entityId));
  }

  // ── Proceso principal ──────────────────────────────────────────────────────
  private async process(
    key: string,
    resource: UploadResourceEnum,
    entityId: string,
  ): Promise<void> {
    const config = UPLOAD_CONFIG[resource];

    // 1 — Descargar el original de R2
    //     Puede ser cualquier formato: jpg, png, gif, avif, heic…
    const originalBuffer = await this.downloadFromR2(key);

    // 2 — Generar todas las variantes en paralelo
    //     Sharp detecta el formato del buffer automáticamente,
    //     sin importar la extensión del key.
    //     Todas las variantes se convierten y suben como webp.
    const variants = config.variants.filter(v => v.suffix !== '');

    await Promise.all(
      variants.map(async (variant) => {
        // Procesar con sharp
        const processed = await sharp(originalBuffer)
          .resize(variant.width, variant.height, { fit: 'cover' })
          .webp({ quality: 90 })
          .toBuffer();

        // Construir la key de la variante
        // ej: avatars/userId/uuid.webp → avatars/userId/uuid_sm.webp
        const variantKey = this.buildVariantKey(key, variant.suffix);

        // Subir a R2
        await this.uploadToR2(variantKey, processed);
      }),
    );

    // 3 — Notificar al servicio dueño que las variantes están listas
    this.client.emit(MEDIA_EVENTS.PROCESSED(resource), {
      key,      // key del original — el servicio ya la tiene, confirma que es la misma
      entityId, // para saber a qué entidad asociar
    });

    this.logger.log(`Media processed successfully: ${resource} | ${key}`);
  }

  // ── Descargar de R2 ────────────────────────────────────────────────────────
  private async downloadFromR2(key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    // Convertir el stream a Buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // ── Subir variante a R2 ────────────────────────────────────────────────────
  private async uploadToR2(key: string, buffer: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
      }),
    );
  }

  // ── Reintentos con delay ───────────────────────────────────────────────────
  private async withRetry(fn: () => Promise<void>): Promise<void> {
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        await fn();
        return;
      } catch (error) {
        attempt++;

        if (attempt >= this.MAX_RETRIES) {
          this.logger.error(`Media processing failed after ${this.MAX_RETRIES} attempts`, error);
          throw error;
        }

        this.logger.warn(`Attempt ${attempt} failed, retrying in ${this.RETRY_DELAY_MS}ms...`);
        await this.delay(this.RETRY_DELAY_MS * attempt); // backoff incremental
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Helper ────────────────────────────────────────────────────────────────
  // Recorta la extensión original y fuerza .webp en la variante
  // "avatars/userId/uuid.png" + "sm" → "avatars/userId/uuid_sm.webp"
  // "posts/owner/draft/0_uuid.jpg" + "lg" → "posts/owner/draft/0_uuid_lg.webp"
  private buildVariantKey(baseKey: string, suffix: string): string {
    const dot = baseKey.lastIndexOf('.');
    return `${baseKey.substring(0, dot)}_${suffix}.webp`;
  }
}