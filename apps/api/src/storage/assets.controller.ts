import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

/**
 * 通过 API 代理读取 MinIO/S3 对象，供浏览器展示（避免桶未公开读时 403）。
 * @author Cursor AI
 */
@Controller('assets')
export class AssetsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':prefix/:filename')
  async getObject(
    @Param('prefix') prefix: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${prefix}/${filename}`;
    const served = await this.storage.pipeObject(key, res);
    if (!served) {
      throw new NotFoundException('Asset not found');
    }
  }
}
