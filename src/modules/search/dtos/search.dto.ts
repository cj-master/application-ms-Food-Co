// ─── Query principal ──────────────────────────────────────────────────────────
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { SearchTargetEnum } from './searchTarget.enum';

export class SearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query: string;

  @IsOptional()
  @IsEnum(SearchTargetEnum)
  target?: SearchTargetEnum;    // si no viene, busca en todo

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;              // solo aplica cuando target es específico
}