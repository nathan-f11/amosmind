import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CreditsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
