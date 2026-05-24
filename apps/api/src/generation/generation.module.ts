import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModelModule } from '../model/model.module';
import { StorageModule } from '../storage/storage.module';
import { TasksModule } from '../tasks/tasks.module';
import { GENERATION_QUEUE } from './generation.constants';
import { GenerationProcessor } from './generation.processor';

@Module({
  imports: [
    ModelModule,
    StorageModule,
    forwardRef(() => TasksModule),
    BullModule.registerQueue({ name: GENERATION_QUEUE }),
  ],
  providers: [GenerationProcessor],
})
export class GenerationModule {}
