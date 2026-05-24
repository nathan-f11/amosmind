import { PromptComposer } from '@/components/prompt-composer';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 pb-16 pt-8">
      <PromptComposer />
    </div>
  );
}
