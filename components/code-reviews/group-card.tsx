"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface GroupCardProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function GroupCard({ href, children, className = '' }: GroupCardProps) {
  const router = useRouter();

  function shouldIgnoreEvent(target: EventTarget | null) {
    try {
      const el = target as HTMLElement | null;
      if (!el) return false;
      // If the click originated inside an element marked with data-prevent-card, ignore it
      return !!el.closest('[data-prevent-card]');
    } catch (err) {
      return false;
    }
  }

  function onClick(e: React.MouseEvent) {
    if (shouldIgnoreEvent(e.target)) return;
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (shouldIgnoreEvent(e.target)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(href);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}
