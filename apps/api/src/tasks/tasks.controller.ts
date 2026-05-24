import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';
import { TaskType } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async createWithUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let inputImageKey: string | undefined;
    if (file) {
      const uploaded = await this.storage.uploadBuffer(
        file.buffer,
        file.mimetype || 'image/png',
        'inputs',
      );
      inputImageKey = uploaded.key;
    }
    if ((dto.type === TaskType.img2prompt || dto.type === TaskType.resize) && !inputImageKey) {
      throw new BadRequestException('此任务类型需要上传图片');
    }
    return this.tasksService.create(user.id, dto, inputImageKey);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.tasksService.findAll(user.id, projectId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.findOne(user.id, id);
  }
}
