'use client';

import { useCallback, useState } from 'react';
import { Select } from 'antd';
import { useAuth } from '@/context/auth-context';
import { ImageUploadField } from '@/components/image-upload-field';
import {
  createTask,
  createTaskWithUpload,
  getTask,
  resolveAssetUrl,
  type GenerationTask,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { TaskProgress } from './task-progress';

export type TabId = 'text2img' | 'img2prompt' | 'resize';

const TABS: { id: TabId; label: string; placeholder: string }[] = [
  {
    id: 'text2img',
    label: '文生图',
    placeholder: '输入简单的词语，生成精美的图片',
  },
  {
    id: 'img2prompt',
    label: '反推提示词',
    placeholder: '上传图片，反推可用于生成的提示词',
  },
  {
    id: 'resize',
    label: '图片改比例',
    placeholder: '上传图片并选择目标比例',
  },
];

const STYLES = [
  { value: 'free', label: '自由创作' },
  { value: 'realistic', label: '写实摄影' },
];

const RATIOS = ['1:1', '16:9', '9:16', '4:3'];

export function PromptComposer() {
  const { refresh, ensureAuth, loading: authLoading, authError, user } = useAuth();
  const [tab, setTab] = useState<TabId>('text2img');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('free');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [file, setFile] = useState<File | null>(null);
  const [activeTask, setActiveTask] = useState<GenerationTask | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentTab = TABS.find(t => t.id === tab)!;

  const switchTab = (next: TabId) => {
    setTab(next);
    setActiveTask(null);
    setFile(null);
  };

  const pollTask = useCallback(
    async (taskId: string) => {
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const task = await getTask(taskId);
        setActiveTask(task);
        if (task.status === 'succeeded' || task.status === 'failed') {
          await refresh();
          return;
        }
      }
    },
    [refresh],
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setActiveTask(null);
    try {
      await ensureAuth();
      let task: GenerationTask;
      if (tab === 'text2img') {
        if (!prompt.trim()) return;
        task = await createTask({
          type: 'text2img',
          prompt: prompt.trim(),
          style,
          aspectRatio,
        });
      } else {
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', tab);
        fd.append('aspectRatio', aspectRatio);
        if (prompt) fd.append('prompt', prompt);
        fd.append('style', style);
        task = await createTaskWithUpload(fd);
      }
      setActiveTask(task);
      await pollTask(task.id);
    } catch (e) {
      setActiveTask({
        id: 'error',
        type: tab,
        status: 'failed',
        error: e instanceof Error ? e.message : '提交失败',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex flex-col items-center text-center md:mb-8">
        <h1 className="text-balance text-2xl font-medium text-white md:text-4xl">
          : ) 你的设计提效伙伴
        </h1>
      </div>

      <div className="mb-6 flex gap-4 overflow-x-auto border-b border-zinc-800 text-sm [-ms-overflow-style:none] [scrollbar-width:none] md:mb-3 md:gap-6 [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              'shrink-0 whitespace-nowrap pb-3 transition-colors',
              tab === t.id
                ? 'border-b-2 border-white text-white'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-4 shadow-xl backdrop-blur">
        {(tab === 'img2prompt' || tab === 'resize') && (
          <div className="mb-3">
            <ImageUploadField
              value={file}
              onChange={setFile}
              hint="点击上传图片"
              className="[&_.ant-upload]:!bg-transparent"
            />
            {!file && (
              <p className="mt-2 text-sm text-zinc-500">{currentTab.placeholder}</p>
            )}
          </div>
        )}

        {tab === 'text2img' && (
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={currentTab.placeholder}
            rows={4}
            className="w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
          <div className="flex flex-wrap gap-2">
            {tab === 'text2img' && (
              <Select
                value={style}
                onChange={setStyle}
                size="small"
                options={STYLES.map(s => ({ value: s.value, label: s.label }))}
                className="min-w-[7.5rem]"
                popupMatchSelectWidth={false}
              />
            )}
            <Select
              value={aspectRatio}
              onChange={setAspectRatio}
              size="small"
              options={RATIOS.map(r => ({ value: r, label: r }))}
              className="min-w-[5rem]"
              popupMatchSelectWidth={false}
            />
          </div>
          <button
            type="button"
            disabled={submitting || authLoading || !user}
            onClick={handleSubmit}
            className="flex size-10 items-center justify-center rounded-full bg-white text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
            aria-label="提交"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>

      {activeTask && <TaskProgress status={activeTask.status} error={activeTask.error} />}

      {activeTask?.status === 'succeeded' && activeTask.resultUrl && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveAssetUrl(activeTask.resultUrl)}
            alt="生成结果"
            className="w-full object-contain"
          />
        </div>
      )}

      {activeTask?.status === 'succeeded' && activeTask.resultText && (
        <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 text-sm text-zinc-200">
          {activeTask.resultText}
        </div>
      )}

      {authError && !authLoading && (
        <p className="mt-4 text-sm text-amber-400">{authError}</p>
      )}

      {activeTask?.status === 'failed' && (
        <p className="mt-4 text-sm text-red-400">{activeTask.error}</p>
      )}
    </div>
  );
}
