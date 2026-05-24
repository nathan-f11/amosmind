import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { Job } from 'bullmq';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ModelProviderService } from '../model/model-provider.service';
import { StorageService } from '../storage/storage.service';
import { TasksService } from '../tasks/tasks.service';
import { GENERATION_QUEUE } from './generation.constants';

interface GenerationJobData {
  taskId: string;
}

@Processor(GENERATION_QUEUE)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);
  private s3!: S3Client;
  private bucket!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly model: ModelProviderService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    super();
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    this.bucket = this.config.get<string>('S3_BUCKET', 'amos-assets');
    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
    });
  }

  async process(job: Job<GenerationJobData>): Promise<void> {
    const { taskId } = job.data;
    const started = Date.now();
    this.logger.log({ taskId, event: 'start' });

    const task = await this.prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.pending) {
      this.logger.warn({ taskId, event: 'skip', status: task?.status });
      return;
    }

    try {
      await this.tasks.markRunning(taskId);
      const params = (task.params as Record<string, string>) ?? {};

      if (task.type === TaskType.text2img) {
        await this.processText2Img(taskId, task.prompt ?? '', params);
      } else if (task.type === TaskType.img2prompt) {
        await this.processImg2Prompt(taskId, params.inputImageKey!);
      } else if (task.type === TaskType.resize) {
        await this.processResize(taskId, params.inputImageKey!, params.aspectRatio ?? '1:1');
      }

      this.logger.log({ taskId, event: 'done', ms: Date.now() - started });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.error({ taskId, event: 'failed', message });
      await this.tasks.markFailed(taskId, message);
      throw err;
    }
  }

  private async processText2Img(taskId: string, prompt: string, params: Record<string, string>) {
    const result = await this.model.generateText2Image({
      prompt,
      style: params.style,
      aspectRatio: params.aspectRatio,
    });
    const uploaded = await this.storage.uploadBuffer(result.buffer, result.mimeType);
    await this.prisma.asset.create({
      data: {
        taskId,
        objectKey: uploaded.key,
        url: uploaded.url,
        mimeType: result.mimeType,
      },
    });
    await this.tasks.markSucceeded(taskId, { resultUrl: uploaded.url });
  }

  private async processImg2Prompt(taskId: string, inputKey: string) {
    const buffer = await this.downloadObject(inputKey);
    const text = await this.model.describeImage(buffer);
    await this.tasks.markSucceeded(taskId, { resultText: text });
  }

  private async processResize(taskId: string, inputKey: string, aspectRatio: string) {
    const buffer = await this.downloadObject(inputKey);
    const result = await this.model.resizeImage(buffer, aspectRatio);
    const uploaded = await this.storage.uploadBuffer(result.buffer, result.mimeType);
    await this.prisma.asset.create({
      data: {
        taskId,
        objectKey: uploaded.key,
        url: uploaded.url,
        mimeType: result.mimeType,
      },
    });
    await this.tasks.markSucceeded(taskId, { resultUrl: uploaded.url });
  }

  private async downloadObject(key: string): Promise<Buffer> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body;
    if (!stream) throw new Error('Empty S3 object');
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
