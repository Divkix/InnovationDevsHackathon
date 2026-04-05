import { motion } from 'framer-motion';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

export interface SwissCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'accent';
  pattern?: 'none' | 'grid' | 'dots' | 'diagonal';
  hoverable?: boolean;
  children: ReactNode;
}

export function SwissCard({
  variant = 'default',
  pattern = 'none',
  hoverable = false,
  children,
  className = '',
  ...props
}: SwissCardProps): ReactElement {
  const baseClasses = `
    border-2 border-swiss p-8
    transition-colors duration-200 ease-out
  `;

  const variantClasses = {
    default: 'bg-swiss text-swiss-fg',
    muted: 'bg-swiss-muted text-swiss-fg',
    accent: 'bg-swiss-accent text-swiss-bg',
  };

  const patternClasses = {
    none: '',
    grid: 'swiss-grid-pattern',
    dots: 'swiss-dots',
    diagonal: 'swiss-diagonal',
  };

  const hoverClasses = hoverable
    ? 'hover:bg-swiss-fg hover:text-swiss-bg cursor-pointer'
    : '';

  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.02 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${patternClasses[pattern]}
        ${hoverClasses}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
