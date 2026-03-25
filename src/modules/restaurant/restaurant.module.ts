import { RestaurantsAdminController, RestaurantsController } from './controllers/controllers';
import { RestaurantsAdminService, RestaurantsService } from './services/services';
import { Restaurant, RestaurantSchema } from './entities/entities';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [
    RestaurantsAdminController,
    RestaurantsController
  ],
  providers: [
    RestaurantsService,
    RestaurantsAdminService
  ],
})
export class RestaurantModule { }
