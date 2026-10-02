import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Estilo visual del botón.
   * - `primary`: Azul turquesa / eléctrico con efecto sutil y elegante.
   * - `secondary`: Fondo oscuro elevado con borde sutil.
   * - `outline`: Borde con acento turquesa y fondo transparente.
   * - `ghost`: Sin borde ni fondo hasta hacer hover.
   * - `danger`: Tono carmesí para acciones destructivas.
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /**
   * Tamaño del botón.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Muestra un indicador de carga animado y deshabilita la interacción.
   */
  isLoading?: boolean;
  /**
   * Icono opcional a la izquierda del texto.
   */
  leftIcon?: React.ReactNode;
  /**
   * Icono opcional a la derecha del texto.
   */
  rightIcon?: React.ReactNode;
}

/**
 * Componente atómico Button altamente reutilizable para toda la interfaz.
 * Sigue el principio de responsabilidad única y consistencia en dark mode.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-r from-brand-500 to-teal-500 text-slate-950 font-semibold hover:from-brand-400 hover:to-teal-400 shadow-glow hover:shadow-glowHover hover:-translate-y-0.5',
      secondary:
        'bg-surface-elevated text-slate-200 border border-surface-border hover:bg-surface-card hover:border-brand-500/40 hover:text-white',
      outline:
        'border border-brand-500/40 text-brand-300 hover:bg-brand-500/10 hover:border-brand-400',
      ghost:
        'text-slate-400 hover:text-slate-100 hover:bg-surface-elevated',
      danger:
        'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/60',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
