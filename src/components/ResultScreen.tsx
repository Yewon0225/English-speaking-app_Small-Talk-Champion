import React from 'react';
import {
  Volume2,
  Bookmark,
  BookmarkCheck,
  Home,
  RotateCcw,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { TotoAvatar } from './TotoAvatar';
import { CrownBadge } from './CrownBadge';
import { Fireworks } from './Fireworks';
import { PhrasalVerbItem, SavedSentence } from '../types';
import { speakText } from '../utils/speech';

interface ResultScreenProps {
  verbItem: PhrasalVerbItem;
  accuracyPct: number;
  xpEarned: number;
  onHome: () => void;
  onRestart: () => void;
  onNextUnit: () => void;
  onToggleSave: (sentence: Omit<SavedSentence, 'id' | 'savedAt'>) => void;
  isSaved: (english: string) => boolean;
  soundEnabled: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  verbItem,
  accuracyPct,
  xpEarned,
  onHome,
  onRestart,
  onNextUnit,
  onToggleSave,
  isSaved,
  soundEnabled,
}) => {
  const handlePlayAudio = (sentence: string) => {
    if (soundEnabled) {
      speakText(sentence, 0.9);
    }
  };

  const isDialogueSaved = isSaved(verbItem.dialogue.studentTargetSentence);
  const isExampleSaved = isSaved(verbItem.exampleSentence.english);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Celebration Card (Screen 3: UNIT COMPLETE, Crown, Great Job!, Mastered, Pronunciation & XP) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-200/80 via-amber-100/50 to-amber-50/40 border border-amber-300/70 p-6 text-center shadow-sm">
        {/* Animated Fireworks and Confetti effect */}
        <Fireworks />

        {/* Decorative background blurred circles */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber-300/30 blur-md pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-yellow-300/30 blur-md pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span>⭐</span>
            <span>UNIT COMPLETE</span>
            <span>⭐</span>
          </div>

          {/* Floating Crown in white circle */}
          <div className="w-16 h-16 mx-auto rounded-full bg-white shadow-md flex items-center justify-center border border-amber-100">
            <CrownBadge size="md" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Great Job!
          </h2>

          {/* Mastered pill */}
          <div>
            <span className="inline-block bg-white text-slate-900 font-bold text-xs px-3.5 py-1 rounded-full border border-amber-200 shadow-2xs">
              Mastered: <span className="text-amber-700">{verbItem.verb}</span>
            </span>
          </div>

          {/* Metric Pills */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Pronunciation {accuracyPct}%
            </span>
            <span className="bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-sky-600 fill-sky-500" />
              +{xpEarned} XP
            </span>
          </div>
        </div>
      </div>

      {/* Toto's Cheer Card (Screen 3: Toto's Cheer, Just now, Quote) */}
      <div className="bg-white rounded-3xl border border-amber-200/80 p-4 shadow-2xs flex items-start gap-3.5">
        <TotoAvatar size="md" badge="star" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-slate-900">Toto's Cheer</span>
            <span className="text-[11px] text-slate-400 font-medium">Just now</span>
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            “Wow, your intonation on{' '}
            <span className="bg-amber-100 text-amber-900 font-bold px-1 rounded">
              {verbItem.verb}
            </span>{' '}
            sounded completely natural! You sound like a native speaker today!” 🌟
          </p>
        </div>
      </div>

      {/* Today's Learned Sentences Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Today’s Learned Sentences</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">2 sentences</span>
        </div>

        {/* Card 1: Primary Dialogue */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
              Primary Dialogue
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayAudio(verbItem.dialogue.studentTargetSentence)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Listen"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onToggleSave({
                    verbId: verbItem.id,
                    verb: verbItem.verb,
                    type: 'dialogue',
                    english: verbItem.dialogue.studentTargetSentence,
                    korean: verbItem.dialogue.studentKorean,
                  })
                }
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Save sentence"
              >
                {isDialogueSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-900 leading-snug">
            {verbItem.dialogue.studentTargetSentence}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            ({verbItem.dialogue.studentKorean})
          </p>

          <div className="pt-1">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✓ Flawless Delivery
            </span>
          </div>
        </div>

        {/* Card 2: Practice Example */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
              Practice Example
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayAudio(verbItem.exampleSentence.english)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Listen"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onToggleSave({
                    verbId: verbItem.id,
                    verb: verbItem.verb,
                    type: 'example',
                    english: verbItem.exampleSentence.english,
                    korean: verbItem.exampleSentence.korean,
                  })
                }
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Save sentence"
              >
                {isExampleSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-900 leading-snug">
            {verbItem.exampleSentence.english}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            ({verbItem.exampleSentence.korean})
          </p>
        </div>
      </div>

      {/* Bottom Action Buttons (Screen 3: [🏠 Home], [💞 Restart], [▶️ Next Unit]) */}
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        <button
          onClick={onHome}
          className="col-span-1 py-3 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4 text-slate-600" />
          <span>Home</span>
        </button>

        <button
          onClick={onRestart}
          className="col-span-1 py-3 px-3 rounded-2xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-700" />
          <span>Restart</span>
        </button>

        <button
          onClick={onNextUnit}
          className="col-span-1 py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
