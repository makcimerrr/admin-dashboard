"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface GroupCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function GroupCard({children, className = '', ...rest }: GroupCardProps) {

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
