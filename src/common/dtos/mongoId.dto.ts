import { IsMongoId, IsString } from 'class-validator';

export class MongoIdDto {
  @IsString()
  @IsMongoId()
  id: string
}