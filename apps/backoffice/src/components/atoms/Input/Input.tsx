import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /**
   * Etiqueta visible encima del input.
   */
  label?: string;
  /**
   * Texto de ayuda o mensaje de error debajo del campo.
   */
  helperText?: string;
  /**
   * Indica si el campo tiene un error de validación.
   */
  isError?: boolean;
  /**
   * Elemento opcional dentro del input a la izquierda (ej. Icono o '$').
   */
  prefix?: React.ReactNode;
  /**
   * Elemento opcional dentro del input a la derecha (ej. 'COP' o botón).
   */
  suffix?: React.ReactNode;
}

/**
 * Componente atómico Input con diseño darkmode refinado y enfoque eléctrico sutil.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      isError = false,
      prefix,
      suffix,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-slate-300 tracking-wide select-none"
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative flex items-center w-full rounded-lg bg-surface-card border border-surface-border text-slate-100 transition-all duration-150',
            'focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/50',
            isError && 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/40',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-base'
          )}
        >
          {prefix && (
            <div className="pl-3 pr-1 text-slate-400 select-none text-sm">
              {prefix}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed',
              prefix && 'pl-1',
              suffix && 'pr-1',
              className
            )}
            {...props}
          />

          {suffix && (
            <div className="pr-3 pl-1 text-slate-400 select-none text-xs font-semibold">
              {suffix}
            </div>
          )}
        </div>

        {helperText && (
          <span
            className={cn(
              'text-xs',
              isError ? 'text-rose-400 font-medium' : 'text-slate-500'
            )}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
