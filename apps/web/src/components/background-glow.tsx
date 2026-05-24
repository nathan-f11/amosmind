export function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-1/3 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute right-1/4 top-1/2 h-[320px] w-[480px] rounded-full bg-fuchsia-600/15 blur-[100px]" />
      <div className="absolute bottom-1/4 left-1/4 h-[280px] w-[400px] rounded-full bg-indigo-500/10 blur-[90px]" />
    </div>
  );
}
