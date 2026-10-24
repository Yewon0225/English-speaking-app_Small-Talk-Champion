import React, { useState } from 'react';
import { Bookmark, Volume2, Trash2, BookOpen, Sparkles, Eye, EyeOff } from 'lucide-react';
import { SavedSentence, PhrasalVerbItem } from '../types';
import { speakText } from '../utils/speech';

interface ReviewScreenProps {
  savedSentences: SavedSentence[];
  phrasalVerbs: PhrasalVerbItem[];
  onRemoveSaved: (english: string) => void;
  onPracticeVerb: (verbId: number) => void;
  soundEnabled: boolean;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  savedSentences,
  phrasalVerbs,
  onRemoveSaved,
  onPracticeVerb,
  soundEnabled,
}) => {
  const [selectedVerbFilter, setSelectedVerbFilter] = useState<string>('all');
  const [showKorean, setShowKorean] = useState<Record<string, boolean>>({});

  const toggleShowKorean = (english: string) => {
    setShowKorean((prev) => ({
      ...prev,
      [english]: !prev[english],
    }));
  };

  const handleListen = (text: string, rate: number = 0.9) => {
    if (soundEnabled) {
      speakText(text, rate);
    }
  };

  const filtered = selectedVerbFilter === 'all'
    ? savedSentences
    : savedSentences.filter((s) => s.verb.toLowerCase() === selectedVerbFilter.toLowerCase());

  return (
    <div className="space-y-4 pb-24">
      {/* Header section */}
      <div className="bg-white rounded-3xl border border-amber-200/80 p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              📚
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Review Library</h2>
              <p className="text-xs text-slate-500 font-medium">
                {savedSentences.length} {savedSentences.length === 1 ? 'sentence' : 'sentences'}
              </p>
            </div>
          </div>
        </div>

        {/* Verb filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedVerbFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              selectedVerbFilter === 'all'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({savedSentences.length})
          </button>
          {phrasalVerbs.map((v) => {
            const count = savedSentences.filter((s) => s.verbId === v.id).length;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVerbFilter(v.verb)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedVerbFilter === v.verb
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{v.verb}</span>
                {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-xl">
            📂
          </div>
          <h3 className="text-sm font-bold text-slate-800">No saved sentences yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Save sentences during practice to review them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isVisible = showKorean[item.english] !== false; // default visible

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                      {item.verb}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">
                      {item.type === 'dialogue' ? 'Role-play' : 'Example'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleListen(item.english, 0.9)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Listen"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleShowKorean(item.english)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title={isVisible ? 'Hide Korean' : 'Show Korean'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onRemoveSaved(item.english)}
                      className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {item.english}
                </p>

                {isVisible ? (
                  <p className="text-xs text-slate-500 font-medium">
                    ({item.korean})
                  </p>
                ) : (
                  <button
                    onClick={() => toggleShowKorean(item.english)}
                    className="text-xs text-amber-700 font-bold hover:underline"
                  >
                    Tap to reveal Korean meaning
                  </button>
                )}

                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => onPracticeVerb(item.verbId)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    Practice this unit →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
