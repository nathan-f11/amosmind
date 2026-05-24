import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { canTransitionTaskStatus } from '../common/task-status';
import { CreditsService } from '../credits/credits.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GENERATION_QUEUE } from '../generation/generation.constants';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    @InjectQueue(GENERATION_QUEUE) private readonly queue: Queue,
  ) {}

  async create(userId: string, dto: CreateTaskDto, inputImageKey?: string) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.generationTask.findFirst({
        where: { userId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const task = await this.prisma.$transaction(async tx => {
      const created = await tx.generationTask.create({
        data: {
          userId,
          type: dto.type,
          status: TaskStatus.pending,
          prompt: dto.prompt,
          projectId: dto.projectId,
          idempotencyKey: dto.idempotencyKey,
          params: {
            style: dto.style ?? 'free',
            aspectRatio: dto.aspectRatio ?? '1:1',
            inputImageKey,
          },
        },
      });
      await this.credits.chargeForTask(tx, userId, created.id);
      return created;
    });

    await this.queue.add(
      'generate',
      { taskId: task.id },
      { jobId: task.id, removeOnComplete: 100, removeOnFail: 50 },
    );

    return task;
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.generationTask.findFirst({
      where: { id, userId },
      include: { assets: true },
    });
    if (!task) throw new NotFoundException('任务不存在');
    return task;
  }

  async findAll(userId: string, projectId?: string) {
    return this.prisma.generationTask.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async transitionStatus(taskId: string, from: TaskStatus, to: TaskStatus) {
    if (!canTransitionTaskStatus(from, to)) {
      throw new ConflictException(`非法状态迁移: ${from} -> ${to}`);
    }
    return this.prisma.generationTask.update({
      where: { id: taskId, status: from },
      data: { status: to },
    });
  }

  async markRunning(taskId: string) {
    return this.transitionStatus(taskId, TaskStatus.pending, TaskStatus.running);
  }

  async markSucceeded(taskId: string, result: { resultUrl?: string; resultText?: string }) {
    await this.transitionStatus(taskId, TaskStatus.running, TaskStatus.succeeded);
    return this.prisma.generationTask.update({
      where: { id: taskId },
      data: result,
    });
  }

  async markFailed(taskId: string, error: string) {
    const task = await this.prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task) return;
    if (task.status === TaskStatus.running) {
      await this.transitionStatus(taskId, TaskStatus.running, TaskStatus.failed);
    } else if (task.status === TaskStatus.pending) {
      await this.transitionStatus(taskId, TaskStatus.pending, TaskStatus.failed);
    }
    return this.prisma.generationTask.update({
      where: { id: taskId },
      data: { error },
    });
  }
}
