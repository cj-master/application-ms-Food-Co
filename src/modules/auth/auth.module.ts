import {
  Admin,
  AdminSchema,
  AdminSession,
  AdminSessionSchema,
  Follow,
  FollowSchema,
  Saved,
  SavedSchema,
  User,
  UserSchema,
  UserSession,
  UserSessionSchema
} from './entities/entities';
import {
  AuthAdminService,
  AuthService,
  CustomerAdminService,
  PreferencesService,
  UsersService
} from './services/services';
import {
  AuthAdminController,
  AuthController,
  CustomerAdminController,
  PreferencesController,
  UsersController
} from './controller/controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { envs } from 'src/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Saved.name, schema: SavedSchema },

      { name: Admin.name, schema: AdminSchema },
      { name: AdminSession.name, schema: AdminSessionSchema },
    ]),

    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: envs.JWT_ACCESS_EXPIRES_IN as any,
      },
    }),
  ],
  controllers: [
    AuthController,
    AuthAdminController,
    UsersController,
    PreferencesController,
    CustomerAdminController
  ],
  providers: [
    AuthService,
    AuthAdminService,
    UsersService,
    PreferencesService,

    CustomerAdminService
  ],

  exports: [
    
  ]
})
export class AuthModule { }
