import type { ReactElement } from 'react';

export interface SwissSectionLabelProps {
  number: string; // "01", "02", etc.
  label: string;  // "SYSTEM", "METHOD", etc.
  className?: string;
}

export function SwissSectionLabel({ 
  number, 
  label, 
  className = '' 
}: SwissSectionLabelProps): ReactElement {
  return (
    <div className={`flex items-center gap-2 mb-8 ${className}`}>
      <span className="text-swiss-accent font-black text-xl">{number}.</span>
      <span className="uppercase tracking-widest text-swiss font-bold text-lg">
        {label}
      </span>
    </div>
  );
}
