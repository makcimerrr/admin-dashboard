"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  feedback?: string | null;
  compact?: boolean;
};

export default function MemberFeedbackPreview({ feedback, compact = true }: Props) {
  const [open, setOpen] = useState(false);

  if (!feedback) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Fermer aperçu' : 'Aperçu feedback'}
      >
        {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      {open && (
        <div className={`z-50 p-2 rounded-md border bg-muted/10 ${compact ? 'w-80' : 'w-96'}`}>
          <div className="prose prose-sm max-w-full text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {feedback}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
