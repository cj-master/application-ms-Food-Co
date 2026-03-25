import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number
}