import React from 'react';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { TotoAvatar } from './TotoAvatar';
import { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  screenTitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAvatarClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  screenTitle,
  onBack,
  showBack = false,
  soundEnabled,
  onToggleSound,
  onAvatarClick,
}) => {
  const getSubLabel = () => {
    switch (currentTab) {
      case 'learn':
        return 'Learn';
      case 'practice':
        return 'Practice';
      case 'review':
        return 'Review';
      case 'progress':
        return 'Progress';
      default:
        return 'Learn';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-100/70 px-4 py-3 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2.5">
        {showBack ? (
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        ) : null}

        {/* Brand App Icon Badge */}
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex flex-col items-center justify-center text-[8px] font-bold text-amber-800 shadow-2xs leading-none shrink-0">
          <span className="text-[11px] leading-tight">👑</span>
          <span className="text-[7px] scale-90 font-semibold tracking-tighter">STC</span>
        </div>

        {/* Title lockup */}
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              {screenTitle || 'Small Talk Champion'}
            </h1>
            {!screenTitle && <span className="text-xs">👑</span>}
          </div>
          <div className="text-xs font-bold text-amber-600 leading-tight">
            {screenTitle ? 'Unit Complete' : getSubLabel()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Sound toggle pill */}
        <button
          onClick={onToggleSound}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/80'
          }`}
          title={soundEnabled ? 'Sound is on' : 'Sound is muted'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              soundEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 stroke-[2.2]" />
          )}
        </button>

        {/* Toto Avatar Header button */}
        <button
          onClick={onAvatarClick}
          className="rounded-full ring-2 ring-transparent hover:ring-amber-300 transition-all cursor-pointer"
          aria-label="Toto Profile"
        >
          <TotoAvatar size="sm" />
        </button>
      </div>
    </header>
  );
};
