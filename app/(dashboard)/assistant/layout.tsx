import { ReactNode } from 'react';
import { AssistantHeader } from '@/components/assistant/assistant-header';

export default function AssistantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <AssistantHeader />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
