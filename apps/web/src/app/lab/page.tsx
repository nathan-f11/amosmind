const planned = [
  '批量文生图与模板市场',
  '风格 LoRA 预设',
  'SSE 实时进度推送',
  '失败自动退积分',
  '内容安全审核钩子',
];

export default function LabPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">实验室</h1>
      <p className="mt-2 text-zinc-400">实验性功能预览，尚未开放。</p>
      <ul className="mt-8 space-y-3">
        {planned.map(item => (
          <li
            key={item}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300"
          >
            <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">计划中</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
