import { Notification, NotificationSchema, PushToken, PushTokenSchema } from './entities/entities';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { NatsModule } from 'src/common/transports/nats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: PushToken.name, schema: PushTokenSchema },
    ]),
    NatsModule
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule { }
