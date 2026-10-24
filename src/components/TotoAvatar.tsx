import React from 'react';

interface TotoAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badge?: 'none' | 'star' | 'medal';
  iconBadge?: string;
  className?: string;
  isSpeaking?: boolean;
}

export const TotoAvatar: React.FC<TotoAvatarProps> = ({
  size = 'md',
  badge = 'none',
  iconBadge,
  className = '',
  isSpeaking = false,
}) => {
  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`relative inline-block shrink-0 ${sizeMap[size]} ${className}`}>
      <div
        className={`w-full h-full rounded-full p-[2px] bg-gradient-to-tr from-amber-300 via-yellow-100 to-amber-400 shadow-sm transition-transform duration-300 ${
          isSpeaking ? 'scale-105 ring-3 ring-amber-400/60 ring-offset-1 animate-pulse' : ''
        }`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-amber-100/90 via-amber-50 to-orange-100/60 flex items-center justify-center relative">
          {/* Detailed SVG Illustration of Toto Bear with Crown & Bandana */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <defs>
              <linearGradient id="bearFur" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C88242" />
                <stop offset="50%" stopColor="#AF6E33" />
                <stop offset="100%" stopColor="#8E5221" />
              </linearGradient>
              <linearGradient id="snoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F7DFBC" />
                <stop offset="100%" stopColor="#E9C99A" />
              </linearGradient>
              <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE066" />
                <stop offset="50%" stopColor="#FFC700" />
                <stop offset="100%" stopColor="#E5A100" />
              </linearGradient>
              <linearGradient id="bandanaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A90E2" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>

            {/* Background glow circle */}
            <circle cx="50" cy="50" r="48" fill="#FFF8EE" opacity="0.4" />

            {/* Left Ear */}
            <circle cx="28" cy="34" r="13" fill="url(#bearFur)" />
            <circle cx="28" cy="34" r="7" fill="#F4BA8D" />

            {/* Right Ear */}
            <circle cx="72" cy="34" r="13" fill="url(#bearFur)" />
            <circle cx="72" cy="34" r="7" fill="#F4BA8D" />

            {/* Bear Head */}
            <ellipse cx="50" cy="55" rx="30" ry="27" fill="url(#bearFur)" />

            {/* Cheeks blush */}
            <circle cx="34" cy="61" r="5" fill="#FF8A7A" opacity="0.35" />
            <circle cx="66" cy="61" r="5" fill="#FF8A7A" opacity="0.35" />

            {/* Eyes */}
            <ellipse cx="38" cy="50" rx="3.5" ry="4.5" fill="#24140D" />
            <circle cx="39.2" cy="48.5" r="1.3" fill="#FFFFFF" />

            <ellipse cx="62" cy="50" rx="3.5" ry="4.5" fill="#24140D" />
            <circle cx="63.2" cy="48.5" r="1.3" fill="#FFFFFF" />

            {/* Snout */}
            <ellipse cx="50" cy="62" rx="13" ry="10" fill="url(#snoutGrad)" />

            {/* Nose */}
            <path
              d="M46 58 Q50 56 54 58 Q52 62 50 62 Q48 62 46 58 Z"
              fill="#3D2114"
            />
            {/* Mouth */}
            <path
              d="M50 62 L50 65 M46 65 Q50 68 54 65"
              stroke="#3D2114"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Blue Bandana / Scarf */}
            <path
              d="M33 74 Q50 82 67 74 L50 96 Z"
              fill="url(#bandanaGrad)"
            />
            {/* Bandana pattern details */}
            <circle cx="50" cy="81" r="1.5" fill="#FFFFFF" opacity="0.85" />
            <circle cx="44" cy="78" r="1.2" fill="#FFFFFF" opacity="0.75" />
            <circle cx="56" cy="78" r="1.2" fill="#FFFFFF" opacity="0.75" />
            <circle cx="50" cy="88" r="1.2" fill="#FFFFFF" opacity="0.75" />

            {/* Royal Golden Crown */}
            <path
              d="M38 27 L39 15 L45 22 L50 12 L55 22 L61 15 L62 27 Z"
              fill="url(#crownGrad)"
              stroke="#B47D00"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Crown base rim */}
            <rect
              x="38"
              y="26"
              width="24"
              height="3.5"
              rx="1.5"
              fill="url(#crownGrad)"
              stroke="#B47D00"
              strokeWidth="0.7"
            />
            {/* Crown Jewels */}
            <circle cx="50" cy="18" r="1.4" fill="#EF4444" />
            <circle cx="42" cy="22" r="1.1" fill="#3B82F6" />
            <circle cx="58" cy="22" r="1.1" fill="#10B981" />
          </svg>
        </div>
      </div>

      {/* Optional Badge */}
      {iconBadge && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-sm border border-white">
          {iconBadge}
        </span>
      )}
      {!iconBadge && badge === 'star' && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-sm border border-white font-bold">
          ★
        </span>
      )}
      {!iconBadge && badge === 'medal' && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-sm border-2 border-white">
          🏅
        </span>
      )}
    </div>
  );
};
