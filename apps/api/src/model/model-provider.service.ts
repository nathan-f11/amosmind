import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import sharp from 'sharp';

export interface Text2ImgParams {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

export interface Text2ImgResult {
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class ModelProviderService {
  private readonly logger = new Logger(ModelProviderService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  private get provider(): string {
    return this.config.get<string>('MODEL_PROVIDER', 'mock');
  }

  async generateText2Image(params: Text2ImgParams): Promise<Text2ImgResult> {
    switch (this.provider) {
      case 'siliconflow':
        return this.siliconflowText2Img(params);
      case 'dashscope':
        return this.dashscopeText2Img(params);
      default:
        return this.mockText2Img(params);
    }
  }

  async describeImage(buffer: Buffer): Promise<string> {
    switch (this.provider) {
      case 'siliconflow':
        return this.siliconflowDescribe(buffer);
      case 'dashscope':
        return this.dashscopeDescribe(buffer);
      default:
        return this.mockDescribe(buffer);
    }
  }

  async resizeImage(buffer: Buffer, aspectRatio: string): Promise<Text2ImgResult> {
    const [w, h] = aspectRatio.split(':').map(Number);
    const targetW = 1024;
    const targetH = Math.round((targetW * h) / w);
    const resized = await sharp(buffer)
      .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    return { buffer: resized, mimeType: 'image/png' };
  }

  private async mockText2Img(params: Text2ImgParams): Promise<Text2ImgResult> {
    const delay = Number(this.config.get('MOCK_DELAY_MS', 3000));
    await new Promise(r => setTimeout(r, delay));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6366f1"/><stop offset="100%" style="stop-color:#ec4899"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="45%" fill="white" font-size="20" text-anchor="middle" font-family="sans-serif">AmosMind Mock</text>
      <text x="50%" y="55%" fill="white" font-size="14" text-anchor="middle" font-family="sans-serif">${this.escapeXml(params.prompt.slice(0, 40))}</text>
    </svg>`;
    const buffer = Buffer.from(svg);
    const png = await sharp(buffer).png().toBuffer();
    return { buffer: png, mimeType: 'image/png' };
  }

  private async mockDescribe(buffer: Buffer): Promise<string> {
    const delay = Number(this.config.get('MOCK_DELAY_MS', 2000));
    await new Promise(r => setTimeout(r, delay));
    const meta = await sharp(buffer).metadata();
    return `mock prompt: ${meta.width}x${meta.height} image, cinematic lighting, highly detailed, 8k`;
  }

  private async siliconflowText2Img(params: Text2ImgParams): Promise<Text2ImgResult> {
    const apiKey = this.config.get<string>('MODEL_API_KEY');
    const baseUrl = this.config.get<string>('MODEL_API_URL', 'https://api.siliconflow.cn/v1');
    const model = this.config.get<string>('MODEL_TEXT2IMG', 'Qwen/Qwen-Image');
    if (!apiKey) {
      this.logger.warn('MODEL_API_KEY missing, fallback to mock');
      return this.mockText2Img(params);
    }
    const size = this.aspectToSize(params.aspectRatio ?? '1:1');
    let data: { images?: { url: string }[] };
    try {
      const res = await firstValueFrom(
        this.http.post<{ images?: { url: string }[] }>(
          `${baseUrl}/images/generations`,
          {
            model,
            prompt: this.buildPrompt(params),
            image_size: size,
            num_inference_steps: 4,
          },
          { headers: { Authorization: `Bearer ${apiKey}` } },
        ),
      );
      data = res.data;
    } catch (err: unknown) {
      const body = (err as { response?: { data?: { message?: string; code?: number } } })?.response?.data;
      const detail = body?.message ?? (err instanceof Error ? err.message : 'unknown');
      throw new Error(`SiliconFlow images (${model}): ${detail}`);
    }
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('SiliconFlow: no image in response');
    }
    const imgRes = await firstValueFrom(this.http.get<ArrayBuffer>(imageUrl, { responseType: 'arraybuffer' }));
    return { buffer: Buffer.from(imgRes.data), mimeType: 'image/png' };
  }

  private async siliconflowDescribe(buffer: Buffer): Promise<string> {
    const apiKey = this.config.get<string>('MODEL_API_KEY');
    const baseUrl = this.config.get<string>('MODEL_API_URL', 'https://api.siliconflow.cn/v1');
    const model = this.config.get<string>('MODEL_VISION', 'Qwen/Qwen3-VL-8B-Instruct');
    if (!apiKey) return this.mockDescribe(buffer);

    const { buffer: visionBuffer, mimeType } = await this.prepareVisionImage(buffer);
    const b64 = visionBuffer.toString('base64');

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ choices?: { message?: { content?: string } }[] }>(
          `${baseUrl}/chat/completions`,
          {
            model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Describe this image as an English AI image generation prompt, concise.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${b64}` },
                  },
                ],
              },
            ],
            max_tokens: 300,
          },
          { headers: { Authorization: `Bearer ${apiKey}` } },
        ),
      );
      return data.choices?.[0]?.message?.content?.trim() ?? 'unable to describe image';
    } catch (err: unknown) {
      const body = (err as { response?: { data?: { message?: string; code?: number } } })?.response?.data;
      const detail = body?.message ?? (err instanceof Error ? err.message : 'unknown');
      this.logger.error({ event: 'siliconflowDescribeFailed', model, detail, code: body?.code });
      throw new Error(`SiliconFlow vision (${model}): ${detail}`);
    }
  }

  /** 压缩并统一格式，避免 base64 过大或 MIME 与内容不符导致 400 */
  private async prepareVisionImage(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    const prepared = await sharp(buffer)
      .rotate()
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buffer: prepared, mimeType: 'image/jpeg' };
  }

  private async dashscopeText2Img(params: Text2ImgParams): Promise<Text2ImgResult> {
    const apiKey = this.config.get<string>('MODEL_API_KEY');
    if (!apiKey) return this.mockText2Img(params);
    const { data } = await firstValueFrom(
      this.http.post<{ output?: { results?: { url: string }[] } }>(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        {
          model: 'wanx-v1',
          input: { prompt: this.buildPrompt(params) },
          parameters: { size: this.aspectToDashscopeSize(params.aspectRatio ?? '1:1'), n: 1 },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
          },
        },
      ),
    );
    const url = data.output?.results?.[0]?.url;
    if (!url) throw new Error('DashScope: no image url');
    const imgRes = await firstValueFrom(this.http.get<ArrayBuffer>(url, { responseType: 'arraybuffer' }));
    return { buffer: Buffer.from(imgRes.data), mimeType: 'image/png' };
  }

  private async dashscopeDescribe(buffer: Buffer): Promise<string> {
    return this.mockDescribe(buffer);
  }

  private buildPrompt(params: Text2ImgParams): string {
    const style = params.style === 'realistic' ? 'photorealistic, photography' : 'creative, artistic';
    return `${params.prompt}, ${style}`;
  }

  private aspectToSize(ratio: string): string {
    const map: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1280x720',
      '9:16': '720x1280',
      '4:3': '1024x768',
    };
    return map[ratio] ?? '1024x1024';
  }

  private aspectToDashscopeSize(ratio: string): string {
    const map: Record<string, string> = {
      '1:1': '1024*1024',
      '16:9': '1280*720',
      '9:16': '720*1280',
    };
    return map[ratio] ?? '1024*1024';
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
