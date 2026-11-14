import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98] cursor-pointer';

  const variants = {
    primary:
      'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 border border-violet-500/30',
    secondary:
      'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50',
    outline:
      'border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:bg-zinc-800/50',
    ghost:
      'hover:bg-zinc-800/60 text-zinc-300 hover:text-white',
    danger:
      'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30',
    glass:
      'glass-panel hover:bg-zinc-800/80 text-zinc-100 hover:border-violet-500/40 shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
    icon: 'p-2',
  };

  return (
    <button
      className={twMerge(clsx(baseClasses, variants[variant], sizes[size], className))}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
