import { PromptComposer } from '@/components/prompt-composer';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-start px-4 pb-16 pt-4 md:min-h-[calc(100dvh-4rem)] md:justify-center md:pt-8">
      <PromptComposer />
    </div>
  );
}
