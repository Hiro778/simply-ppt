import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'violet' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const baseClasses =
    'inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors';

  const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    violet: 'bg-violet-950/60 text-violet-300 border-violet-800/60 shadow-sm shadow-violet-900/20',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    danger: 'bg-red-950/60 text-red-300 border-red-800/60',
    outline: 'bg-transparent text-zinc-400 border-zinc-700',
  };

  return (
    <span className={twMerge(clsx(baseClasses, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}
