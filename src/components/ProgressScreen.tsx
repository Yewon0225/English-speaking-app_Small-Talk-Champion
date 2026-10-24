import React, { useState } from 'react';
import { Star, Zap, ArrowRight, Award, X } from 'lucide-react';
import { UserProgress, PhrasalVerbItem } from '../types';
import { TotoAvatar } from './TotoAvatar';

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
  const [activeModal, setActiveModal] = useState<'stars' | 'xp' | null>(null);

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

        {/* 2 Metric Cards: Stars & Total XP (Streak removed) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Stars Card */}
          <button
            type="button"
            onClick={() => setActiveModal('stars')}
            className="bg-white hover:bg-amber-50/60 rounded-2xl p-3 border border-amber-100 hover:border-amber-300 shadow-2xs transition-all active:scale-95 text-center cursor-pointer group"
          >
            <div className="text-lg font-black text-amber-600 flex items-center justify-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>{completedCount * 3}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 uppercase mt-1">Stars</div>
            <div className="text-[10px] text-amber-600/80 font-medium mt-0.5">탭하여 설명 보기 ⓘ</div>
          </button>

          {/* Total XP Card */}
          <button
            type="button"
            onClick={() => setActiveModal('xp')}
            className="bg-white hover:bg-sky-50/60 rounded-2xl p-3 border border-amber-100 hover:border-sky-300 shadow-2xs transition-all active:scale-95 text-center cursor-pointer group"
          >
            <div className="text-lg font-black text-sky-600 flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4 fill-sky-500 text-sky-500 group-hover:scale-110 transition-transform" />
              <span>{progress.xp}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 uppercase mt-1">Total XP</div>
            <div className="text-[10px] text-sky-600/80 font-medium mt-0.5">탭하여 설명 보기 ⓘ</div>
          </button>
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

      {/* Metric Explanation Modal Popup */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-amber-200/80 text-center space-y-3.5 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {activeModal === 'stars' ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Stars (별 획득)</h4>
                  <p className="text-[11px] font-bold text-amber-600 mt-0.5">스피킹 미션 완료 보상</p>
                </div>
                <div className="bg-amber-50/60 rounded-xl p-3 text-left space-y-1.5 border border-amber-100 text-xs text-slate-700 leading-relaxed">
                  <p>
                    • <strong>Step 1(핵심 구동사)</strong>, <strong>Step 2(예문 연습)</strong>, <strong>Step 3(롤플레이)</strong> 각 단계를 통과할 때마다 별이 지급됩니다.
                  </p>
                  <p>
                    • 한 구동사당 <strong>최대 3개의 별</strong>을 모을 수 있습니다! ⭐
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center shadow-xs">
                  <Zap className="w-6 h-6 fill-sky-500 text-sky-500" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Total XP (학습 경험치)</h4>
                  <p className="text-[11px] font-bold text-sky-600 mt-0.5">누적 말하기 학습 포인트</p>
                </div>
                <div className="bg-sky-50/60 rounded-xl p-3 text-left space-y-1.5 border border-sky-100 text-xs text-slate-700 leading-relaxed">
                  <p>
                    • 마이크로 발화하고 문장 연습을 성공할 때마다 <strong>학습 경험치(XP)</strong>가 쌓입니다.
                  </p>
                  <p>
                    • 꾸준히 연습하여 <strong>Small Talk Champion</strong> 레벨을 높여보세요! ⚡
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
