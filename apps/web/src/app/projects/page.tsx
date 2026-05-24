'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listProjects,
  listTasks,
  resolveAssetUrl,
  type GenerationTask,
  type ProjectItem,
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([listProjects(), listTasks()]);
        setProjects(p);
        setTasks(t.filter(x => x.status === 'succeeded' && x.resultUrl));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">我的项目</h1>
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          去创作
        </Link>
      </div>

      {loading ? (
        <p className="text-zinc-500">加载中…</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-medium text-zinc-400">项目</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p._count.tasks} 个任务</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-medium text-zinc-400">最近生成</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {tasks.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    'overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30',
                  )}
                >
                  {t.resultUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={resolveAssetUrl(t.resultUrl)}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <p className="truncate px-2 py-2 text-xs text-zinc-500">{t.prompt ?? t.type}</p>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="col-span-full text-zinc-500">暂无作品，去首页生成一张吧</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
