'use client';

import React from 'react';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}) {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080C14] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 focus:ring-cyan-500 border border-cyan-500/30',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-200 focus:ring-slate-600 border border-slate-700',
    outline:
      'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-slate-700 focus:ring-slate-600',
    danger:
      'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 focus:ring-red-500 border border-red-500/30',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 focus:ring-emerald-500 border border-emerald-500/30',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5 font-semibold',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </button>
  );
}
