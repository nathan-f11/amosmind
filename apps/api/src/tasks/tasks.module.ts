import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CreditsModule } from '../credits/credits.module';
import { StorageModule } from '../storage/storage.module';
import { GENERATION_QUEUE } from '../generation/generation.constants';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    CreditsModule,
    StorageModule,
    BullModule.registerQueue({ name: GENERATION_QUEUE }),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
