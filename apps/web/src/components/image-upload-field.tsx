'use client';

import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import type { UploadProps } from 'antd/es/upload/interface';
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

const { Dragger } = Upload;

interface ImageUploadFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
  className?: string;
}

/**
 * 图片选择上传（本地预览，提交时再上传到 API）
 * @author Cursor AI
 */
export function ImageUploadField({ value, onChange, hint, className }: ImageUploadFieldProps) {
  const previewUrl = useMemo(() => {
    if (!value) return null;
    return URL.createObjectURL(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickFile: UploadProps['beforeUpload'] = file => {
    onChange(file);
    return false;
  };

  const handleChange: UploadProps['onChange'] = ({ file }) => {
    if (file.status === 'removed') {
      onChange(null);
      return;
    }
    const native = file.originFileObj ?? (file as unknown as File);
    if (native instanceof File) onChange(native);
  };

  const handleRemove = () => onChange(null);

  if (value && previewUrl) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/50', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={value.name} className="max-h-72 w-full object-contain" />
        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2 text-sm">
          <span className="truncate text-zinc-400">{value.name}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 text-zinc-400 transition-colors hover:text-red-400"
          >
            移除
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dragger
      accept="image/*"
      maxCount={1}
      showUploadList={false}
      beforeUpload={pickFile}
      onChange={handleChange}
      className={cn(
        '!rounded-xl !border-zinc-600 !bg-transparent hover:!border-violet-500/60',
        '[&_.ant-upload-drag]:!border-dashed [&_.ant-upload-drag]:!bg-transparent',
        className,
      )}
    >
      <p className="ant-upload-drag-icon !text-violet-400">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text !text-zinc-200">{hint ?? '点击或拖拽上传图片'}</p>
      <p className="ant-upload-hint !text-zinc-500">支持 JPG、PNG 等常见格式</p>
    </Dragger>
  );
}
