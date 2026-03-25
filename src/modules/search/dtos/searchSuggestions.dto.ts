// ─── Sugerencias / autocompletado ─────────────────────────────────────────────
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchSuggestionsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query: string;              // mínimo 1 char para sugerencias
}