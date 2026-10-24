import React from 'react';

interface CrownBadgeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withPlayBadge?: boolean;
}

export const CrownBadge: React.FC<CrownBadgeProps> = ({
  size = 'md',
  className = '',
  withPlayBadge = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-md flex items-center justify-center text-white p-1">
        <svg viewBox="0 0 40 40" className="w-3/4 h-3/4 drop-shadow-sm fill-current">
          <path d="M7 27 L9 13 L15 20 L20 10 L25 20 L31 13 L33 27 Z" />
          <rect x="7" y="27" width="26" height="4" rx="2" />
          <circle cx="9" cy="13" r="1.5" className="fill-amber-100" />
          <circle cx="20" cy="10" r="1.8" className="fill-white" />
          <circle cx="31" cy="13" r="1.5" className="fill-amber-100" />
        </svg>
      </div>
      {withPlayBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] border-2 border-white shadow-xs">
          ▶
        </span>
      )}
    </div>
  );
};
