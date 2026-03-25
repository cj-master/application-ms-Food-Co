import { Comments, CommentsSchema, Like, LikeSchema, Post, PostSchema } from './entities/entities';
import { PostsController, SocialController } from './controllers/controllers';
import { PostsService, SocialService } from './services/services';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Comments.name, schema: CommentsSchema },
    ]),
  ],
  controllers: [
    PostsController,
    SocialController
  ],
  providers: [
    PostsService,
    SocialService
  ],
  exports: []
})
export class PostModule { }
