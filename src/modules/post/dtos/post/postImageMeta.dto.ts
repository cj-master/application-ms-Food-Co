import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// ─── Imagen individual del carrusel ───────────────────────────────────────────
export class PostImageMetaDto {
  @IsInt()
  @Min(0)
  @Max(4)
  order: number;                  // posición en el carrusel (0-4)

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  blurHash?: string;              // generado en el cliente antes del upload
}