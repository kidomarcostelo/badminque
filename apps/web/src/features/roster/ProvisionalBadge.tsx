import React from 'react';

export interface ProvisionalBadgeProps {
  className?: string;
}

export function ProvisionalBadge({ className = '' }: ProvisionalBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}
      aria-label="Provisional Rating Status (< 8 matches)"
    >
      Provisional
    </span>
  );
}
