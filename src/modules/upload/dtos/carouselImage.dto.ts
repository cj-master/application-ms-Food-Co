// ─── Item del carrusel para solicitud múltiple ────────────────────────────────
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AllowedMimeType } from 'src/common';

export class CarouselImageDto {
  @IsInt()
  @Min(0)
  @Max(4)
  order: number;

  @IsString()
  mimeType: AllowedMimeType;   // 👈 esto faltaba

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;                   // dimensiones originales desde el dispositivo

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  blurHash?: string;                // generado en el cliente antes del upload
}