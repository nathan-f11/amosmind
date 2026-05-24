import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ModelProviderService } from './model-provider.service';

@Module({
  imports: [HttpModule.register({ timeout: 120000 })],
  providers: [ModelProviderService],
  exports: [ModelProviderService],
})
export class ModelModule {}
