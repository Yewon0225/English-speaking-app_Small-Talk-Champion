import React from 'react';
import { ShieldCheck, Compass, Volume2, Lock, Clock } from 'lucide-react';
import { TotoAvatar } from './TotoAvatar';
import { CrownBadge } from './CrownBadge';
import { PhrasalVerbItem, UserProgress } from '../types';
import { speakText } from '../utils/speech';

interface LearnScreenProps {
  phrasalVerbs: PhrasalVerbItem[];
  progress: UserProgress;
  onSelectVerb: (verb: PhrasalVerbItem) => void;
  onStartPractice: () => void;
  onGoToReview: () => void;
  soundEnabled: boolean;
}

export const LearnScreen: React.FC<LearnScreenProps> = ({
  phrasalVerbs,
  progress,
  onSelectVerb,
  onStartPractice,
  onGoToReview,
  soundEnabled,
}) => {
  const currentStage = progress.completedVerbIds.length + 1;
  const activeVerb = phrasalVerbs.find((v) => v.id === progress.activeVerbId) || phrasalVerbs[0];

  const handlePronounce = (e: React.MouseEvent, verb: string) => {
    e.stopPropagation();
    if (soundEnabled) {
      speakText(verb, 0.9);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Privacy Notice Banner (Required by PRD) */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
        <div className="p-1.5 rounded-full bg-emerald-100/90 text-emerald-700 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 stroke-[2.3]" />
        </div>
        <p className="text-xs text-slate-700 leading-relaxed font-normal">
          Your voice is processed to turn it into text and is{' '}
          <strong className="font-semibold text-slate-900">not recorded or saved</strong>.
        </p>
      </div>

      {/* Companion Toto Card */}
      <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/50 border border-amber-200/70 rounded-3xl p-4 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <TotoAvatar size="lg" badge="medal" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-sm">Companion Toto</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                5 MIN GOAL
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-snug">
              “Ready for today’s 5-minute phrasal verb challenge? Let’s champion everyday talk!” 🌟
            </p>
          </div>
        </div>
      </div>

      {/* Pathway Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-600 stroke-[2.3]" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Today’s Pathway</h2>
        </div>
        <span className="bg-amber-100/80 text-amber-900 font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200/60 shadow-2xs">
          ⭐ Stage {Math.min(currentStage, 5)} of 5
        </span>
      </div>

      {/* Pathway Roadmap List with S-Curve Road Visual */}
      <div className="relative space-y-3.5">
        {/* Subtle curved dashed connecting line behind cards */}
        <div className="absolute left-8 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-amber-300/60 -z-10" />

        {phrasalVerbs.map((item, index) => {
          const isCompleted = progress.completedVerbIds.includes(item.id);
          const isActive = item.id === progress.activeVerbId;
          const isNext = item.id === progress.activeVerbId + 1 || (progress.completedVerbIds.length === index && !isActive);
          const isUnlocked = isCompleted || isActive || isNext;

          if (isActive) {
            // Stage 1 / Active Card - highlighted in rich amber with orange border and inner details
            return (
              <div
                key={item.id}
                onClick={() => onSelectVerb(item)}
                className="bg-white rounded-2xl border-2 border-amber-400 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500 rounded-l-2xl" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CrownBadge size="md" withPlayBadge />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                          {item.verb}
                        </span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {item.koreanMeaning}
                      </p>
                    </div>
                  </div>

                  {/* Speaker Pronounce Button */}
                  <button
                    onClick={(e) => handlePronounce(e, item.verb)}
                    className="w-9 h-9 rounded-full bg-amber-100/70 hover:bg-amber-200/80 text-amber-800 flex items-center justify-center transition-colors"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-card with context & Start button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVerb(item);
                  }}
                  className="bg-amber-50/70 hover:bg-amber-100/80 rounded-xl p-3 flex items-center justify-between mt-3.5 border border-amber-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{item.contextTag}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVerb(item);
                    }}
                    className="text-xs font-bold text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                  >
                    Start Now →
                  </button>
                </div>
              </div>
            );
          }

          if (isCompleted) {
            // Completed card
            return (
              <div
                key={item.id}
                onClick={() => onSelectVerb(item)}
                className="bg-white/90 rounded-2xl border border-emerald-200 p-3.5 flex items-center justify-between shadow-2xs hover:bg-emerald-50/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{item.verb}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Mastered
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{item.koreanMeaning}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <span>⭐⭐⭐</span>
                </div>
              </div>
            );
          }

          if (isNext) {
            // Next card (Stage 2)
            return (
              <div
                key={item.id}
                onClick={() => onSelectVerb(item)}
                className="bg-white/95 rounded-2xl border border-slate-200/90 p-3.5 flex items-center justify-between shadow-2xs hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100 shadow-2xs">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-800">{item.verb}</span>
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Next
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{item.koreanMeaning}</p>
                  </div>
                </div>
                <div className="p-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            );
          }

          // Stage 3 / Queue / Locked
          const isQueue = index === 2;
          return (
            <div
              key={item.id}
              onClick={() => {
                // allow exploration
                onSelectVerb(item);
              }}
              className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-3.5 flex items-center justify-between opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 font-semibold flex items-center justify-center text-sm border border-slate-200">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-700">{item.verb}</span>
                    {isQueue && (
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded">
                        Queue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.koreanMeaning}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                {isQueue ? <Clock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {!isQueue && <span className="text-[11px]">Locked</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
