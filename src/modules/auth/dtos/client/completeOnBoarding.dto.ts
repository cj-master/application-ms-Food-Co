import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator'

export class CompleteOnboardingDto {
  @IsMongoId()
  userId: string

  @IsOptional()
  @IsArray()
  cuisineTypes: string[]

  @IsOptional()
  @IsString()
  city: string

  @IsString()
  avatarUrl: string

  @IsOptional()
  @IsArray()
  foodCategories?: string[];

  @IsOptional()
  @IsArray()
  diningStyle?: string[];

  @IsOptional()
  @IsArray()
  priceRange?: string[];

  @IsOptional()
  @IsArray()
  dietaryRestrictions?: string[];
}