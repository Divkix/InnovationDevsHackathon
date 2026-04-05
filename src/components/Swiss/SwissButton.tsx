import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export interface SwissButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'default' | 'large';
  children: ReactNode;
}

export function SwissButton({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  disabled,
  ...props
}: SwissButtonProps): ReactElement {
  const baseClasses = `
    font-bold uppercase tracking-widest
    border-2 transition-colors duration-200 ease-out
    flex items-center justify-center gap-2
    swiss-touch-target
  `;

  const sizeClasses = size === 'large'
    ? 'px-8 py-4 text-base'
    : 'px-6 py-3 text-sm';

  const variantClasses = {
    primary: `
      bg-swiss-fg text-swiss-bg border-swiss-fg
      hover:bg-swiss-accent hover:text-swiss-bg hover:border-swiss-accent
    `,
    secondary: `
      bg-swiss-bg text-swiss-fg border-swiss-fg
      hover:bg-swiss-fg hover:text-swiss-bg
    `,
    accent: `
      bg-swiss-accent text-swiss-bg border-swiss-accent
      hover:bg-swiss-fg hover:border-swiss-fg
    `,
  };

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`
        ${baseClasses}
        ${sizeClasses}
        ${variantClasses[variant]}
        ${disabledClasses}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
