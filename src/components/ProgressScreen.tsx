import React from 'react';
import { Trophy, Flame, Star, CheckCircle2, Zap, ArrowRight, Award } from 'lucide-react';
import { UserProgress, PhrasalVerbItem } from '../types';
import { TotoAvatar } from './TotoAvatar';
import { CrownBadge } from './CrownBadge';

interface ProgressScreenProps {
  progress: UserProgress;
  phrasalVerbs: PhrasalVerbItem[];
  onStartVerb: (verb: PhrasalVerbItem) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  progress,
  phrasalVerbs,
  onStartVerb,
}) => {
  const completedCount = progress.completedVerbIds.length;
  const totalVerbs = phrasalVerbs.length;
  const progressPercent = Math.round((completedCount / totalVerbs) * 100);

  return (
    <div className="space-y-4 pb-24">
      {/* Overview Card */}
      <div className="bg-gradient-to-b from-amber-100/90 via-amber-50 to-white rounded-3xl border border-amber-200/80 p-5 shadow-2xs text-center space-y-3">
        <div className="w-16 h-16 mx-auto">
          <TotoAvatar size="xl" badge="medal" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Small Talk Champion
          </h2>
          <p className="text-xs text-amber-800 font-semibold mt-0.5">
            Level B1 • Everyday Conversational Fluency
          </p>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-white rounded-2xl p-2.5 border border-amber-100 shadow-2xs">
            <div className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{completedCount * 3}</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Stars</div>
          </div>

          <div className="bg-white rounded-2xl p-2.5 border border-amber-100 shadow-2xs">
            <div className="text-lg font-black text-rose-600 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{progress.streakDays}d</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Streak</div>
          </div>

          <div className="bg-white rounded-2xl p-2.5 border border-amber-100 shadow-2xs">
            <div className="text-lg font-black text-sky-600 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 fill-sky-500 text-sky-500" />
              <span>{progress.xp}</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Total XP</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 text-left space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Overall Roadmap Progress</span>
            <span className="text-amber-700">{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target Phrasal Verbs Checklist */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          <span>Core Phrasal Verbs (B1 Situations)</span>
        </h3>

        <div className="space-y-2">
          {phrasalVerbs.map((v) => {
            const isCompleted = progress.completedVerbIds.includes(v.id);
            const isActive = v.id === progress.activeVerbId;

            return (
              <div
                key={v.id}
                onClick={() => onStartVerb(v)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  isCompleted
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : isActive
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : isActive
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : v.id}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{v.verb}</div>
                    <div className="text-xs text-slate-500">{v.koreanMeaning}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <span className="text-amber-500 font-bold text-xs">⭐⭐⭐</span>
                  ) : isActive ? (
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-0.5">
                      Practice <ArrowRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
