import { ReactNode } from 'react';
import { AssistantHeader } from '@/components/assistant/assistant-header';

export default function AssistantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AssistantHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
