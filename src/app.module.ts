import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { envs } from './config';
import { PostModule } from './modules/post/post.module';
import { UploadModule } from './modules/upload/upload.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { FeedModule } from './modules/feed/feed.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { NatsModule } from './common/transports/nats.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    MongooseModule.forRoot(envs.DATABASE_URL),
    RedisModule.forRoot({
      type: 'single',
      url: envs.REDIS_URL,
    }),
    AuthModule,
    PostModule,
    UploadModule,
    RestaurantModule,
    FeedModule,
    SearchModule,
    NotificationModule,
    MediaModule
  ]
})
export class AppModule { }
