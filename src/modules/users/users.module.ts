import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserProfileController } from './user-profile.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController, UserProfileController],
  exports: [UsersService],
})
export class UsersModule {}
