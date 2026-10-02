import React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
}

/**
 * Componente atómico Heading con jerarquía tipográfica minimalista y sobria.
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  className,
  children,
  ...props
}) => {
  const styles = {
    1: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-100',
    2: 'text-xl sm:text-2xl font-semibold tracking-tight text-slate-100',
    3: 'text-lg sm:text-xl font-semibold text-slate-200',
    4: 'text-sm sm:text-base font-medium text-slate-300',
  };

  const Tag = (`h${level}` as const);

  return (
    <Tag className={cn(styles[level], className)} {...props}>
      {children}
    </Tag>
  );
};

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'lead' | 'body' | 'small' | 'muted' | 'mono';
  as?: 'p' | 'span' | 'div';
}

/**
 * Componente atómico Text para textos consistentes y legibles en darkmode.
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  as = 'p',
  className,
  children,
  ...props
}) => {
  const styles = {
    lead: 'text-base sm:text-lg text-slate-300 leading-relaxed font-normal',
    body: 'text-sm text-slate-300 leading-normal',
    small: 'text-xs text-slate-400',
    muted: 'text-xs text-slate-500',
    mono: 'text-xs font-mono text-cyan-300 tracking-wider',
  };

  const Component = as;

  return (
    <Component className={cn(styles[variant], className)} {...props}>
      {children}
    </Component>
  );
};
