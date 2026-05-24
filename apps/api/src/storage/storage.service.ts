import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: S3Client;
  private bucket!: string;
  private publicUrl!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    this.bucket = this.config.get<string>('S3_BUCKET', 'amos-assets');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', `${endpoint}/${this.bucket}`);

    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
    });

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket: ${this.bucket}`);
    }

    if (this.config.get<string>('S3_PUBLIC_READ', 'true') !== 'false') {
      await this.ensurePublicReadPolicy();
    }
  }

  /**
   * 允许匿名读取桶内对象（本地 MinIO 开发用；生产建议 CDN/OSS 公开读或走 /assets 代理）。
   * @author Cursor AI
   */
  private async ensurePublicReadPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Bucket public read policy applied: ${this.bucket}`);
    } catch (err) {
      this.logger.warn(
        `Could not set bucket policy (use GET /assets/... proxy): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * 浏览器可访问的资源 URL（优先走 API 代理，避免 MinIO 私有桶 403）。
   * @author Cursor AI
   */
  private buildAssetPublicUrl(key: string): string {
    const assetBase =
      this.config.get<string>('ASSET_PUBLIC_BASE_URL') ??
      `http://localhost:${this.config.get('PORT', 3001)}`;
    return `${assetBase.replace(/\/$/, '')}/assets/${key}`;
  }

  /**
   * 将对象流式写入 HTTP 响应。
   * @author Cursor AI
   * @returns 是否找到并成功开始传输
   */
  async pipeObject(key: string, res: Response): Promise<boolean> {
    try {
      const obj = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!obj.Body) return false;
      res.setHeader('Content-Type', obj.ContentType ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const stream = obj.Body as NodeJS.ReadableStream;
      stream.pipe(res);
      return true;
    } catch {
      return false;
    }
  }

  async uploadBuffer(buffer: Buffer, mimeType: string, prefix = 'outputs'): Promise<{ key: string; url: string }> {
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'bin';
    const key = `${prefix}/${uuidv4()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    const url = this.buildAssetPublicUrl(key);
    return { key, url };
  }

  getPublicUrl(key: string): string {
    return this.buildAssetPublicUrl(key);
  }
}
